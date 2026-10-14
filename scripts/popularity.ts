/**
 * pnpm popularity [--everything] [--limit N] [--refresh-days N] [--no-fetch]      (or: make popularity)
 *
 * Asks the Lichess explorer how often real players (blitz and rapid, rated 1000 to 1600) reach each position of the
 * courses and which moves they play, and stores the answers in content/popularity/popularity.json, which is committed.
 * `pnpm content:build` reads that file and never touches the network.
 *
 * Only the positions that matter are asked about: every position on the lines that earn cards, side variations
 * included. Rare lines and alternatives are skipped unless --everything. A position already in the file is skipped, so
 * the run is resumable and cheap to repeat after adding a course; --refresh-days N asks again for entries older than
 * that. One request at a time, 60 s pause after a 429 (the explorer is rate limited, so a first full run takes hours).
 * The file is rewritten every 25 positions and on Ctrl-C, so a stopped run loses nothing.
 *
 * Needs LICHESS_TOKEN (a free personal token with no scopes; see .env.example). --no-fetch only imports what an
 * older run left under .cache/explorer and needs no token.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  EXPLORER_BAND,
  ExplorerResponse,
  PopularityFile,
  mergePopularity,
  popularityTargets,
  serializePopularity,
  type PopularityEntry,
} from '../packages/core/src/index.ts';
import { loadCourses, rel, root } from './content-lib.ts';

export const popularityPath = join(root, 'content', 'popularity', 'popularity.json');
const oldCacheDir = join(root, '.cache', 'explorer');
const SAVE_EVERY = 25;

const args = process.argv.slice(2);
const has = (name: string) => args.includes(`--${name}`);
const number = (name: string): number | undefined => {
  const at = args.indexOf(`--${name}`);
  if (at < 0) return undefined;
  const value = Number(args[at + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`popularity: --${name} needs a positive whole number`);
    process.exit(2);
  }
  return value;
};

const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function load(): PopularityFile {
  const empty: PopularityFile = {
    speeds: [...EXPLORER_BAND.speeds],
    ratings: [...EXPLORER_BAND.ratings],
    date: today(),
    positions: {},
  };
  if (!existsSync(popularityPath)) return empty;
  const parsed = PopularityFile.safeParse(JSON.parse(readFileSync(popularityPath, 'utf8')));
  if (!parsed.success) throw new Error(`${rel(popularityPath)}: ${parsed.error.message}`);
  const same = parsed.data.speeds.join() === empty.speeds.join() && parsed.data.ratings.join() === empty.ratings.join();
  if (!same) {
    throw new Error(
      `${rel(popularityPath)} was fetched for another band; change EXPLORER_BAND back or delete the file`,
    );
  }
  return parsed.data;
}

function save(file: PopularityFile) {
  mkdirSync(dirname(popularityPath), { recursive: true });
  const temp = `${popularityPath}.tmp`;
  writeFileSync(temp, serializePopularity({ ...file, date: today() }));
  renameSync(temp, popularityPath);
}

/** Answers an earlier version of `content:build` left under .cache/explorer, one JSON file per position. */
function fromOldCache(wanted: Set<string>): Record<string, PopularityEntry> {
  const found: Record<string, PopularityEntry> = {};
  if (!existsSync(oldCacheDir)) return found;
  for (const name of readdirSync(oldCacheDir)) {
    if (!name.endsWith('.json')) continue;
    const key = Buffer.from(name.slice(0, -5), 'base64url').toString('utf8');
    const [epd, speeds, ratings] = key.split('|');
    if (!epd || !wanted.has(epd)) continue;
    if (speeds !== EXPLORER_BAND.speeds.join(',') || ratings !== EXPLORER_BAND.ratings.join(',')) continue;
    const file = join(oldCacheDir, name);
    const body = JSON.parse(readFileSync(file, 'utf8')) as Omit<PopularityEntry, 'at'>;
    found[epd] = {
      white: body.white,
      draws: body.draws,
      black: body.black,
      moves: body.moves.map(({ uci, san, white, draws, black }) => ({ uci, san, white, draws, black })),
      at: statSync(file).mtime.toISOString().slice(0, 10),
    };
  }
  return found;
}

const interactive = Boolean(process.stdout.isTTY);

