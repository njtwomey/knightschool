import { pickWeighted } from '../exercise/exercise';

/** What a session draws on: a shipped puzzle's rating, how it was matched, and how often it has been played. */
export type DrawablePuzzle = { id: string; rating: number; level: string; plays?: number };

export type DrawOptions = {
  count: number;
  /** The learner's range (`puzzles.rating`, or the set-up's). */
  rating: readonly [number, number];
  /** Outside the range, the chance halves every this many points (`puzzles.ratingFalloff`). */
  falloff: number;
  /** Match levels, strongest first (`puzzles.levels`): a stronger level is drawn from before a weaker one. */
  levels: readonly string[];
  /** `popular` favours puzzles played more often. */
  weighting: 'random' | 'popular';
  /** Puzzles already met (they have a card): drawn only when the new ones run out. */
  seen?: ReadonlySet<string>;
  random: () => number;
};

/** How far outside the range a rating is, in points (0 inside it). */
export const outsideRange = (rating: number, [low, high]: readonly [number, number]): number =>
  rating < low ? low - rating : rating > high ? rating - high : 0;

/**
 * The puzzles of one session (docs/v2/pages/puzzles.md). Draws in tiers, each tier walking the levels strongest first
 * so an opening's own puzzles (its variation, then its family) come before those matched by structure or idea: new
 * puzzles inside the rating range, then ones already met inside it, then the rest, nearer the range more likely. Within
 * a level the draw is weighted (by plays when favouring popular). The result is in the order drawn; the weakest level
 * used says how closely the session matched.
 */
export function drawPuzzles<T extends DrawablePuzzle>(puzzles: readonly T[], options: DrawOptions): T[] {
  const inRange = (puzzle: T) => outsideRange(puzzle.rating, options.rating) === 0;
  const isSeen = (puzzle: T) => options.seen?.has(puzzle.id) ?? false;
  const tiers: ((puzzle: T) => boolean)[] = [
    (puzzle) => inRange(puzzle) && !isSeen(puzzle),
    (puzzle) => inRange(puzzle) && isSeen(puzzle),
    (puzzle) => !inRange(puzzle),
  ];
  const levelRank = (level: string) => {
    const index = options.levels.indexOf(level);
    return index < 0 ? options.levels.length : index;
  };
  const ranks = [...new Set(puzzles.map((puzzle) => levelRank(puzzle.level)))].sort((a, b) => a - b);
  const weight = (puzzle: T) =>
    (options.weighting === 'popular' ? Math.log10(10 + (puzzle.plays ?? 0)) : 1) *
    0.5 ** (outsideRange(puzzle.rating, options.rating) / options.falloff);

  const chosen: T[] = [];
  const taken = new Set<string>();
  for (const tier of tiers) {
    for (const rank of ranks) {
      const pool = puzzles.filter(
        (puzzle) => !taken.has(puzzle.id) && tier(puzzle) && levelRank(puzzle.level) === rank,
      );
      while (pool.length > 0 && chosen.length < options.count) {
        const pick = pickWeighted(
          pool.map((puzzle) => ({ puzzle, weight: weight(puzzle) })),
          options.random(),
        )!.puzzle;
        chosen.push(pick);
        taken.add(pick.id);
        pool.splice(pool.indexOf(pick), 1);
      }
      if (chosen.length >= options.count) return chosen;
    }
  }
  return chosen;
}
