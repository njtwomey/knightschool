import { playMove } from '../chess/play';
import type { BuiltOpening } from './build-opening';

export type FactLine = { cp?: number; mate?: number; pv: string[] };
export type FactCounts = { games: number; moves: { uci: string; san: string; games: number }[] };
export type OpeningFacts = {
  /** Engine evaluations by position (White's view), from content/analysis. */
  evals: Record<string, { depth: number; lines: FactLine[] }>;
  /** What players at the band play from each position, from content/popularity. */
  counts: Record<string, FactCounts>;
};

type PopularityEntry = {
  white: number;
  draws: number;
  black: number;
  moves: { uci: string; san: string; white: number; draws: number; black: number }[];
};

/** The explorer writes castling as the king taking its rook (e1h1); lines write the king's move (e1g1). */
const CASTLING: Record<string, string> = { e1h1: 'e1g1', e1a1: 'e1c1', e8h8: 'e8g8', e8a8: 'e8c8' };
export const explorerUci = (uci: string) => CASTLING[uci] ?? uci;

/**
 * The facts an opening's pages need, and no more: evaluations and explorer counts for every position of the opening,
 * the positions its moves and refutations lead to, and the positions after the moves the band plays at least
 * `minShare` of the time (the likely wrong answers).
 */
export function openingFacts(
  opening: BuiltOpening,
  analysis: Record<string, { depth: number; lines: FactLine[] }>,
  popularity: Record<string, PopularityEntry>,
  minShare: number,
): OpeningFacts {
  const wanted = new Set<string>();
  const counts: OpeningFacts['counts'] = {};
  for (const [epd, position] of Object.entries(opening.positions)) {
    wanted.add(epd);
    for (const move of position.moves) wanted.add(move.to);
    for (const refutation of position.refutations ?? []) {
      const after = playMove(epd, refutation.uci);
      if (after) wanted.add(after.epd);
    }
    const entry = popularity[epd];
    if (!entry) continue;
    const games = entry.white + entry.draws + entry.black;
    const moves = entry.moves.map((move) => ({
      uci: explorerUci(move.uci),
      san: move.san,
      games: move.white + move.draws + move.black,
    }));
    counts[epd] = { games, moves };
    for (const move of moves) {
      if (games > 0 && move.games / games >= minShare) {
        const after = playMove(epd, move.uci);
        if (after) wanted.add(after.epd);
      }
    }
  }
  const evals: OpeningFacts['evals'] = {};
  for (const epd of wanted) if (analysis[epd]) evals[epd] = analysis[epd];
  return { evals, counts };
}
