/**
 * One exercise being answered: every try is kept, in order, with its time, so the tries table and the summary can list
 * each guess (docs/v2/library/exercise.md). A sound move that is not the line's ("another") uses no try.
 */
export type TryOutcome = 'right' | 'wrong' | 'another';
export type Try = { uci: string; ms: number; outcome: TryOutcome };

export type Attempt = {
  tries: Try[];
  hint: boolean;
  shown: boolean;
  /** Finished: answered right, or the move was shown. */
  done: boolean;
};

export type AttemptAction =
  { type: 'try'; uci: string; ms: number; outcome: TryOutcome } | { type: 'hint' } | { type: 'show' };

export const startAttempt = (): Attempt => ({ tries: [], hint: false, shown: false, done: false });

/** Wrong tries so far (an "another" is not wrong). */
export const wrongTries = (attempt: Attempt) => attempt.tries.filter((one) => one.outcome === 'wrong').length;

/**
 * The next state. After `triesBeforeShown` wrong tries the move is shown (config `teach.triesBeforeShown`). Nothing
 * changes once the attempt is done.
 */
export function reduceAttempt(attempt: Attempt, action: AttemptAction, triesBeforeShown: number): Attempt {
  if (attempt.done) return attempt;
  if (action.type === 'hint') return { ...attempt, hint: true };
  if (action.type === 'show') return { ...attempt, shown: true, done: true };
  const tries = [...attempt.tries, { uci: action.uci, ms: action.ms, outcome: action.outcome }];
  const next = { ...attempt, tries };
  if (action.outcome === 'right') return { ...next, done: true };
  if (action.outcome === 'wrong' && wrongTries(next) >= triesBeforeShown) return { ...next, shown: true, done: true };
  return next;
}
