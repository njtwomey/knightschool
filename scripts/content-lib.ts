import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import {
  FamilyMeta,
  OpeningManifest,
  QuizEntry,
  buildFamilies,
  buildOpening,
  parsePgn,
  type Family,
  type OpeningContent,
  type VariantSource,
} from '../packages/core/src/index.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const contentDir = join(root, 'content', 'openings');
/** Named positions and ideas (the Traxler, the Fried Liver) that belong to no opening: same format as a course. */
export const motifsDir = join(root, 'content', 'motifs');
export const rel = (path: string) => relative(root, path);

function readVariants(openingDir: string, kind: 'lines' | 'refutations'): VariantSource[] {
  const dir = join(openingDir, kind);
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

/** Reads and validates every course under content/openings and content/motifs. Throws on the first problem, naming the file. */
export function loadOpenings(): OpeningContent[] {
  const result: OpeningContent[] = [];
  const roots = [
    { base: contentDir, motif: false },
    { base: motifsDir, motif: true },
  ];
  for (const { base, motif, id } of roots.flatMap((entry) =>
    existsSync(entry.base)
      ? readdirSync(entry.base)
          .sort()
          .map((id) => ({ ...entry, id }))
      : [],
  )) {
    const dir = join(base, id);
    const manifestPath = join(dir, 'opening.yaml');
    if (!existsSync(manifestPath)) continue;
    const manifest = OpeningManifest.safeParse(parseYaml(readFileSync(manifestPath, 'utf8')));
    if (!manifest.success) {
      throw new Error(
        `${rel(manifestPath)}: ${manifest.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
    const variants = [...readVariants(dir, 'lines'), ...readVariants(dir, 'refutations')];
    const quizPath = join(dir, 'quizzes.yaml');
    let quizzes: QuizEntry[] = [];
    if (existsSync(quizPath)) {
      const parsed = z.array(QuizEntry).safeParse(parseYaml(readFileSync(quizPath, 'utf8')));
      if (!parsed.success) {
        throw new Error(
          `${rel(quizPath)}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        );
      }
      quizzes = parsed.data;
    }
    if (result.some((existing) => existing.opening.id === id)) {
      throw new Error(`${rel(dir)}: the id "${id}" is used twice (content/openings and content/motifs share ids)`);
    }
    result.push(buildOpening(id, motif ? { ...manifest.data, motif: true } : manifest.data, variants, quizzes));
  }
  return result;
}

/** Groups the loaded courses under their openings, from content/families.yaml (optional) and the courses' own fields. */
export function loadFamilies(contents: OpeningContent[]): Family[] {
  const path = join(root, 'content', 'families.yaml');
  let metas: FamilyMeta[] = [];
  if (existsSync(path)) {
    const parsed = z.array(FamilyMeta).safeParse(parseYaml(readFileSync(path, 'utf8')));
    if (!parsed.success) {
      throw new Error(
        `${rel(path)}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }
    metas = parsed.data;
  }
  return buildFamilies(metas, contents);
}
