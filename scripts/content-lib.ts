import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { z } from 'zod';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  CurriculumEntry,
  MotifEntry,
  CourseManifest,
  OpeningMeta,
  QuizEntry,
  projectCourse,
  resolveTree,
  buildOpeningGroups,
  checkUnitOverrides,
  parsePgn,
  sideToMove,
  type GlossaryEntry,
  type OpeningContent,
  type OpeningGroup,
  type TheoryTree,
  type Chapter,
} from '../packages/core/src/index.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/**
 * Everything authored: tree/ holds the theory (chapters of one tree, for both sides), courses/ the courses that take
 * lines from it, plus openings.yaml, curriculum.yaml and motifs.yaml.
 */
export const contentDir = join(root, 'content');
export const treeDir = join(contentDir, 'tree');
export const coursesDir = join(contentDir, 'courses');
export const rel = (path: string) => relative(root, path);

/** Every chapter (.pgn) under a folder, at any depth. A chapter's id is its file name. */
export function readChapters(dir: string): Chapter[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.pgn'))
    .sort()
    .map((file) => {
      const path = join(dir, file);
      return { id: basename(file, '.pgn'), source: rel(path), game: parsePgn(readFileSync(path, 'utf8'), rel(path)) };
    });
}

let tree: TheoryTree | undefined;
/** The theory tree: every chapter under content/tree, read once. */
export function loadTree(): TheoryTree {
  tree ??= resolveTree(readChapters(treeDir));
  return tree;
}

function readYaml<T>(path: string, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(parseYaml(readFileSync(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(`${rel(path)}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  return parsed.data;
}

/** Every course folder: content/courses/<id>/ with a course.yaml. Folders starting with _ are skipped. */
export function courseDirs(): string[] {
  if (!existsSync(coursesDir)) return [];
  return readdirSync(coursesDir)
    .sort()
    .map((name) => join(coursesDir, name))
    .filter(
      (dir) => !basename(dir).startsWith('_') && statSync(dir).isDirectory() && existsSync(join(dir, 'course.yaml')),
    );
}

/** Reads and validates one course folder: its course.yaml and quizzes, with its lines taken from the tree. */
export function loadCourseAt(dir: string): OpeningContent {
  const id = basename(dir);
  const manifest = readYaml(join(dir, 'course.yaml'), CourseManifest);
  const quizPath = join(dir, 'quizzes.yaml');
  const quizzes: QuizEntry[] = existsSync(quizPath) ? readYaml(quizPath, z.array(QuizEntry)) : [];
  const content = projectCourse(id, manifest, loadTree(), quizzes);
  // `units:` names units of the study path, cut with the default card settings: every id must be one of them.
  try {
    checkUnitOverrides(content);
  } catch (error) {
    throw new Error(`${rel(join(dir, 'course.yaml'))}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return content;
}

/** Reads and validates every course under content/courses. A course's id is its folder name. Throws on the first problem, naming the file. */
export function loadCourses(): OpeningContent[] {
  const result: OpeningContent[] = [];
  for (const dir of courseDirs()) {
    const content = loadCourseAt(dir);
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
