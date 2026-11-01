/**
 * What the puzzle jobs read besides the puzzle database: Lichess's opening names, and the lines to match puzzles to
 * (a move list, a built opening from content:build, or the example fixture).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { BuiltOpening, IdeasFile } from '../../packages/core/src/content/index.ts';
import { openingTagsOf, replay, START_EPD, type Played, type Side } from '../../packages/core/src/index.ts';
import { openingsTsv, root } from './db.ts';

export type Named = {
  name: string;
  eco: string;
  pgn: string;
  sans: string[];
  epds: string[];
  family: string;
  variation: string;
};

/** The SAN moves of a movetext ("1. e4 e5 2. Nf3", or "e4 e5 Nf3"): move numbers dropped. */
export const sansOf = (pgn: string): string[] =>
  pgn
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/** Every Lichess opening name with its moves replayed. Names whose moves do not replay are left out and counted. */
export function readOpeningNames(path = openingsTsv): { names: Named[]; broken: number } {
  if (!existsSync(path)) {
    console.error(`No opening names at ${path}: the content build fetches them.`);
    process.exit(1);
  }
  const names: Named[] = [];
  let broken = 0;
  for (const row of readFileSync(path, 'utf8').trim().split('\n').slice(1)) {
    const [eco, name, pgn] = row.split('\t');
    if (!eco || !name || !pgn) continue;
    const sans = sansOf(pgn);
    const played = replay(START_EPD, sans);
    if (played.length !== sans.length) {
      broken += 1;
      continue;
    }
    names.push({ name, eco, pgn, sans, epds: played.map((move) => move.epd), ...openingTagsOf(name) });
  }
  return { names, broken };
}

/** One line to match: its moves played from the start of the game. */
export type MatchLine = { id: string; kind: string; played: Played[] };

/** What select and lookup match puzzles against. `startPly`: positions before it belong to every opening there. */
export type MatchInput = {
  id: string;
  side: Side | null;
  startPly: number;
  lines: MatchLine[];
  /** Lichess puzzle themes of the opening's ideas (content/ideas.yaml). */
  themes: string[];
  /** Games reaching each position (explorer counts), where the input has them. */
  reach: Map<string, number>;
  /** Positions off the lines (a refutation's moves), matched at the through level. */
  extra: { epd: string; line: string }[];
};

export const BUILT_ITALIAN = join(root, 'apps/web/public/content/openings/italian-white.json');
export const FIXTURE_ITALIAN = join(root, 'apps/web/src/mocks/fixtures/italian.json');

/** Lines from a move list: one line, matched from its first move. */
export function linesFromMoves(moves: string): MatchInput {
  const sans = sansOf(moves);
  const played = replay(START_EPD, sans);
  if (played.length !== sans.length)
    throw new Error(`"${sans[played.length]}" is not legal after ${played.length} plies`);
  return {
    id: 'moves',
    side: null,
    startPly: 0,
    lines: [{ id: 'moves', kind: 'main', played }],
    themes: [],
    reach: new Map(),
    extra: [],
  };
}

type LineJson = { id: string; kind?: string; sans?: string[]; moves?: (string | { san?: string; uci?: string })[] };
type OpeningJson = {
  id?: string;
  side?: Side;
  startPly?: number;
  ideas?: string[];
  opening?: { id?: string; side?: Side; start?: string[]; ideas?: string[] };
  lines?: LineJson[] | Record<string, LineJson>;
  positions?: Record<string, { games?: number }>;
};

/**
 * Lines from an opening JSON: a built opening (apps/web/public/content/openings/<id>.json) or the example fixture's
 * shape (`opening` plus `lines` keyed by id). Extra files may add reach counts (`positions[epd].games`).
 */
export function linesFromOpening(path: string, reachFiles: string[] = []): MatchInput {
  const json = JSON.parse(readFileSync(path, 'utf8')) as OpeningJson;
  const list = Array.isArray(json.lines) ? json.lines : Object.values(json.lines ?? {});
  const lines = list.map((line): MatchLine => {
    const moves =
      line.sans ?? (line.moves ?? []).map((move) => (typeof move === 'string' ? move : (move.san ?? move.uci!)));
    const played = replay(START_EPD, moves);
    if (played.length !== moves.length) throw new Error(`${path}: line ${line.id} stops at ply ${played.length}`);
    return { id: line.id, kind: line.kind ?? 'main', played };
  });
  const reach = new Map<string, number>();
  for (const file of [path, ...reachFiles]) {
    const positions = (JSON.parse(readFileSync(file, 'utf8')) as OpeningJson).positions ?? {};
    for (const [epd, node] of Object.entries(positions)) if (node.games) reach.set(epd, node.games);
  }
  const ideas = json.ideas ?? json.opening?.ideas ?? [];
  return {
    id: json.id ?? json.opening?.id ?? 'opening',
    side: json.side ?? json.opening?.side ?? null,
    startPly: json.startPly ?? json.opening?.start?.length ?? 0,
    lines,
    themes: ideaThemes(ideas),
    reach,
    extra: [],
  };
}

/** The Lichess themes of some ideas, from content/ideas.yaml. */
export function ideaThemes(ideas: string[]): string[] {
  const path = join(root, 'content/ideas.yaml');
  if (!ideas.length || !existsSync(path)) return [];
  const all = parse(readFileSync(path, 'utf8')) as { id: string; themes?: string[] }[];
  return [...new Set(all.filter((idea) => ideas.includes(idea.id)).flatMap((idea) => idea.themes ?? []))];
}

/**
 * Lines from an opening built by content:build (scripts/content/load.ts `loadContent`): every line from the start of
 * the game, every refutation's moves as extra positions, the themes of its ideas, and reach from the band counts.
 */
export function linesFromBuilt(opening: BuiltOpening, ideas: IdeasFile, reach: Map<string, number>): MatchInput {
  const lines = opening.lines.map((line): MatchLine => {
    const played = replay(START_EPD, line.moves);
    if (played.length !== line.moves.length)
      throw new Error(`${opening.id}: line ${line.id} stops at ply ${played.length}`);
    return { id: line.id, kind: line.kind, played };
  });
  const extra: MatchInput['extra'] = [];
  for (const [epd, node] of Object.entries(opening.positions)) {
    for (const refutation of node.refutations ?? []) {
      const moves = [refutation.uci, ...refutation.then.map((move) => move.uci)];
      for (const move of replay(epd, moves)) extra.push({ epd: move.epd, line: `refutation:${refutation.san}` });
    }
  }
  const wanted = new Set(opening.ideas);
  const themes = [...new Set(ideas.filter((idea) => wanted.has(idea.id)).flatMap((idea) => idea.themes ?? []))];
  return { id: opening.id, side: opening.side, startPly: opening.startPly, lines, themes, reach, extra };
}

/** Games reaching each position in the explorer band (content/popularity/popularity.json); empty when it is missing. */
export function loadReach(): Map<string, number> {
  const path = join(root, 'content/popularity/popularity.json');
  const reach = new Map<string, number>();
  if (!existsSync(path)) return reach;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8')) as {
      positions?: Record<string, { white?: number; draws?: number; black?: number }>;
    };
    for (const [epd, node] of Object.entries(json.positions ?? {})) {
      reach.set(epd, (node.white ?? 0) + (node.draws ?? 0) + (node.black ?? 0));
    }
  } catch {
    console.log('content/popularity/popularity.json did not read; ranking without reach');
  }
  return reach;
}
