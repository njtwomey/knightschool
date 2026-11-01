/** The symbols a move can carry, written in PGN as NAGs; none is the empty string. */
export const MOVE_SYMBOLS = ['', '!', '!!', '!?', '?!', '?', '??'] as const;
export type MoveSymbol = (typeof MOVE_SYMBOLS)[number];
export const SYMBOL_HINT: Record<MoveSymbol, string> = {
  '': 'No symbol',
  '!': 'A good move',
  '!!': 'A brilliant move',
  '!?': 'An interesting move, worth a try',
  '?!': 'A dubious move',
  '?': 'A mistake',
  '??': 'A blunder',
};

/** v1's set of tags; any other word is allowed too. */
export const MOVE_TAGS = ['tip', 'trap', 'common blunder'] as const;

/** `ideas` are idea ids, from the ideas list (chess `Idea`). */
export type MoveNote = { comment: string; symbol: MoveSymbol; ideas: string[]; tags: string[] };
