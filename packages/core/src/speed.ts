import type { SpeedAttempt } from './schema/user';

export type SpeedSummary = {
  lines: number;
  moves: number;
  errors: number;
  /** Mean time per move in milliseconds, or null before any move. */
  averageMs: number | null;
  /** The best (lowest) mean time of any one line, which is your pace on a good day. */
  bestLineMs: number | null;
  slowestMs: number;
};

/** How a set of speed lines went: the mean time per move, the best line's pace, and the mistakes. */
export function speedSummary(
  attempts: Pick<SpeedAttempt, 'moves' | 'errors' | 'totalMs' | 'slowestMs'>[],
): SpeedSummary {
  const moves = attempts.reduce((sum, attempt) => sum + attempt.moves, 0);
  const paces = attempts.filter((attempt) => attempt.moves > 0).map((attempt) => attempt.totalMs / attempt.moves);
  return {
    lines: attempts.length,
    moves,
    errors: attempts.reduce((sum, attempt) => sum + attempt.errors, 0),
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
