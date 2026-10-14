import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { z } from 'zod';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  CurriculumEntry,
  MotifEntry,
  OpeningManifest,
  OpeningMeta,
  QuizEntry,
  buildOpening,
  buildOpeningGroups,
  parsePgn,
  sideToMove,
  type GlossaryEntry,
  type OpeningContent,
  type OpeningGroup,
  type VariantSource,
} from '../packages/core/src/index.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** Everything authored: white/ and black/ hold the courses, plus openings.yaml, curriculum.yaml and motifs.yaml. */
export const contentDir = join(root, 'content');
export const rel = (path: string) => relative(root, path);

function readVariants(courseDir: string, kind: 'lines' | 'traps'): VariantSource[] {
  const dir = join(courseDir, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.pgn'))
    .sort()
    .map((file) => {
      const path = join(dir, file);
      return {
        id: file.slice(0, -'.pgn'.length),
        kind: kind === 'lines' ? ('line' as const) : ('refutation' as const),
        game: parsePgn(readFileSync(path, 'utf8'), rel(path)),
        source: rel(path),
      };
    });
}

/** The lines and traps that a course takes from another course's folder (`from:` in course.yaml). */
function readReused(manifest: OpeningManifest): VariantSource[] {
  const homes = new Map(courseDirs().map(({ dir, side }) => [basename(dir), { dir, side }]));
  return manifest.lines.flatMap((entry) => {
    if (!entry.from) return [];
    const home = homes.get(entry.from);
    if (!home) throw new Error(`${manifest.name}: "${entry.file}" is from "${entry.from}", which is not a course`);
    if (home.side !== manifest.side)
      throw new Error(
        `${manifest.name}: "${entry.file}" is from "${entry.from}", a course for ${home.side}; only lines for the same side can be reused`,
      );
    const path = join(home.dir, 'lines', `${entry.file}.pgn`);
    if (!existsSync(path)) throw new Error(`${manifest.name}: ${rel(path)} does not exist (from: ${entry.from})`);
    return [
      {
        id: entry.file,
        kind: 'line' as const,
        game: parsePgn(readFileSync(path, 'utf8'), rel(path)),
        source: rel(path),
        reused: true,
      },
    ];
  });
}

function readYaml<T>(path: string, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(parseYaml(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(`${rel(path)}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}

/** Every directory under white/ and black/ that holds a course.yaml, at any depth. Folders starting with _ are skipped. */
export function courseDirs(): { dir: string; side: 'white' | 'black' }[] {
  const found: { dir: string; side: 'white' | 'black' }[] = [];
  const walk = (dir: string, side: 'white' | 'black') => {
    if (existsSync(join(dir, 'course.yaml'))) found.push({ dir, side });
    for (const name of readdirSync(dir).sort()) {
      const child = join(dir, name);
      if (name.startsWith('_') || name.startsWith('.') || !statSync(child).isDirectory()) continue;
      if (basename(dir) === 'lines' || basename(dir) === 'traps') continue;
      walk(child, side);
    }
  };
  for (const side of ['white', 'black'] as const) {
    const dir = join(contentDir, side);
    if (existsSync(dir)) walk(dir, side);
  }
  return found;
}

/** Reads and validates one course folder. Pass `side` to require that the course's `side` matches its folder. */
export function loadCourseAt(dir: string, side?: 'white' | 'black'): OpeningContent {
  const id = basename(dir);
  const manifestPath = join(dir, 'course.yaml');
  const manifest = readYaml(manifestPath, OpeningManifest);
  if (side && manifest.side !== side) {
    throw new Error(`${rel(manifestPath)}: side is ${manifest.side} but the course is under content/${side}/`);
  }
  const variants = [...readVariants(dir, 'lines'), ...readVariants(dir, 'traps'), ...readReused(manifest)];
  const quizPath = join(dir, 'quizzes.yaml');
  const quizzes: QuizEntry[] = existsSync(quizPath) ? readYaml(quizPath, z.array(QuizEntry)) : [];
  return buildOpening(id, manifest, variants, quizzes);
}

/**
 * Reads and validates every course under content/white and content/black. A course's id is its folder name, and its
 * `side` must match the folder it is in. Throws on the first problem, naming the file.
 */
export function loadCourses(): OpeningContent[] {
  const result: OpeningContent[] = [];
  for (const { dir, side } of courseDirs()) {
    const content = loadCourseAt(dir, side);
    if (result.some((existing) => existing.opening.id === content.opening.id)) {
      throw new Error(`${rel(dir)}: the course id "${content.opening.id}" is used twice: folder names must be unique`);
    }
    result.push(content);
  }
  return result;
}

/** The openings that courses are grouped under, from content/openings.yaml. */
export function loadOpeningGroups(contents: OpeningContent[]): OpeningGroup[] {
  const metas = readYaml(join(contentDir, 'openings.yaml'), z.array(OpeningMeta));
  return buildOpeningGroups(
    metas,
    contents.map((content) => ({ id: content.opening.id, opening: content.opening.opening })),
  );
}

/** The study order from content/curriculum.yaml. Every course appears once, after the courses it depends on. */
export function loadCurriculum(contents: OpeningContent[]): CurriculumEntry[] {
  const path = join(contentDir, 'curriculum.yaml');
  const entries = readYaml(path, z.array(CurriculumEntry));
  const known = new Set(contents.map((content) => content.opening.id));
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!known.has(entry.id)) throw new Error(`${rel(path)}: "${entry.id}" is not a course`);
    if (seen.has(entry.id)) throw new Error(`${rel(path)}: "${entry.id}" is listed twice`);
    for (const need of entry.prerequisites) {
      if (!seen.has(need))
        throw new Error(`${rel(path)}: "${entry.id}" needs "${need}", which must be listed before it`);
    }
    seen.add(entry.id);
  }
  for (const id of known) {
    if (!seen.has(id)) throw new Error(`${rel(path)}: course "${id}" is missing from the list`);
  }
  return entries;
}

/** The motif vocabulary from content/motifs.yaml, each with the courses that use it. Courses may use only listed ids. */
export function loadGlossary(contents: OpeningContent[]): GlossaryEntry[] {
  const path = join(contentDir, 'motifs.yaml');
  const entries = readYaml(path, z.array(MotifEntry));
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error(`${rel(path)}: a motif id is listed twice`);
  for (const content of contents) {
    for (const motif of content.opening.motifs) {
      if (!ids.has(motif)) throw new Error(`${content.opening.id}: motif "${motif}" is not in ${rel(path)}`);
    }
  }
  return entries.map((entry) => ({
    ...entry,
    courses: contents.filter((content) => content.opening.motifs.includes(entry.id)).map((c) => c.opening.id),
  }));
}

/** The positions a course covers at or after its trigger: the ground its lines actually share with other courses. */
function groundOf(content: OpeningContent): Set<string> {
  const seen = new Set([content.opening.triggerEpd]);
  const queue = [content.opening.triggerEpd];
  while (queue.length) {
    for (const edge of content.nodes[queue.shift()!]?.moves ?? []) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return seen;
}

/**
 * Where two courses reach the same position (after both triggers) and disagree. Warnings, not errors: courses may
 * legitimately cover different branches.
 *   - A White course and a Black course: the course whose side is to move plays its repertoire move there, and the other
 *     course should have the opponent play that move too, or its learner has no answer to it.
 *   - Two courses for the same side: both teach a move there and they differ, so the learner is taught two answers.
 */
export function consistencyWarnings(contents: OpeningContent[]): string[] {
  const warnings: string[] = [];
  const ground = new Map(contents.map((content) => [content.opening.id, groundOf(content)]));
  for (const [i, mine] of contents.entries()) {
    for (const [j, theirs] of contents.entries()) {
      const same = mine.opening.side === theirs.opening.side;
      if (i === j || (same && j < i)) continue;
      for (const node of Object.values(mine.nodes)) {
        const ours = node.moves.find((edge) => edge.isRepertoire);
        const there = theirs.nodes[node.epd];
        if (!ours || !there || there.moves.length === 0 || sideToMove(node.epd) !== mine.opening.side) continue;
        if (!ground.get(mine.opening.id)!.has(node.epd) || !ground.get(theirs.opening.id)!.has(node.epd)) continue;
        if (same) {
          const answer = there.moves.find((edge) => edge.isRepertoire);
          if (answer && answer.uci !== ours.uci) {
            warnings.push(
              `${mine.opening.id} plays ${ours.san} at ${node.epd}, but ${theirs.opening.id} plays ${answer.san}`,
            );
          }
        } else if (
          !contents.some(
            (other) =>
              other.opening.side === theirs.opening.side &&
              ground.get(other.opening.id)!.has(node.epd) &&
              other.nodes[node.epd]?.moves.some((edge) => edge.uci === ours.uci),
          )
        ) {
          const others = there.moves.map((edge) => edge.san).join(', ');
          warnings.push(
            `${mine.opening.id} plays ${ours.san} at ${node.epd}, but ${theirs.opening.id} has the opponent play ${others}`,
          );
        }
      }
    }
  }
  return warnings;
}
