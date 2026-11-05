import { chosenSteps, tickState, toggleSteps, type TickState } from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import { useCallback, useMemo } from 'react';
import { getSetting, setSetting, useSetting } from '@/data/settings';

const SUFFIX = 'your repertoire';

/** Whether a settings change is a tick, for the Undo that follows one (`TickUndo`). */
export const isTickChange = (label: string) => label.endsWith(SUFFIX);

export const tickLabel = (on: boolean, name: string) =>
  `${on ? 'Added' : 'Took'} ${name} ${on ? 'to' : 'off'} ${SUFFIX}`;

/** Writes the learner's picks: undoable like any setting, and every tick on the page follows. */
export const savePicks = (picks: string[], label: string) => setSetting('repertoire', picks, { label });

export type Ticks = {
  /** How much of a group of steps is ticked. */
  stateOf: (stepIds: readonly string[]) => TickState;
  /** One click: every step on when any is off, else every step off. `name` words the Undo. */
  toggle: (stepIds: readonly string[], name: string) => void;
};

/** The ticks of one opening (docs/v2/stores/repertoire.md). */
export function useTicks(opening: BuiltOpening): Ticks {
  const { value: picks } = useSetting('repertoire');
  const chosen = useMemo(() => new Set(chosenSteps(opening, picks).map((step) => step.id)), [opening, picks]);
  const stateOf = useCallback((stepIds: readonly string[]) => tickState(chosen, stepIds), [chosen]);
  const toggle = useCallback(
    (stepIds: readonly string[], name: string) => {
      savePicks(toggleSteps(opening, getSetting('repertoire'), stepIds), tickLabel(stateOf(stepIds) !== 'all', name));
    },
    [opening, stateOf],
  );
  return useMemo(() => ({ stateOf, toggle }), [stateOf, toggle]);
}
