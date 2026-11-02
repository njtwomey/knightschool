/*
 * Where the learner left a step or follow-up, on this device: a per-viewer convenience so a click on its row continues
 * at that stage (docs/v2/patterns/interactions.md). Progress itself is never kept here; it is worked out from the log.
 */

const key = (opening: string, item: string) => `knightschool.stage:${opening}:${item}`;

/** The stage last opened for a step or follow-up, if this device remembers one. */
export function rememberedStage(opening: string, item: string): string | undefined {
  try {
    return window.localStorage.getItem(key(opening, item)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function rememberStage(opening: string, item: string, stage: string): void {
  try {
    window.localStorage.setItem(key(opening, item), stage);
  } catch {
    // Storage blocked: rows fall back to the stage the step's state suggests.
  }
}

/**
 * The stage a click on a step's row continues at: where it was left (Done goes back to Try), else Read for a step not
 * yet started and Try for one being learned or known.
 */
export function continueStage(opening: string, item: string, state: string, first: string, practise = 'try'): string {
  const left = rememberedStage(opening, item);
  if (left === 'done') return practise;
  if (left) return left;
  return state === 'open' || state === 'locked' ? first : practise;
}
