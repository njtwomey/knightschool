import type { Grade } from '@knightschool/core';

/**
 * The one place a grade's colour is decided (docs/v2/patterns/colours.md): a solid fill (the badge on the board's
 * square, a dot), the text colour (a symbol beside a move), and the soft tone of a badge.
 */
export const GRADE_FILL: Record<Grade, string> = {
  book: 'bg-verdict-book',
  best: 'bg-verdict-best',
  excellent: 'bg-verdict-excellent',
  good: 'bg-verdict-good',
  inaccuracy: 'bg-verdict-inaccuracy',
  mistake: 'bg-verdict-mistake',
  blunder: 'bg-verdict-blunder',
  miss: 'bg-verdict-miss',
};

export const GRADE_TEXT: Record<Grade, string> = {
  book: 'text-verdict-book',
  best: 'text-verdict-best',
  excellent: 'text-verdict-excellent',
  good: 'text-verdict-good',
  inaccuracy: 'text-verdict-inaccuracy',
  mistake: 'text-verdict-mistake',
  blunder: 'text-verdict-blunder',
  miss: 'text-verdict-miss',
};

export const GRADE_TONE: Record<Grade, string> = {
  book: 'bg-verdict-book/15 text-verdict-book ring-verdict-book/30',
  best: 'bg-verdict-best/15 text-verdict-best ring-verdict-best/30',
  excellent: 'bg-verdict-excellent/15 text-verdict-excellent ring-verdict-excellent/30',
  good: 'bg-verdict-good/15 text-verdict-good ring-verdict-good/30',
  inaccuracy: 'bg-verdict-inaccuracy/15 text-verdict-inaccuracy ring-verdict-inaccuracy/40',
  mistake: 'bg-verdict-mistake/15 text-verdict-mistake ring-verdict-mistake/40',
  blunder: 'bg-verdict-blunder/15 text-verdict-blunder ring-verdict-blunder/40',
  miss: 'bg-verdict-miss/15 text-verdict-miss ring-verdict-miss/40',
};