/** One updating line: a bar, counts, the pace and a rough time left. Plain lines when the output is not a terminal. */
function progress(known: number, total: number, done: number, started: number, note = '') {
  const elapsed = Date.now() - started;
  const perMinute = done > 0 ? (done / elapsed) * 60_000 : 0;
  const left = perMinute > 0 ? Math.round((total - known) / perMinute) : undefined;
  const eta =
    left === undefined
      ? ''
      : left >= 60
        ? ` · ~${Math.floor(left / 60)} h ${left % 60} min left`
        : ` · ~${left} min left`;
  const width = 30;
  const filled = Math.round((known / total) * width);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
  const text = `${bar} ${known}/${total} ${Math.round((known / total) * 100)}%${perMinute ? ` · ${Math.round(perMinute)}/min` : ''}${eta}${note}`;
  if (interactive) process.stdout.write(`\r\x1b[K${text}`);
  else if (done % SAVE_EVERY === 0) console.log(text);
}

/** Prints a message on its own line without leaving the progress line behind. */
function say(message: string) {
  if (interactive) process.stdout.write('\r\x1b[K');
  console.log(message);
}

let pausedUntil = 0;

/**
 * Waits out a rate-limit pause. The progress line stays where it is and a countdown runs on the line below it; when
 * the pause is over the countdown disappears and the progress line carries on.
 */
async function waitOutPause() {
  let shown = false;
  for (let left = pausedUntil - Date.now(); left > 0; left = pausedUntil - Date.now()) {
    const text = `  Lichess is rate limiting us, resuming in ${Math.ceil(left / 1000)} s`;
    if (interactive) process.stdout.write(`${shown ? '\r\x1b[K' : '\n'}${text}`);
    else if (!shown) console.log(text.trim());
    shown = true;
    await sleep(Math.min(1000, left));
  }
  if (shown && interactive) process.stdout.write('\r\x1b[K\x1b[1A'); // clear the countdown, back onto the progress line
}

/** One request at a time; waits out a 429. */
async function ask(epd: string, token: string): Promise<PopularityEntry> {
  const query = new URLSearchParams({
    fen: `${epd} 0 1`,
    speeds: EXPLORER_BAND.speeds.join(','),
    ratings: EXPLORER_BAND.ratings.join(','),
  });
  for (;;) {
    await waitOutPause();
    const response = await fetch(`https://explorer.lichess.org/lichess?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'knightschool popularity (github.com/njtwomey/knightschool)',
      },
    });
    if (response.status === 429) {
      pausedUntil = Date.now() + 60_000;
      continue;
    }
    if (!response.ok) throw new Error(`explorer ${response.status} for ${epd}`);
    const body = ExplorerResponse.parse(await response.json());
    return {
      white: body.white,
      draws: body.draws,
      black: body.black,
      moves: body.moves.map(({ uci, san, white, draws, black }) => ({ uci, san, white, draws, black })),
      at: today(),
    };
  }
}

async function main() {
  const targets = popularityTargets(loadCourses(), has('everything'));
  const file = load();
  const imported = fromOldCache(new Set(targets));
  const before = Object.keys(file.positions).length;
  file.positions = mergePopularity(imported, file.positions); // what the file already has wins over the old cache

  const refreshBefore = number('refresh-days');
  const cutoff = refreshBefore
    ? new Date(Date.now() - refreshBefore * 86_400_000).toISOString().slice(0, 10)
    : undefined;
  const missing = targets.filter((epd) => {
    const have = file.positions[epd];
    return !have || (cutoff !== undefined && have.at < cutoff);
  });
  const limit = number('limit');
  const queue = limit ? missing.slice(0, limit) : missing;
  console.log(
    `popularity: ${targets.length} positions matter, ${targets.length - missing.length} already known ` +
      `(${Object.keys(file.positions).length - before} imported from the old cache), ${missing.length} to fetch` +
      (limit ? `, fetching ${queue.length} this run` : ''),
  );

  if (has('no-fetch') || queue.length === 0) {
    save(file);
    console.log(`popularity: wrote ${rel(popularityPath)}`);
    return;
  }
  const token = process.env.LICHESS_TOKEN;
  if (!token) {
    save(file);
    console.error('popularity: LICHESS_TOKEN is not set (copy .env.example to .env and fill it in)');
    process.exit(1);
  }

  let interrupted = false;
  process.on('SIGINT', () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    say('popularity: stopping after this position (Ctrl-C again to quit at once)');
  });

  const started = Date.now();
  const alreadyKnown = targets.length - missing.length;
  let done = 0;
  progress(alreadyKnown, targets.length, done, started);
  for (const epd of queue) {
    if (interrupted) break;
    file.positions[epd] = await ask(epd, token);
    done += 1;
    if (done % SAVE_EVERY === 0) save(file);
    progress(alreadyKnown + done, targets.length, done, started);
  }
  save(file);
  say('');
  console.log(`popularity: ${done} fetched, ${missing.length - done} still to do; wrote ${rel(popularityPath)}`);
}

main().catch((error) => {
  console.error(`popularity: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
