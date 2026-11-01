import type { GradeCutoffs } from '../config/site-config';
import type { Cost } from '../eval/score';

/** How good a move was, in the words beginners know from Chess.com's Game Review (no "Brilliant"). */
export type Grade = 'book' | 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'miss';

export const GRADES: readonly Grade[] = [
  'book',
  'best',
  'excellent',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
  'miss',
];

export const GRADE_INFO: Record<Grade, { name: string; symbol: string | null; hint: string }> = {
  book: { name: 'Book', symbol: null, hint: 'The move the line plays.' },
  best: { name: 'Best', symbol: '!', hint: 'The engine’s first choice, or as good as it.' },
  excellent: { name: 'Excellent', symbol: null, hint: 'Almost as good as the best move.' },
  good: { name: 'Good', symbol: null, hint: 'A sound move that gives a little away.' },
  inaccuracy: { name: 'Inaccuracy', symbol: '?!', hint: 'Not a disaster, but a better move was there.' },
  mistake: { name: 'Mistake', symbol: '?', hint: 'Gives away a real part of the advantage.' },
  blunder: { name: 'Blunder', symbol: '??', hint: 'Throws the position away.' },
  miss: { name: 'Miss', symbol: null, hint: 'A win or a punishment was there, and was not found.' },
};

/** The grade for a move from its cost, when it is not the line's own move; cut-offs from config `judge.grades`. */
export function gradeOf(cost: Pick<Cost, 'drop' | 'mate'>, cutoffs: GradeCutoffs): Grade {
  if (cost.mate === 'allowed') return 'blunder';
  if (cost.drop <= cutoffs.best) return 'best';
  if (cost.drop < cutoffs.excellent) return 'excellent';
  if (cost.drop < cutoffs.good) return 'good';
  if (cost.drop < cutoffs.inaccuracy) return 'inaccuracy';
  if (cost.drop < cutoffs.mistake) return 'mistake';
  return 'blunder';
}

/** Grades that are wrong enough to show as a mistake made, not a sound alternative. */
export const isError = (grade: Grade) => grade === 'inaccuracy' || grade === 'mistake' || grade === 'blunder';
