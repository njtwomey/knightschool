/**
 * pnpm content:build
 *
 * Reads content/openings/<opening>/{opening.yaml,lines/*.pgn,refutations/*.pgn}, validates everything against the
 * schemas in packages/core, merges each opening's variants into one tree and writes apps/web/public/content/*.json.
 * A broken file fails the build with the file name in the message.
 *
 * Optional Lichess steps, both cached under .cache/ so reruns are offline:
 *   - opening names: downloads lichess-org/chess-openings (CC0) once.
 *   - popularity per position: needs LICHESS_TOKEN (free personal token, no scopes). Without it this step is skipped.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  EXPLORER_BAND,
  AnalysisFile,
  OpeningIndexEntry,
  restrictAnalysis,
  applyNames,
  buildSearchIndex,
  introductionOrder,
  mainLine,
  variantPath,
  applyPopularity,
  parseOpeningsTsv,
  type ExplorerPosition,
  type OpeningContent,
} from '../packages/core/src/index.ts';
import { loadFamilies, loadOpenings, rel, root } from './content-lib.ts';

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let pausedUntil = 0;

/** One request at a time, cached forever under .cache/explorer, 60 s pause after a 429. */
async function explorerLookup(epd: string, token: string): Promise<ExplorerPosition | undefined> {
  const key = Buffer.from(`${epd}|${EXPLORER_BAND.speeds}|${EXPLORER_BAND.ratings}`).toString('base64url');
  const file = join(cacheDir, 'explorer', `${key}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as ExplorerPosition;
  const query = new URLSearchParams({
    fen: `${epd} 0 1`,
    speeds: EXPLORER_BAND.speeds.join(','),
    ratings: EXPLORER_BAND.ratings.join(','),
  });
  for (;;) {
    await sleep(Math.max(0, pausedUntil - Date.now()));
    const response = await fetch(`https://explorer.lichess.org/lichess?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'knightschool content:build (github.com/njtwomey/knightschool)',
      },
    });
    if (response.status === 429) {
      pausedUntil = Date.now() + 60_000;
      console.warn('  explorer: 429, pausing 60 s');
      continue;
    }
    if (!response.ok) throw new Error(`explorer ${response.status} for ${epd}`);
    const body = (await response.json()) as ExplorerPosition;
    const position: ExplorerPosition = { white: body.white, draws: body.draws, black: body.black, moves: body.moves };
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(position));
    return position;
  }
}

async function withPopularity(content: OpeningContent, token: string): Promise<OpeningContent> {
  const known = new Map<string, ExplorerPosition>();
  for (const epd of Object.keys(content.nodes)) {
    const position = await explorerLookup(epd, token);
    if (position) known.set(epd, position);
  }
  return applyPopularity(content, (epd) => known.get(epd));
}

async function main() {
  const names = await openingNames();
  const token = process.env.LICHESS_TOKEN;
  if (!token) console.warn('  popularity: skipped (set LICHESS_TOKEN to ask the Lichess explorer)');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const index: OpeningIndexEntry[] = [];
  const built: OpeningContent[] = [];

  for (let content of loadOpenings()) {
    if (names) content = applyNames(content, names);
    if (token) content = await withPopularity(content, token);
    const { opening } = content;
    built.push(content);
    writeFileSync(join(outDir, `${opening.id}.json`), JSON.stringify(content));
    const main = mainLine(content);
    index.push(
      OpeningIndexEntry.parse({
        ...opening,
        family: opening.family ?? opening.id,
        variants: opening.variants.length,
        cards: introductionOrder(content, 0).length,
        keyEpd: main[Math.min(5, main.length - 1)]?.to ?? opening.rootEpd,
        lines: opening.variants.map(({ id, name, kind }) => {
          // A position partway along the line, for its thumbnail.
          const path = variantPath(content, id);
          return {
            id,
            name,
            kind,
            epd: path[Math.min(7, path.length - 1)]?.to ?? opening.rootEpd,
            epds: path.slice(1, 14).map((edge) => edge.to),
          };
        }),
      }),
    );
    console.log(`  ${opening.id}: ${Object.keys(content.nodes).length} positions, ${opening.variants.length} variants`);
  }
  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index));
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
  const families = loadFamilies(built);
  writeFileSync(join(outDir, 'families.json'), JSON.stringify(families));
  console.log(`  ${families.length} openings (families)`);
  console.log(`content:build wrote ${index.length} openings to ${rel(outDir)}`);
}

main().catch((error) => {
  console.error(`content:build failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
