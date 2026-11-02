/*
 * Where the learner left a step, follow-up or line, on this device: a per-viewer convenience so a click on its row
 * continues at that stage (docs/v2/patterns/interactions.md). Progress itself is never kept here; it is worked out from
 * the log.
 */

/** The stages of the Learn flow, in the order config `teach.stages` gives them. */
export type Stage = 'learn' | 'try' | 'done';

/** Names from before the Learn flow: Read and Watch (and a follow-up's Show) became Learn. */
const OLD_NAMES: Record<string, Stage> = { read: 'learn', watch: 'learn', show: 'learn' };

/** A stage named in an address or kept on this device, with the old names mapped; undefined for anything else. */
export function stageOf(name: string | null | undefined): Stage | undefined {
  if (!name) return undefined;
  if (name === 'learn' || name === 'try' || name === 'done') return name;
  return OLD_NAMES[name];
}

const key = (opening: string, item: string) => `knightschool.stage:${opening}:${item}`;

/** The stage last opened for a step, follow-up or line, if this device remembers one. */
export function rememberedStage(opening: string, item: string): Stage | undefined {
  try {
    return stageOf(window.localStorage.getItem(key(opening, item)));
  } catch {
    return undefined;
  }
}

export function rememberStage(opening: string, item: string, stage: Stage): void {
  try {
    window.localStorage.setItem(key(opening, item), stage);
  } catch {
    // Storage blocked: rows fall back to the stage the step's state suggests.
  }
}

/**
 * The stage a click on a step's row continues at: where it was left (Done goes back to Try), else Learn for a step not
 * yet started and Try for one being learned or known.
 */
export function continueStage(opening: string, item: string, state: string): Stage {
  const left = rememberedStage(opening, item);
  if (left === 'done') return 'try';
  if (left) return left;
  return state === 'open' || state === 'locked' ? 'learn' : 'try';
}
