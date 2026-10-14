import { EASY_WITHIN_MS } from './constants';

export type RatingName = 'again' | 'hard' | 'good' | 'easy';

export type AttemptSummary = {
  correct: boolean; // the learner found the move (not shown to them)
  wrongTries: number;
  hintUsed: boolean;
  msToAnswer: number;
};

/**
 * Automatic grading, because beginners do not grade themselves well:
 *   correct, under 5 s, no hint            Easy
 *   correct, no hint                       Good
 *   correct after a hint or one wrong try  Hard
 *   wrong twice, or the move was shown     Again
 */
export function autoGrade({ correct, wrongTries, hintUsed, msToAnswer }: AttemptSummary): RatingName {
  if (!correct) return 'again';
  if (hintUsed || wrongTries > 0) return 'hard';
  return msToAnswer < EASY_WITHIN_MS ? 'easy' : 'good';
}
