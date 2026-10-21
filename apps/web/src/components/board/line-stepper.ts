import { useEffect, useLayoutEffect, useRef } from 'react';

/** The four ways to move along a line: to its start, back one move, on one move, to its end. */
export type StepAction = 'first' | 'prev' | 'next' | 'last';

const KEYS: Record<string, StepAction> = { ArrowLeft: 'prev', ArrowRight: 'next', Home: 'first', End: 'last' };

/** True when the key goes into a text field (or anything editable): then it is typing, never a step. */
export function isTyping(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'defaultPrevented'> & {
  target: EventTarget | null;
};

/**
 * The step a key asks for: Left and Right one move, Home and End to the ends. Null for any other key, for a key with a
 * modifier (so browser shortcuts still work), for one something else has already handled (a menu, a radio group), and
 * while typing.
 */
export function stepKey(event: KeyLike): StepAction | null {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (isTyping(event.target)) return null;
  return KEYS[event.key] ?? null;
}

/** Where a step lands on a line of positions `min`..`length` (position n is after n moves), from `index`. */
export function stepTarget(action: StepAction, index: number, length: number, min = 0): number {
  const clamp = (n: number) => Math.max(min, Math.min(length, n));
  if (action === 'first') return min;
  if (action === 'last') return length;
  return clamp(action === 'prev' ? index - 1 : index + 1);
}

/** What a board's step buttons need: where it is, whether it can go either way, and the four steps. */
export type LineStepper = {
  index: number;
  atStart: boolean;
  atEnd: boolean;
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
  /** Names the buttons' group for a screen reader. */
  label?: string;
  /** Shown on every button while there is nothing to step through, e.g. "Pick a line to step through it". */
  disabledTitle?: string;
};

export type LineStepperOptions = {
  /** The number of moves: positions run from 0 (the start) to `length` (after the last move). */
  length: number;
  /** The position shown. */
  index: number;
  setIndex: (index: number) => void;
  /** The first position that can be stepped to (a unit that starts part-way along a line). */
  min?: number;
  /** Whether Left, Right, Home and End step too. One board on a page has them. */
  keys?: boolean;
  /** Replace a step, for a line that is more than positions and an index (Learn plays the next move, say). */
  first?: () => void;
  prev?: () => void;
  next?: () => void;
  last?: () => void;
  atStart?: boolean;
  atEnd?: boolean;
  label?: string;
  disabledTitle?: string;
};

/**
 * The one model for stepping through a line on a board: a list of positions and the index of the one shown. It gives
 * the step buttons their actions and states, and binds Left, Right, Home and End once (never while typing, with a
 * modifier, or when something else handled the key). A page with a different model maps it here with the overrides.
 */
export function useLineStepper(options: LineStepperOptions): LineStepper {
  const { length, index, setIndex, min = 0, keys = true } = options;
  const to = (action: StepAction) => () => setIndex(stepTarget(action, index, length, min));
  const stepper: LineStepper = {
    index,
    atStart: options.atStart ?? index <= min,
    atEnd: options.atEnd ?? index >= length,
    first: options.first ?? to('first'),
    prev: options.prev ?? to('prev'),
    next: options.next ?? to('next'),
    last: options.last ?? to('last'),
    label: options.label,
    disabledTitle: options.disabledTitle,
  };

  // The listener is bound once; it reads the latest steps from a ref.
  const latest = useRef(stepper);
  useLayoutEffect(() => {
    latest.current = stepper;
  });
  useEffect(() => {
    if (!keys) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = stepKey(event);
      if (!action) return;
      const current = latest.current;
      const blocked = action === 'first' || action === 'prev' ? current.atStart : current.atEnd;
      event.preventDefault();
      if (!blocked) current[action]();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keys]);

  return stepper;
}
