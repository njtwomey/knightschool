import type { SpeedAttempt } from './schema/user';

export type SpeedSummary = {
  lines: number;
  moves: number;
  errors: number;
  hints: number;
  /** Mean time per move in milliseconds, or null before any move. */
  averageMs: number | null;
  /** The best (lowest) mean time of any one line, which is your pace on a good day. */
  bestLineMs: number | null;
  slowestMs: number;
};

/** How a set of speed lines went: the mean time per move, the best line's pace, and the mistakes. */
export function speedSummary(
  attempts: (Pick<SpeedAttempt, 'moves' | 'errors' | 'totalMs' | 'slowestMs'> & { hints?: number })[],
): SpeedSummary {
  const moves = attempts.reduce((sum, attempt) => sum + attempt.moves, 0);
  const paces = attempts.filter((attempt) => attempt.moves > 0).map((attempt) => attempt.totalMs / attempt.moves);
  return {
    lines: attempts.length,
    moves,
    errors: attempts.reduce((sum, attempt) => sum + attempt.errors, 0),
    hints: attempts.reduce((sum, attempt) => sum + (attempt.hints ?? 0), 0),
    averageMs: moves === 0 ? null : attempts.reduce((sum, attempt) => sum + attempt.totalMs, 0) / moves,
    bestLineMs: paces.length === 0 ? null : Math.min(...paces),
    slowestMs: attempts.reduce((worst, attempt) => Math.max(worst, attempt.slowestMs), 0),
  };
}

/** 1.4 s, or 850 ms: how a time per move reads. */
export function formatMs(ms: number | null): string {
  if (ms === null) return '–';
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** How deep a Speed line goes: up to this move number, or the whole line (0). */
export type SpeedDepth = 0 | 6 | 10 | 15;
export const SPEED_DEPTHS: readonly SpeedDepth[] = [6, 10, 15, 0];

/**
 * A line cut off after a move number, counted from the start of the game: up to move 10 keeps 1.e4 to 10...(Black's
 * tenth), so both sides' tenth moves are played. 0 keeps the whole line.
 */
export function cutToMove<T>(steps: readonly T[], move: SpeedDepth): T[] {
  return move === 0 ? [...steps] : steps.slice(0, move * 2);
}
