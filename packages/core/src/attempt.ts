import { autoGrade, type RatingName } from './grading';

/** One learner answering one card. Pure, so the Train screen only has to render it. */
export type Attempt = {
  status: 'asking' | 'done';
  wrongTries: number;
  hintUsed: boolean;
  /** The right move has been revealed (asked for, or after two wrong moves). */
  shown: boolean;
  /** The learner found the move. */
  correct: boolean;
  /** The last move the learner tried (UCI), for the review log. */
  playedUci: string | null;
  msToAnswer: number | null;
  rating: RatingName | null;
};

export type AttemptAction = { type: 'move'; uci: string; elapsedMs: number } | { type: 'hint' } | { type: 'show' };

export const WRONG_TRIES_ALLOWED = 2;

export const startAttempt = (): Attempt => ({
  status: 'asking',
  wrongTries: 0,
  hintUsed: false,
  shown: false,
  correct: false,
  playedUci: null,
  msToAnswer: null,
  rating: null,
});

function finish(attempt: Attempt, elapsedMs: number): Attempt {
  return {
    ...attempt,
    status: 'done',
    msToAnswer: elapsedMs,
    rating: autoGrade({
      // A move that had to be shown counts as missed, even once the learner plays it.
      correct: attempt.correct && !attempt.shown,
      wrongTries: attempt.wrongTries,
      hintUsed: attempt.hintUsed,
      msToAnswer: elapsedMs,
    }),
  };
}

/**
 * Nothing here asks the learner to acknowledge anything. A wrong move is refused and they try again. After two wrong
 * moves, or "show me", the right move is revealed (`shown`) and the attempt stays open until they play it, so the
 * line always moves forward by playing, never by pressing Next.
 */
export function reduceAttempt(attempt: Attempt, action: AttemptAction, expectedUci: string): Attempt {
  if (attempt.status === 'done') return attempt;
  switch (action.type) {
    case 'hint':
      return { ...attempt, hintUsed: true };
    case 'show':
      return { ...attempt, shown: true };
    case 'move': {
      const next = { ...attempt, playedUci: action.uci };
      if (action.uci === expectedUci) return finish({ ...next, correct: true }, action.elapsedMs);
      const wrongTries = attempt.wrongTries + 1;
      return { ...next, wrongTries, shown: attempt.shown || wrongTries >= WRONG_TRIES_ALLOWED };
    }
  }
}
