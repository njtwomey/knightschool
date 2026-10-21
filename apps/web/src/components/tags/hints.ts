import type { LineKind, Motif, Side, TrapKind } from '@knightschool/core';

/** What each label on the Search page means, shown on hover. One place, so cards and filters say the same thing. */
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

/**
 * The line tags (from each PGN's header), one sentence per value, written for a beginner. `Risk` is about the
 * learner's own side: how badly a natural slip can cost them.
 */
export const RISK_HINT = {
  low: 'Low risk: a slip usually costs only a little time. A safe line to play while you are still learning it.',
  medium:
    'Medium risk: there are a few moves you must know. A natural-looking slip can lose a pawn or a piece, so read the notes.',
  high: 'High risk: sharp and forcing. One wrong move can lose the game quickly, so know the line well before you play it.',
} as const;

export const CHARACTER_HINT = {
  solid: 'Solid: sound and safe, with few weaknesses. Hard for the opponent to attack.',
  positional: 'Positional: the plan is about pawn structure and good squares rather than quick attacks.',
  sharp: 'Sharp: the position gets complicated quickly, and one slip can decide the game.',
  tactical: 'Tactical: the play is about concrete tricks such as forks and pins, so calculate before you move.',
  gambit: 'Gambit: a pawn (sometimes more) is offered in return for faster development or an attack.',
} as const;

export const TRICK_HINT: Record<Motif, string> = {
  trap: 'Trap: a natural-looking move in this line loses material or the game. The notes show which one.',
  fork: 'Fork: one piece attacks two things at once, so one of them is lost.',
  pin: 'Pin: a piece cannot move without exposing a more valuable piece, or the king, behind it.',
  skewer: 'Skewer: a valuable piece is attacked and, when it moves away, the piece behind it is taken.',
  'discovered-attack':
    'Discovered attack: one piece moves out of the way and uncovers an attack by the piece behind it.',
  'hanging-piece': 'Hanging piece: a piece left without a defender, which can simply be taken.',
  'back-rank': 'Back-rank mate: a rook or queen mates a king shut in behind its own pawns.',
  'queen-trap': 'Queen trap: the queen goes somewhere it cannot get out of, and is won.',
  'smothered-mate': 'Smothered mate: a knight gives mate to a king boxed in by its own pieces.',
  'early-queen': 'Early queen: a queen brought out early is chased by pieces that develop as they attack it.',
  'pawn-grab': 'Pawn grab: taking a pawn here costs time or opens lines, and the side that grabs it can be punished.',
  'castling-lost': 'Castling lost: a king is forced to move, cannot castle any more and stays in the centre.',
  'mate-threat': 'Mate threat: one side threatens mate, and the other must see it in time.',
};

/** Who has early mating chances, said from the learner's side when it is known. */
export function earlyMateHint(who: 'white' | 'black' | 'both', side?: Side): string {
  const name = (colour: Side) => (colour === side ? `you (${colour})` : colour === 'white' ? 'White' : 'Black');
  const holder = who === 'both' ? 'either side' : name(who);
  return `Mate chances: in the first 12 moves ${holder} can give mate if the other side slips. Watch the king.`;
}

/** The short label for early mating chances, from the learner's side when it is known. */
export function earlyMateLabel(who: 'white' | 'black' | 'both', side?: Side): string {
  if (who === 'both') return 'mate chances: both';
  if (!side) return `mate chances: ${who}`;
  return who === side ? 'mate chances: you' : 'mate chances: them';
}

export const PROGRESS_HINT = {
  progress: 'How many of this course’s moves you have learned so far.',
} as const;

/** What each kind of line is called, wherever a line's kind is shown or chosen. */
export const KIND_LABEL = {
  main: 'Main line',
  gambit: 'Gambit',
  sideline: 'Sideline',
  rare: 'Rare',
  'against-us': 'Trap to avoid',
  'for-us': 'Trap to spring',
} as const satisfies Record<LineKind | TrapKind, string>;

/** The kinds in the order they are offered: lines from most to least important, then the two traps. */
export const KIND_OPTIONS = (Object.keys(KIND_LABEL) as (LineKind | TrapKind)[]).map((value) => ({
  value,
  label: KIND_LABEL[value],
}));

/** A kind's name; an unknown one (from a hand-written chapter, say) is shown as it is. */
export const kindLabel = (kind: string): string => (KIND_LABEL as Record<string, string>)[kind] ?? kind;
