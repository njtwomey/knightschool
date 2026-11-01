/**
 * make puzzles-index: reads the Lichess puzzle database (.cache/puzzles/lichess_db_puzzle.csv.zst) once into the
 * puzzle index, one row per puzzle with its tags, themes, game, ply, solver, start position and pawn structure.
 * Replaces the puzzle tables each run; the names and the expanded games in the same file are kept.
 *
 *   pnpm puzzles:index [--limit N]
 */
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';
import { parsePuzzleRow, pawnStructure, puzzleSolver, puzzleStart } from '../../packages/core/src/index.ts';
import { csvPath, dbPath, ensureCacheDir, PUZZLE_INDEXES, PUZZLE_TABLES, seconds } from './db.ts';

const { values } = parseArgs({ options: { limit: { type: 'string' } } });
const limit = values.limit ? Number(values.limit) : Infinity;

if (!existsSync(csvPath)) {
  console.error(
    `No puzzle database at ${csvPath}. Download https://database.lichess.org/lichess_db_puzzle.csv.zst there.`,
  );
  process.exit(1);
}
ensureCacheDir();
const started = Date.now();
const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA cache_size = -400000;
  DROP TABLE IF EXISTS puzzle_themes;
  DROP TABLE IF EXISTS themes;
  DROP TABLE IF EXISTS puzzle_tags;
  DROP TABLE IF EXISTS puzzles;
  DROP TABLE IF EXISTS index_meta;
  ${PUZZLE_TABLES}
`);

const insertPuzzle = db.prepare(`
  INSERT INTO puzzles (id, fen, moves, rating, rd, popularity, plays, themes, game_id, ply, opening_tags, solver,
    start_epd, structure)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insertTag = db.prepare('INSERT OR IGNORE INTO puzzle_tags (tag, puzzle) VALUES (?, ?)');
const insertTheme = db.prepare('INSERT INTO themes (name) VALUES (?)');
const insertPuzzleTheme = db.prepare('INSERT OR IGNORE INTO puzzle_themes (theme, puzzle) VALUES (?, ?)');
const themeIds = new Map<string, number>();
const themeId = (name: string): number => {
  let id = themeIds.get(name);
  if (id === undefined) {
    id = Number(insertTheme.run(name).lastInsertRowid);
    themeIds.set(name, id);
  }
  return id;
};

let rows = 0;
let tagged = 0;
let skipped = 0;
let badStarts = 0;
// The file starts with a skippable frame (written by pzstd), which node's zstd stream rejects, so the zstd command reads it.
const zstd = spawn('zstd', ['-dc', csvPath], { stdio: ['ignore', 'pipe', 'inherit'] });
zstd.on('error', () => {
  console.error('Needs the zstd command (brew install zstd).');
  process.exit(1);
});
const lines = createInterface({ input: zstd.stdout, crlfDelay: Infinity });
db.exec('BEGIN');
for await (const line of lines) {
  const puzzle = parsePuzzleRow(line);
  if (!puzzle) {
    if (!line.startsWith('PuzzleId')) skipped += 1;
    continue;
  }
  let startEpd: string | null = null;
  try {
    startEpd = puzzleStart(puzzle).epd;
  } catch {
    badStarts += 1;
  }
  const n = Number(
    insertPuzzle.run(
      puzzle.id,
      puzzle.fen,
      puzzle.moves.join(' '),
      puzzle.rating,
      puzzle.deviation,
      puzzle.popularity,
      puzzle.plays,
      puzzle.themes.join(' '),
      puzzle.gameId,
      puzzle.ply,
      puzzle.openingTags.join(' '),
      puzzleSolver(puzzle),
      startEpd,
      startEpd ? pawnStructure(startEpd) : null,
    ).lastInsertRowid,
  );
  for (const tag of puzzle.openingTags) insertTag.run(tag, n);
  for (const theme of puzzle.themes) insertPuzzleTheme.run(themeId(theme), n);
  if (puzzle.openingTags.length) tagged += 1;
  rows += 1;
  if (rows % 50_000 === 0) db.exec('COMMIT; BEGIN');
  if (rows % 1_000_000 === 0) console.log(`${(rows / 1e6).toFixed(0)}M rows, ${seconds(started)}`);
  if (rows >= limit) break;
}
db.exec('COMMIT');
zstd.kill();

const loaded = seconds(started);
db.exec(PUZZLE_INDEXES);
db.exec('ANALYZE');
// What the index was built from, so make puzzles can skip indexing until the file changes (not for a --limit run).
if (limit === Infinity) {
  db.exec(
    'CREATE TABLE index_meta (source_mtime INTEGER NOT NULL, source_size INTEGER NOT NULL, rows INTEGER NOT NULL)',
  );
  const source = statSync(csvPath);
  db.prepare('INSERT INTO index_meta VALUES (?, ?, ?)').run(Math.floor(source.mtimeMs), source.size, rows);
}
db.close();
const size = (statSync(dbPath).size / 1e9).toFixed(2);
console.log(`${rows} puzzles, ${tagged} with opening tags, ${themeIds.size} themes`);
console.log(`read in ${loaded}, indexed in ${seconds(started)}`);
if (skipped || badStarts) console.log(`${skipped} rows unreadable, ${badStarts} with an illegal first move`);
console.log(`${dbPath}: ${size} GB`);
