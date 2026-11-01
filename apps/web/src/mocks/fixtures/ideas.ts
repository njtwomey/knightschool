import type { Idea } from '@/components/chess/idea-badge';

/** Our ideas that the example's Lichess puzzle themes match, keyed by the theme (puzzle-card's `ideas`). */
export const PUZZLE_IDEAS: Record<string, Idea> = {
  fork: {
    id: 'fork',
    name: 'Fork',
    kind: 'tactic',
    summary: 'One piece attacks two at once, and only one can be saved.',
  },
  hangingPiece: {
    id: 'hanging-piece',
    name: 'Hanging piece',
    kind: 'tactic',
    summary: 'An undefended piece that can be taken for nothing.',
  },
  discoveredAttack: {
    id: 'discovered-attack',
    name: 'Discovered attack',
    kind: 'tactic',
    summary: 'One piece moves out of the way and uncovers an attack by the piece behind it.',
  },
  deflection: {
    id: 'deflection',
    name: 'Deflection',
    kind: 'tactic',
    summary: 'Drag a defender away from the square or piece it guards.',
  },
  kingsideAttack: {
    id: 'kingside-attack',
    name: 'Kingside attack',
    kind: 'plan',
    summary: 'Bring pieces and pawns against the castled king.',
  },
};

/** A few of the opening's own ideas, for summaries and lists. */
export const OPENING_IDEAS: Record<string, Idea> = {
  development: {
    id: 'development',
    name: 'Develop before you attack',
    kind: 'principle',
    summary: 'Bring out knights and bishops before moving a piece twice.',
  },
  centre: {
    id: 'centre',
    name: 'Control the centre',
    kind: 'principle',
    summary: 'Pawns and pieces on e4, d4, e5 and d5 give your pieces room.',
  },
  pin: {
    id: 'pin',
    name: 'Pin',
    kind: 'tactic',
    summary: 'A piece cannot move without exposing a more valuable one behind it.',
  },
};
