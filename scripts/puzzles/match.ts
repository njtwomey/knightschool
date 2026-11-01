/**
 * The puzzle index asked level by level (docs/v2/puzzles.md), shared by select and lookup. Each query applies the
 * filter in SQL and returns candidates for core's `choosePuzzles`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { parse } from 'yaml';
import {
  SiteConfig,
  type PuzzleCandidate,
  type PuzzleFilter,
  type PuzzleLevel,
  type Side,
} from '../../packages/core/src/index.ts';
import { hasTable, root } from './db.ts';

export const loadConfig = (): SiteConfig =>
  SiteConfig.parse(parse(readFileSync(join(root, 'content/config.yaml'), 'utf8')));

/** A match: the puzzle as shipped, plus where and how it was matched. */
export type Match = PuzzleCandidate & {
  fen: string;
  moves: string[];
  themes: string[];
  solver: Side;
  ply: number;
  /** The position it was matched at (EPD). */
  position: string;
  line?: string;
  /** The opening tag (variation, family) or pawn structure it was matched by. */
  by?: string;
};

type Row = {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  rd: number;
  popularity: number;
  plays: number;
  themes: string;
  game_id: string;
  ply: number;
  solver: Side;
  at?: number;
};

export type NamedAt = { name: string; family: string; variation: string; epd: string; ply: number };

/** Extra conditions a caller may add to every query: a theme the puzzle must have, who solves. */
export type Narrow = { theme?: string; solver?: Side };

/**
 * `options.games`: use expanded games (the through and after levels) when the index has them. Off by default: the
 * expansion is parked, so selection rests on the puzzle file alone.
 */
export function createMatcher(
  db: DatabaseSync,
  filter: PuzzleFilter,
  narrow: Narrow = {},
  options: { games?: boolean } = {},
) {
  const hasGames = Boolean(options.games) && hasTable(db, 'game_positions');
  const hasNames = hasTable(db, 'opening_names');
  const where = [
    'p.rating BETWEEN :minRating AND :maxRating',
    'p.popularity >= :minPopularity',
    'p.plays >= :minPlays',
    ...(filter.maxDeviation === undefined ? [] : ['p.rd <= :maxDeviation']),
    ...(narrow.theme ? [`(' ' || p.themes || ' ') LIKE :theme`] : []),
    ...(narrow.solver ? ['p.solver = :solver'] : []),
  ].join(' AND ');
  const params: Record<string, SQLInputValue> = {
    minRating: filter.minRating,
    maxRating: filter.maxRating,
    minPopularity: filter.minPopularity,
    minPlays: filter.minPlays,
    ...(filter.maxDeviation === undefined ? {} : { maxDeviation: filter.maxDeviation }),
    ...(narrow.theme ? { theme: `% ${narrow.theme} %` } : {}),
    ...(narrow.solver ? { solver: narrow.solver } : {}),
  };
  const columns = 'p.id, p.fen, p.moves, p.rating, p.rd, p.popularity, p.plays, p.themes, p.game_id, p.ply, p.solver';
  const ranked = 'ORDER BY p.popularity DESC, p.plays DESC, p.id LIMIT :limit';

  const throughQuery = hasGames
    ? db.prepare(`
      SELECT ${columns}, gp.ply AS at FROM positions pos
      JOIN game_positions gp ON gp.position = pos.id
      JOIN puzzles p ON p.game_id = gp.game_id AND p.ply >= gp.ply
      WHERE pos.epd = :epd AND ${where}
      ORDER BY p.ply - gp.ply, p.popularity DESC, p.id LIMIT :limit`)
    : null;
  const tagQuery = db.prepare(`
    SELECT ${columns} FROM puzzle_tags t JOIN puzzles p ON p.n = t.puzzle
    WHERE t.tag = :tag AND ${where} ${ranked}`);
  const structureQuery = db.prepare(
    `SELECT ${columns} FROM puzzles p WHERE p.structure = :structure AND ${where} ${ranked}`,
  );
  const themeIdQuery = db.prepare('SELECT id FROM themes WHERE name = ?');
  const namedQuery = hasNames ? db.prepare('SELECT name, family, variation FROM opening_names WHERE epd = ?') : null;

  const toMatch = (row: Row, level: PuzzleLevel, position: string, extra: Partial<Match> = {}): Match => ({
    id: row.id,
    gameId: row.game_id,
    rating: row.rating,
    deviation: row.rd,
    popularity: row.popularity,
    plays: row.plays,
    level,
    fen: row.fen,
    moves: row.moves.split(' '),
    themes: row.themes.split(' '),
    solver: row.solver,
    ply: row.ply,
    position,
    plies: row.at === undefined ? null : row.ply - row.at,
    ...extra,
    group: extra.by ?? position,
  });

  return {
    hasGames,
    hasNames,
    /** Puzzles whose game passed through the position (expanded games only), soonest first. */
    through(epd: string, level: 'through' | 'after', limit: number, extra: Partial<Match> = {}): Match[] {
      if (!throughQuery) return [];
      return (throughQuery.all({ ...params, epd, limit }) as Row[]).map((row) => toMatch(row, level, epd, extra));
    },
    /** Puzzles carrying an opening tag, most popular first. */
    tagged(tag: string, level: 'variation' | 'family', position: string, limit: number, extra: Partial<Match> = {}) {
      return (tagQuery.all({ ...params, tag, limit }) as Row[]).map((row) =>
        toMatch(row, level, position, { by: tag, ...extra }),
      );
    },
    /** Puzzles whose start has exactly these pawns, most popular first. */
    structure(structure: string, position: string, limit: number, extra: Partial<Match> = {}): Match[] {
      return (structureQuery.all({ ...params, structure, limit }) as Row[]).map((row) =>
        toMatch(row, 'structure', position, { by: structure, ...extra }),
      );
    },
    /** Puzzles showing any of these themes, most popular first. */
    themed(themes: string[], position: string, limit: number, extra: Partial<Match> = {}): Match[] {
      const ids = themes.flatMap((name) => {
        const row = themeIdQuery.get(name) as { id: number } | undefined;
        return row ? [row.id] : [];
      });
      if (!ids.length) return [];
      const rows = db
        .prepare(
          `SELECT DISTINCT ${columns} FROM puzzle_themes pt JOIN puzzles p ON p.n = pt.puzzle
           WHERE pt.theme IN (${ids.join(',')}) AND ${where} ${ranked}`,
        )
        .all({ ...params, limit }) as Row[];
      return rows.map((row) => toMatch(row, 'idea', position, { by: themes.join(' '), ...extra }));
    },
    /** The deepest position on a path that Lichess names, with its tags. */
    deepestNamed(epds: readonly string[]): NamedAt | null {
      if (!namedQuery) return null;
      for (let index = epds.length - 1; index >= 0; index -= 1) {
        const row = namedQuery.get(epds[index]!) as Omit<NamedAt, 'epd' | 'ply'> | undefined;
        if (row) return { ...row, epd: epds[index]!, ply: index + 1 };
      }
      return null;
    },
  };
}

export type Matcher = ReturnType<typeof createMatcher>;

/** "800-1400" as a rating band. */
export function parseBand(text: string): { minRating: number; maxRating: number } {
  const match = /^(\d+)-(\d+)$/.exec(text.trim());
  if (!match) throw new Error(`A rating band is two numbers, as 800-1400 (got "${text}")`);
  return { minRating: Number(match[1]), maxRating: Number(match[2]) };
}
