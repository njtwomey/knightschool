/**
 * Writes the app's content files (apps/web/public/content/*.json) into a folder: `pnpm content:build` into a staging
 * folder that then replaces public/content, and `scripts/content.test.ts` into a temporary one, to check every file with
 * the schemas the app reads them with.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AnalysisFile,
  PopularityFile,
  type OpeningIndexEntry,
  restrictAnalysis,
  applyNames,
  buildSearchIndex,
  courseIndexEntry,
  applyPopularity,
  parseOpeningsTsv,
  treeGraph,
  type OpeningContent,
} from '../packages/core/src/index.ts';
import {
  consistencyWarnings,
  loadCourses,
  loadCurriculum,
  loadGlossary,
  loadOpeningGroups,
  loadTree,
  chapterTexts,
  rel,
  root,
} from './content-lib.ts';

export const cacheDir = join(root, '.cache');

export type OpeningNames = ReturnType<typeof parseOpeningsTsv>;

/**
 * The Lichess opening names (lichess-org/chess-openings, CC0), downloaded once into .cache/. With `offline` only the
 * cached copy is read: undefined when there is none.
 */
export async function openingNames({ offline = false } = {}): Promise<OpeningNames | undefined> {
  const file = join(cacheDir, 'openings.tsv');
  if (!existsSync(file)) {
    if (offline) return undefined;
    try {
      const parts = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map(async (letter) => {
          const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${letter}.tsv`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${url}: ${response.status}`);
          const [header, ...rows] = (await response.text()).trim().split('\n');
          return { header: header!, rows };
        }),
      );
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(file, [parts[0]!.header, ...parts.flatMap((part) => part.rows)].join('\n'));
    } catch (error) {
      console.warn(`  names: skipped (${error instanceof Error ? error.message : error})`);
      return undefined;
    }
  }
  return parseOpeningsTsv(readFileSync(file, 'utf8'));
}

/** content/popularity/popularity.json (committed; filled by `pnpm popularity`), or undefined before the first run. */
export function loadPopularity(): PopularityFile | undefined {
  const file = join(root, 'content', 'popularity', 'popularity.json');
  if (!existsSync(file)) return undefined;
  const parsed = PopularityFile.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) throw new Error(`${rel(file)}: ${parsed.error.message}`);
  return parsed.data;
}

/** Writes every content file into `outDir`. Returns how many courses it wrote. `quiet` drops the progress lines. */
export function emitContent(
  outDir: string,
  names: OpeningNames | undefined,
  popularity: PopularityFile | undefined,
  { quiet = false } = {},
): number {
  const log = quiet ? () => {} : console.log;
  const index: OpeningIndexEntry[] = [];
  const built: OpeningContent[] = [];

  const courses = loadCourses();
  const curriculum = loadCurriculum(courses);
  const order = new Map(curriculum.map((entry, i) => [entry.id, i]));
  const listedBy = new Map<string, string[]>();
  for (const content of courses)
    for (const variant of content.opening.variants)
      listedBy.set(variant.id, [...(listedBy.get(variant.id) ?? []), content.opening.id]);
  const graph = treeGraph(loadTree(), (line) => listedBy.get(line) ?? []);
  const branches = new Map(
    graph.chapters.flatMap((chapter) =>
      chapter.parent && chapter.after ? [[chapter.id, { parent: chapter.parent, after: chapter.after }] as const] : [],
    ),
  );
  for (let content of courses) {
    if (names) content = applyNames(content, names);
    if (popularity) content = applyPopularity(content, (epd) => popularity.positions[epd]);
    const { opening } = content;
    built.push(content);
    writeFileSync(join(outDir, `${opening.id}.json`), JSON.stringify(content));
    index.push(
      courseIndexEntry(content, {
        order: order.get(opening.id) ?? 0,
        alsoIn: (line) => listedBy.get(line) ?? [],
        branch: (line) => branches.get(line),
      }),
    );
    log(`  ${opening.id}: ${Object.keys(content.nodes).length} positions, ${opening.variants.length} variants`);
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
  writeFileSync(join(outDir, 'tree.json'), JSON.stringify(graph));
  // The chapters as written, so the app can merge chapters authored in it with the tree exactly as this build does.
  writeFileSync(join(outDir, 'chapters.json'), JSON.stringify(chapterTexts()));
  writeFileSync(join(outDir, 'search.json'), JSON.stringify(buildSearchIndex(built)));
  // Native-Stockfish analysis from `pnpm analyse`, trimmed to the positions some course reaches.
  const analysisFile = join(root, 'content', 'analysis', 'analysis.json');
  if (existsSync(analysisFile)) {
    const parsed = AnalysisFile.safeParse(JSON.parse(readFileSync(analysisFile, 'utf8')));
    if (!parsed.success) throw new Error(`${rel(analysisFile)}: ${parsed.error.message}`);
    const shipped = restrictAnalysis(
      parsed.data,
      built.flatMap((content) => Object.keys(content.nodes)),
    );
    writeFileSync(join(outDir, 'analysis.json'), JSON.stringify(shipped));
    log(
      `  analysis: ${Object.keys(shipped.positions).length} of ${Object.keys(parsed.data.positions).length} positions`,
    );
  } else log('  analysis: none (run pnpm analyse)');
  const groups = loadOpeningGroups(built);
  writeFileSync(join(outDir, 'openings.json'), JSON.stringify(groups));
  writeFileSync(join(outDir, 'curriculum.json'), JSON.stringify(curriculum));
  const glossary = loadGlossary(built);
  writeFileSync(join(outDir, 'glossary.json'), JSON.stringify(glossary));
  log(`  ${groups.length} openings, ${glossary.length} glossary entries`);
  if (!quiet) {
    const warnings = consistencyWarnings(built);
    for (const warning of warnings.slice(0, 20)) console.warn(`  warning: ${warning}`);
    if (warnings.length > 20)
      console.warn(`  warning: and ${warnings.length - 20} more disagreements between the two sides`);
  }
  return index.length;
}
