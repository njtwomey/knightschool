import type { BuiltOpening } from '../content/build-opening';
import type { Exercise } from '../exercise/exercise';
import { drillScope, scopePositions } from './drill';
import { moveExercise, moveInto } from './review';

/** What a checkpoint's result is recorded under in the attempts log (mode `checkpoint`). */
export const checkpointRef = (opening: string, variation: string) => `checkpoint:${opening}:${variation}`;

/** Shuffles a copy with a random source in [0, 1), so a seeded source gives the same order each time. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * A variation's checkpoint (docs/v2/pages/checkpoint.md): each of its learner positions once, in shuffled order, as a
 * single-move exercise with `tries` tries (config `teach.checkpointTries`) and no help.
 */
export function checkpointExercises(
  opening: BuiltOpening,
  variation: string,
  random: () => number,
  tries: number,
): Exercise[] {
  const positions = scopePositions(drillScope(opening, variation));
  return shuffled(positions, random).map((card) =>
    moveExercise(card, { mode: 'checkpoint', before: moveInto(opening, card.epd), tries, help: false }),
  );
}

/** Whether a checkpoint is cleared: at least `mark` (config `teach.checkpointMark`) of its exercises answered right. */
export function checkpointCleared(results: readonly { right: boolean }[], mark: number): boolean {
  if (!results.length) return false;
  return results.filter((result) => result.right).length / results.length >= mark - 1e-9;
}
