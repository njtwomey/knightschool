/** What each label on the Browse page means, shown on hover. One place, so cards and filters say the same thing. */
export const TIER_HINT = {
  1: 'Tier 1, study first: the openings you will meet most often. Start here.',
  2: 'Tier 2, study next: common, but less often than tier 1, or sharper. Take these once tier 1 feels comfortable.',
  3: 'Tier 3, alternatives: rare replies and second choices. Worth knowing, not worth starting with.',
} as const;

export const SIDE_HINT = {
  white: 'You play the white pieces in this course and move first.',
  black: 'You play the black pieces in this course and answer White.',
} as const;

export const ROLE_HINT = {
  play: 'You are the one choosing this opening, so you learn how to play it well.',
  against: 'Your opponent plays this opening. You learn how to meet it.',
} as const;

export const ECO_HINT = 'ECO code: the standard catalogue number for this opening, such as C50 for the Italian Game.';

export const SCOPE_HINT = {
  all: 'Show courses and single lines together.',
  courses: 'Show only whole courses.',
  lines: 'Show only single lines, one for each way the opponent can reply.',
} as const;

export const WEIGHT_HINT = {
  main: 'A main line: the reply you will meet most often. You are quizzed on it.',
  sideline: 'A sideline: less common than the main lines, but still worth knowing. Quizzed unless it is very rare.',
  rare: 'A rare line: seldom played. Left out of your quiz unless you turn on rare lines in Settings.',
  gambit: 'A gambit: a pawn is offered for faster development. You learn how to meet it, or how to play it.',
} as const;

export const TRAP_HINT = {
  trap: 'A trap: a trick where one natural-looking move loses.',
  'against-us':
    'A trap to avoid: the opponent tries a trick, and the natural move is a mistake. You learn the safe move.',
  'for-us': 'A trap you can spring: if the opponent slips, here is how to punish it. Asked as a quiz question.',
} as const;

export const PRACTICE_HINT = {
  progress: 'How many of this course’s moves you have learned so far.',
} as const;
