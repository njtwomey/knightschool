import { sideToMove, type Side } from '../chess/epd';
import { playMove } from '../chess/play';

/*
 * Coverage (docs/v2/library/training.md, docs/v2/components/coverage-meter.md): of the games players at the band reach
 * from a position, the share still inside what the learner knows (or what their openings cover) by move 5, 10 and 15.
 * The walk follows the learner's one move where they have it and every reply the band plays at least `minShare` of the
 * time (rarer replies are left out, the rest sharing their games); a game leaves at the first move nobody answers.
 */

export type CoverageCounts = Record<string, { games: number; moves: { uci: string; games: number }[] }>;

export type CoverageDepth = { move: number; share: number };

/** A gap: a position the learner must answer and does not, the moves that reach it from `start`, its share of games. */
export type CoverageGap = { epd: string; moves: string[]; share: number };

export type CoverageResult = {
  depths: CoverageDepth[];
  /** The positions where games leave because the learner has no answer, the biggest first. */
  gaps: CoverageGap[];
  /** Some positions on the way had no explorer counts: their games count as left. */
  missingData: boolean;
};

/**
 * The share of the band's games from `start` (at game ply `startPly`) still inside `answer` (the learner's move in a
 * position, or none) at each of `depths` (full moves of the game: move 10 is after ply 20).
 */
export function coverage(input: {
  start: string;
  startPly: number;
  side: Side;
  answer: (epd: string) => string | undefined;
  counts: CoverageCounts;
  minShare: number;
  depths: readonly number[];
}): CoverageResult {
  const deepest = Math.max(...input.depths) * 2;
  /** Games leaving at each ply; a game still inside at the deepest depth leaves at `deepest`. */
  const left = new Map<number, number>();
  const gaps = new Map<string, CoverageGap>();
  let missingData = false;
  const leave = (ply: number, mass: number) => left.set(ply, (left.get(ply) ?? 0) + mass);
  const walk = (epd: string, ply: number, mass: number, moves: string[] = []) => {
    if (mass <= 1e-9) return;
    if (ply >= deepest) return leave(deepest, mass);
    if (sideToMove(epd) === input.side) {
      const uci = input.answer(epd);
      const next = uci ? playMove(epd, uci) : null;
      if (!next) {
        const gap = gaps.get(epd) ?? { epd, moves, share: 0 };
        gap.share += mass;
        gaps.set(epd, gap);
        return leave(ply, mass);
      }
      return walk(next.epd, ply + 1, mass, [...moves, next.uci]);
    }
    const counts = input.counts[epd];
    if (!counts?.games) {
      missingData = true;
      return leave(ply, mass);
    }
    const kept = counts.moves.filter((move) => move.games / counts.games >= input.minShare);
    const total = kept.reduce((sum, move) => sum + move.games, 0);
    if (!total) return leave(ply, mass);
    for (const move of kept) {
      const next = playMove(epd, move.uci);
      if (next) walk(next.epd, ply + 1, (mass * move.games) / total, [...moves, next.uci]);
    }
  };
  walk(input.start, input.startPly, 1);
  return {
    depths: input.depths.map((move) => {
      let share = 0;
      for (const [ply, mass] of left) if (ply >= move * 2) share += mass;
      return { move, share: Math.min(1, share) };
    }),
    gaps: [...gaps.values()].sort((a, b) => b.share - a.share),
    missingData,
  };
}
