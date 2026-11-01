/**
 * Arrows and rings on the board, written in PGN as `[%cal Gc4f7]` and `[%csl Yd5]`. Each colour means one thing
 * everywhere.
 */
export const MARK_COLOURS = ['G', 'R', 'Y', 'B'] as const;
export type MarkColour = (typeof MARK_COLOURS)[number];

export const MARK_MEANINGS: Record<MarkColour, { name: string; hint: string }> = {
  G: { name: 'Idea', hint: 'The plan or a good move: where a piece is going and what it aims at.' },
  R: { name: 'Threat', hint: 'Danger: what the other side threatens, a trap, a pin against you.' },
  Y: { name: 'Target', hint: 'A weak square or pawn: something to aim at, or to watch.' },
  B: { name: 'Support', hint: 'Pieces working together: a defender, a battery, a piece covering a square.' },
};

export type Arrow = { colour: MarkColour; from: string; to: string };
export type Ring = { colour: MarkColour; square: string };
export type Marks = { arrows: string[]; circles: string[] };

const SQUARE = '[a-h][1-8]';
const ARROW = new RegExp(`^([GRYB])(${SQUARE})(${SQUARE})$`);
const RING = new RegExp(`^([GRYB])(${SQUARE})$`);

export function parseArrow(text: string): Arrow | null {
  const match = ARROW.exec(text);
  if (!match || match[2] === match[3]) return null;
  return { colour: match[1] as MarkColour, from: match[2]!, to: match[3]! };
}

export function parseRing(text: string): Ring | null {
  const match = RING.exec(text);
  return match ? { colour: match[1] as MarkColour, square: match[2]! } : null;
}

/** The colours present in some marks, in key order, for a key under the board. */
export function markColours(marks: Partial<Marks> | undefined): MarkColour[] {
  const present = new Set<MarkColour>();
  for (const text of marks?.arrows ?? []) {
    const arrow = parseArrow(text);
    if (arrow) present.add(arrow.colour);
  }
  for (const text of marks?.circles ?? []) {
    const ring = parseRing(text);
    if (ring) present.add(ring.colour);
  }
  return MARK_COLOURS.filter((colour) => present.has(colour));
}
