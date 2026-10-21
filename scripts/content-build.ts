/**
 * pnpm content:build
 *
 * Reads the theory tree (content/tree) and the courses (content/courses), validates everything against the schemas
 * in packages/core, projects each course's lines into its own tree and writes apps/web/public/content/*.json, plus
 * tree.json (the whole tree, to draw). A broken file fails the build with the file name in the message.
 *
 * Optional Lichess steps, so reruns are offline:
 *   - opening names: downloads lichess-org/chess-openings (CC0) once into .cache/.
 *   - popularity per position: read from content/popularity/popularity.json (committed; filled by `pnpm popularity`).
 *     This script never asks the network for it.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AnalysisFile,
  PopularityFile,
  OpeningIndexEntry,
  restrictAnalysis,
  applyNames,
  buildSearchIndex,
  introductionOrder,
  mainLine,
  variantPath,
  applyPopularity,
  parseOpeningsTsv,
  treeGraph,
  lichessUrlForCourse,
  lichessUrlForLine,
  type OpeningContent,
} from '../packages/core/src/index.ts';
import {
  consistencyWarnings,
  loadCourses,
  loadCurriculum,
  loadGlossary,
  loadOpeningGroups,
  loadTree,
  rel,
  root,
} from './content-lib.ts';

const outDir = join(root, 'apps', 'web', 'public', 'content');
const cacheDir = join(root, '.cache');

async function openingNames() {
  const file = join(cacheDir, 'openings.tsv');
  if (!existsSync(file)) {
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

function loadPopularity(): PopularityFile | undefined {
  const file = join(root, 'content', 'popularity', 'popularity.json');
  if (!existsSync(file)) return undefined;
  const parsed = PopularityFile.safeParse(JSON.parse(readFileSync(file, 'utf8')));
  if (!parsed.success) throw new Error(`${rel(file)}: ${parsed.error.message}`);
  return parsed.data;
}

async function main() {
  const names = await openingNames();
  const popularity = loadPopularity();
  if (!popularity) console.warn('  popularity: none yet (run make popularity)');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const index: OpeningIndexEntry[] = [];
  const built: OpeningContent[] = [];

  const courses = loadCourses();
  const curriculum = loadCurriculum(courses);
  const order = new Map(curriculum.map((entry, i) => [entry.id, i]));
  const graph = treeGraph(loadTree());
  const branches = new Map(
    graph.chapters.flatMap((chapter) =>
      chapter.parent && chapter.after ? [[chapter.id, { parent: chapter.parent, after: chapter.after }] as const] : [],
    ),
  );
  const listedBy = new Map<string, string[]>();
  for (const content of courses)
    for (const variant of content.opening.variants)
      listedBy.set(variant.id, [...(listedBy.get(variant.id) ?? []), content.opening.id]);
  for (let content of courses) {
    if (names) content = applyNames(content, names);
    if (popularity) content = applyPopularity(content, (epd) => popularity.positions[epd]);
    const { opening } = content;
    built.push(content);
    writeFileSync(join(outDir, `${opening.id}.json`), JSON.stringify(content));
    const main = mainLine(content);
    index.push(
      OpeningIndexEntry.parse({
        ...opening,
        order: order.get(opening.id) ?? 0,
        variants: opening.variants.length,
        cards: introductionOrder(content, { minPopularity: 0 }).length,
        lichess: lichessUrlForCourse(content),
        keyEpd: main[Math.min(5, main.length - 1)]?.to ?? opening.rootEpd,
        lines: opening.variants.map(({ id, name, kind, opponent, weight, whose, alternative }) => {
          // A position partway along the line, for its thumbnail.
          const path = variantPath(content, id);
          return {
            id,
            name,
            kind,
            opponent,
            weight,
            whose,
            alternative,
            epd: path[Math.min(7, path.length - 1)]?.to ?? opening.rootEpd,
            epds: path.slice(1, 14).map((edge) => edge.to),
            alsoIn: (listedBy.get(id) ?? []).filter((course) => course !== opening.id),
            lichess: lichessUrlForLine(content, id),
            branch: branches.get(id),
          };
        }),
      }),
    );
    console.log(`  ${opening.id}: ${Object.keys(content.nodes).length} positions, ${opening.variants.length} variants`);
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
  writeFileSync(join(outDir, 'tree.json'), JSON.stringify(graph));
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
    console.log(
      `  analysis: ${Object.keys(shipped.positions).length} of ${Object.keys(parsed.data.positions).length} positions`,
    );
  } else console.log('  analysis: none (run pnpm analyse)');
  const groups = loadOpeningGroups(built);
  writeFileSync(join(outDir, 'openings.json'), JSON.stringify(groups));
  writeFileSync(join(outDir, 'curriculum.json'), JSON.stringify(curriculum));
  const glossary = loadGlossary(built);
  writeFileSync(join(outDir, 'glossary.json'), JSON.stringify(glossary));
  console.log(`  ${groups.length} openings, ${glossary.length} glossary entries`);
  const warnings = consistencyWarnings(built);
  for (const warning of warnings.slice(0, 20)) console.warn(`  warning: ${warning}`);
  if (warnings.length > 20)
    console.warn(`  warning: and ${warnings.length - 20} more disagreements between the two sides`);
  console.log(`content:build wrote ${index.length} courses to ${rel(outDir)}`);
}

main().catch((error) => {
  console.error(`content:build failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
