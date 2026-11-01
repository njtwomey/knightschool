/**
 * The puzzle index: `.cache/puzzles/puzzles.sqlite` (git-ignored), built by the puzzle jobs (docs/v2/puzzles.md) and
 * read by select and lookup. One file, four groups of tables:
 *
 * - index.ts: `puzzles` (one row per puzzle), `puzzle_tags`, `themes`, `puzzle_themes` and `index_meta` (the
 *   file it was read from);
 * - names.ts: `opening_names` (every Lichess name with its final position) and `tag_positions` (the positions along
 *   the shortest named line of each tag);
 * - expand.ts: `games` (what was fetched), `positions` (EPDs by number) and `game_positions` (which positions each
 *   puzzle's game passed through, and at which ply).
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const cacheDir = join(root, '.cache/puzzles');
export const csvPath = join(cacheDir, 'lichess_db_puzzle.csv.zst');
export const dbPath = join(cacheDir, 'puzzles.sqlite');
export const openingsTsv = join(root, '.cache/openings.tsv');

export const PUZZLE_TABLES = `
CREATE TABLE puzzles (
  n INTEGER PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  fen TEXT NOT NULL,
  moves TEXT NOT NULL,
  rating INTEGER NOT NULL,
  rd INTEGER NOT NULL,
  popularity INTEGER NOT NULL,
  plays INTEGER NOT NULL,
  themes TEXT NOT NULL,
  game_id TEXT NOT NULL,
  ply INTEGER NOT NULL,
  opening_tags TEXT NOT NULL,
  solver TEXT NOT NULL,
  start_epd TEXT,
  structure TEXT
);
CREATE TABLE puzzle_tags (tag TEXT NOT NULL, puzzle INTEGER NOT NULL, PRIMARY KEY (tag, puzzle)) WITHOUT ROWID;
CREATE TABLE themes (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE puzzle_themes (theme INTEGER NOT NULL, puzzle INTEGER NOT NULL, PRIMARY KEY (theme, puzzle)) WITHOUT ROWID;
`;

export const PUZZLE_INDEXES = `
CREATE INDEX puzzles_rating ON puzzles (rating);
CREATE INDEX puzzles_structure ON puzzles (structure);
CREATE INDEX puzzles_game ON puzzles (game_id);
`;

export const NAME_TABLES = `
CREATE TABLE IF NOT EXISTS opening_names (
  name TEXT NOT NULL, eco TEXT NOT NULL, pgn TEXT NOT NULL, plies INTEGER NOT NULL,
  family TEXT NOT NULL, variation TEXT NOT NULL, epd TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS opening_names_epd ON opening_names (epd);
CREATE TABLE IF NOT EXISTS tag_positions (
  tag TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, ply INTEGER NOT NULL, epd TEXT NOT NULL,
  PRIMARY KEY (tag, ply)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS tag_positions_epd ON tag_positions (epd);
`;

export const EXPAND_TABLES = `
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY, status TEXT NOT NULL, plies INTEGER, fetched_at INTEGER NOT NULL
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS positions (id INTEGER PRIMARY KEY, epd TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS game_positions (
  position INTEGER NOT NULL, game_id TEXT NOT NULL, ply INTEGER NOT NULL, PRIMARY KEY (position, game_id)
) WITHOUT ROWID;
`;

/** Opens the index, failing with what to run when it is not built yet. */
export function openIndex(options: { readOnly?: boolean } = {}): DatabaseSync {
  if (!existsSync(dbPath)) {
    console.error(`No puzzle index at ${dbPath}. Run make puzzles-index first.`);
    process.exit(1);
  }
  const db = new DatabaseSync(dbPath, { readOnly: options.readOnly ?? false });
  db.exec('PRAGMA busy_timeout = 5000');
  return db;
}

export const ensureCacheDir = () => mkdirSync(cacheDir, { recursive: true });

export const hasTable = (db: DatabaseSync, name: string): boolean =>
  db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name) !== undefined;

/** True when the index was fully built from the puzzle file as it is now (same size and modification time). */
export function indexIsCurrent(): boolean {
  if (!existsSync(dbPath) || !existsSync(csvPath)) return false;
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    if (!hasTable(db, 'index_meta')) return false;
    const meta = db.prepare('SELECT source_mtime, source_size FROM index_meta').get() as
      { source_mtime: number; source_size: number } | undefined;
    const source = statSync(csvPath);
    return meta?.source_mtime === Math.floor(source.mtimeMs) && meta.source_size === source.size;
  } finally {
    db.close();
  }
}

export const seconds = (since: number) => `${((Date.now() - since) / 1000).toFixed(1)} s`;
