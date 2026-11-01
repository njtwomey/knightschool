/**
 * make puzzles (pnpm puzzles): the whole puzzle pipeline, to update the committed content/puzzles/<opening>.json.
 *
 * 1. Downloads the Lichess puzzle file into .cache/puzzles/ when it is missing, or with --refresh (only if Lichess
 *    has a newer one).
 * 2. Indexes it, only when the index was not built from the file as it is now (so a rerun is quick).
 * 3. Names the opening tags (seconds).
 * 4. Selects puzzles for every opening in content/openings from what the puzzle file gives: named variation, family,
 *    structure and idea. Fetching the puzzles' games (expand.ts, for the through and after levels) is parked by the
 *    user's choice; --games uses expanded games already in the index, if any.
 *
 *   pnpm puzzles [--refresh] [--games]
 */
import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, renameSync, statSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream } from 'node:stream/web';
import { parseArgs } from 'node:util';
import { loadContent } from '../content/load.ts';
import { csvPath, ensureCacheDir, indexIsCurrent, openIndex, root, seconds } from './db.ts';
import { linesFromBuilt, loadReach } from './lines.ts';
import { createMatcher } from './match.ts';
import { DEFAULT_MAX_DEVIATION, selectionPath, selectPuzzles, summary, writeSelection } from './selection.ts';

const PUZZLE_FILE_URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst';
const { values } = parseArgs({
  options: { refresh: { type: 'boolean', default: false }, games: { type: 'boolean', default: false } },
});
const started = Date.now();

/** Downloads the puzzle file; with a file already there, asks for it only if Lichess's copy is newer. */
async function download(): Promise<void> {
  const have = existsSync(csvPath);
  const headers: Record<string, string> = have ? { 'If-Modified-Since': statSync(csvPath).mtime.toUTCString() } : {};
  const response = await fetch(PUZZLE_FILE_URL, { headers });
  if (response.status === 304) {
    console.log('Puzzle file: up to date');
    return;
  }
  if (!response.ok || !response.body) throw new Error(`Downloading the puzzle file: HTTP ${response.status}`);
  const size = Number(response.headers.get('content-length') ?? 0);
  console.log(`Puzzle file: downloading ${(size / 1e6).toFixed(0)} MB`);
  const part = `${csvPath}.part`;
  await pipeline(Readable.fromWeb(response.body as ReadableStream), createWriteStream(part));
  renameSync(part, csvPath);
  // The file takes Lichess's date, so the next --refresh asks only for something newer.
  const modified = response.headers.get('last-modified');
  if (modified) utimesSync(csvPath, new Date(), new Date(modified));
  console.log(`Puzzle file: downloaded, ${seconds(started)}`);
}

/** Runs one of the puzzle scripts as its own process, stopping the pipeline if it fails. */
function step(script: string, args: string[] = []): void {
  const result = spawnSync(process.execPath, ['--import', 'tsx', join(root, 'scripts/puzzles', script), ...args], {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

ensureCacheDir();
if (!existsSync(csvPath) || values.refresh) await download();
if (indexIsCurrent()) console.log('Index: current, skipped');
else step('index.ts');
step('names.ts');

let content;
try {
  content = loadContent();
} catch (error) {
  console.error(`content: ${(error as Error).message}`);
  process.exit(1);
}
const { config } = content;
const filter = { ...config.puzzles.select, maxDeviation: DEFAULT_MAX_DEVIATION };
const reach = loadReach();
const db = openIndex({ readOnly: true });
const matcher = createMatcher(db, filter, {}, { games: values.games });
for (const opening of content.openings) {
  const input = linesFromBuilt(opening, content.ideas, reach);
  const result = selectPuzzles(input, matcher, config, filter, `content/openings/${opening.id}.yaml`);
  const path = selectionPath(opening.id);
  await writeSelection(path, result.selection);
  console.log(summary(result, path, config.puzzles.levels));
}
db.close();
console.log(`${content.openings.length} openings, ${seconds(started)}`);
