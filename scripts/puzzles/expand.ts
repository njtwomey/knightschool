/**
 * Parked by the user's choice (docs/v2/puzzles.md): not part of make puzzles. A plain script someone can run later.
 *
 * Fetches puzzles' games from Lichess and stores the positions each passed through up to the
 * puzzle (`game_positions`), so a position can be asked for the puzzles whose games went through it. Resumable: games
 * already fetched are skipped. One request at a time, up to 300 games each; after a 429 it waits
 * `lichess.pauseAfter429Ms`. LICHESS_TOKEN comes from .env through node's --env-file-if-exists (never printed).
 *
 *   pnpm puzzles:expand [--tag Italian_Game] [--all] [--requests N] [--max-ply 40]
 *
 * By default only puzzles with opening tags (their games are in the opening); --all takes every puzzle.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parse } from 'yaml';
import { readPgnGames } from '../../packages/core/src/chess/pgn-games.ts';
import { fenToEpd, replay, SiteConfig, START_EPD } from '../../packages/core/src/index.ts';
import { EXPAND_TABLES, openIndex, root } from './db.ts';

const { values } = parseArgs({
  options: {
    tag: { type: 'string' },
    all: { type: 'boolean', default: false },
    requests: { type: 'string' },
    'max-ply': { type: 'string', default: '40' },
  },
});
const maxRequests = values.requests ? Number(values.requests) : Infinity;
const maxPly = Number(values['max-ply']);
const config = SiteConfig.parse(parse(readFileSync(join(root, 'content/config.yaml'), 'utf8')));
const PER_REQUEST = 300;
const token = process.env.LICHESS_TOKEN;
const EXPORT_URL =
  'https://lichess.org/api/games/export/_ids?moves=true&tags=true&clocks=false&evals=false&opening=false&literate=false';

const db = openIndex();
db.exec(EXPAND_TABLES);

type Wanted = { ply: number; fen: string }[];

/** The next games not yet fetched, walking the puzzles in order (in the tag's index when there is a tag). */
const key = values.tag ? 't.puzzle' : 'p.n';
const pending = db.prepare(`
  SELECT p.n, p.game_id FROM puzzles p
  ${values.tag ? 'JOIN puzzle_tags t ON t.puzzle = p.n AND t.tag = :tag' : ''}
  WHERE ${key} > :after ${values.all || values.tag ? '' : "AND p.opening_tags != ''"}
    AND NOT EXISTS (SELECT 1 FROM games g WHERE g.game_id = p.game_id)
  ORDER BY ${key} LIMIT 1000`);
const puzzlesOfGame = db.prepare('SELECT ply, fen FROM puzzles WHERE game_id = ?');
let cursor = 0;

/** Up to 300 games, each with the ply and FEN of every puzzle from it. */
function nextBatch(): Map<string, Wanted> {
  const batch = new Map<string, Wanted>();
  while (batch.size < PER_REQUEST) {
    const params: Record<string, string | number> = { after: cursor };
    if (values.tag) params.tag = values.tag;
    const rows = pending.all(params) as { n: number; game_id: string }[];
    if (!rows.length) break;
    for (const row of rows) {
      if (batch.size === PER_REQUEST) break;
      cursor = row.n;
      if (!batch.has(row.game_id)) batch.set(row.game_id, puzzlesOfGame.all(row.game_id) as Wanted);
    }
  }
  return batch;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One export request, waiting out a 429 and retrying a server error a few times. */
async function fetchGames(ids: string[]): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(EXPORT_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/x-chess-pgn',
        'Content-Type': 'text/plain',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: ids.join(','),
    });
    if (response.ok) return response.text();
    if (response.status === 429) {
      console.log(`429: pausing ${config.lichess.pauseAfter429Ms / 1000} s`);
      await wait(config.lichess.pauseAfter429Ms);
    } else if (response.status === 401) {
      throw new Error('Lichess rejected the token (401)');
    } else if (response.status >= 500 && attempt < 4) {
      console.log(`HTTP ${response.status}: retrying in 10 s`);
      await wait(10_000);
    } else throw new Error(`Lichess answered HTTP ${response.status}`);
  }
}

const insertGame = db.prepare('INSERT OR REPLACE INTO games (game_id, status, plies, fetched_at) VALUES (?, ?, ?, ?)');
const insertPositionRow = db.prepare(
  'INSERT INTO positions (epd) VALUES (?) ON CONFLICT (epd) DO UPDATE SET epd = excluded.epd RETURNING id',
);
const insertGamePosition = db.prepare('INSERT OR IGNORE INTO game_positions (position, game_id, ply) VALUES (?, ?, ?)');
const positionIds = new Map<string, number>();
const positionId = (epd: string): number => {
  let id = positionIds.get(epd);
  if (id === undefined) {
    id = Number((insertPositionRow.get(epd) as { id: number }).id);
    positionIds.set(epd, id);
  }
  return id;
};

const totals = { requests: 0, games: 0, missing: 0, checked: 0, mismatched: 0, rows: 0, fetchMs: 0 };
const started = Date.now();
console.log(`Expanding ${values.tag ?? (values.all ? 'every puzzle' : 'tagged puzzles')}${token ? '' : ' (no token)'}`);
while (totals.requests < maxRequests) {
  const batch = nextBatch();
  if (!batch.size) {
    console.log('Nothing left to fetch.');
    break;
  }
  const requestStarted = Date.now();
  const text = await fetchGames([...batch.keys()]);
  const fetchMs = Date.now() - requestStarted;
  const games = readPgnGames(text).flatMap(({ tags, sans }) => {
    const id = tags.GameId ?? /lichess\.org\/(?:game\/)?([A-Za-z0-9]{8})/.exec(tags.Site ?? '')?.[1];
    return id ? [{ id, sans }] : [];
  });
  if (!games.length && text.trim()) {
    // Lichess answered but nothing parsed: stop rather than mark every game missing.
    console.error(`Could not read the export (${text.length} characters); nothing stored.`);
    break;
  }
  const now = Date.now();
  db.exec('BEGIN');
  for (const game of games) {
    const wanted = batch.get(game.id);
    if (!wanted) continue;
    batch.delete(game.id);
    const lastPly = Math.max(...wanted.map((puzzle) => puzzle.ply));
    const played = replay(START_EPD, game.sans.slice(0, lastPly));
    // A puzzle's FEN is the game after ply - 1 plies (before the opponent's move).
    for (const puzzle of wanted) {
      totals.checked += 1;
      const before = puzzle.ply > 1 ? played[puzzle.ply - 2]?.epd : START_EPD;
      if (before !== fenToEpd(puzzle.fen)) totals.mismatched += 1;
    }
    played.slice(0, maxPly).forEach((move, index) => {
      insertGamePosition.run(positionId(move.epd), game.id, index + 1);
      totals.rows += 1;
    });
    insertGame.run(game.id, played.length === lastPly ? 'ok' : 'bad', played.length, now);
    totals.games += 1;
  }
  for (const id of batch.keys()) {
    insertGame.run(id, 'missing', null, now);
    totals.missing += 1;
  }
  db.exec('COMMIT');
  totals.requests += 1;
  totals.fetchMs += fetchMs;
  const rate = games.length / (fetchMs / 1000);
  console.log(
    `request ${totals.requests}: ${games.length} games in ${(fetchMs / 1000).toFixed(1)} s (${rate.toFixed(1)}/s)`,
  );
}

const elapsed = (Date.now() - started) / 1000;
const perSecond = totals.games / elapsed;
console.log(
  `${totals.games} games (${totals.missing} missing) in ${totals.requests} requests, ${elapsed.toFixed(1)} s:` +
    ` ${perSecond.toFixed(1)} games/s overall, ${(totals.games / (totals.fetchMs / 1000)).toFixed(1)}/s fetching`,
);
console.log(
  `${totals.rows} positions stored; ${totals.checked - totals.mismatched} of ${totals.checked} puzzle FENs found in their games`,
);
if (perSecond > 0) {
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  // The database has one puzzle per game, so puzzles count games. Each tagged puzzle has two tags.
  const tagged = count('SELECT COUNT(*) / 2 AS n FROM puzzle_tags');
  const all = count('SELECT MAX(n) AS n FROM puzzles');
  const hours = (games: number) => (games / perSecond / 3600).toFixed(1);
  console.log(`At this rate: tagged ${tagged} puzzles ${hours(tagged)} h, all ${all} ${hours(all)} h`);
}
db.close();
