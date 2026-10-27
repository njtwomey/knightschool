/**
 * Marks drawn on the board for a move: arrows and rings, written in the move's PGN comment the way Lichess and ChessBase
 * write them, `[%cal Gc3d5,Rf6e4]` and `[%csl Yd5]`, a colour letter then the squares. The four colours each mean one
 * thing everywhere, so a learner can read a board at a glance.
 */

export const MARK_COLOURS = ['G', 'R', 'Y', 'B'] as const;
export type MarkColour = (typeof MARK_COLOURS)[number];

/** What each colour means. The order is the order of the key under a board. */
export const MARK_MEANINGS: Record<MarkColour, { name: string; hint: string }> = {
  G: { name: 'Idea', hint: 'The plan or a good move: where a piece is going and what it aims at.' },
  R: { name: 'Threat', hint: 'Danger: what the other side threatens, a trap, a pin against you.' },
  Y: { name: 'Target', hint: 'A weak square or pawn: something to aim at, or to watch.' },
  B: { name: 'Support', hint: 'Pieces working together: a defender, a battery, a piece covering a square.' },
};

export type Marks = { arrows: string[]; circles: string[] };

export type ArrowMark = { colour: MarkColour; from: string; to: string };
export type CircleMark = { colour: MarkColour; square: string };

const SQUARE = '[a-h][1-8]';
const ARROW = new RegExp(`^([GRYB])(${SQUARE})(${SQUARE})$`);
const CIRCLE = new RegExp(`^([GRYB])(${SQUARE})$`);

/** 'Gc3d5' to its colour and squares; undefined for anything else. */
export function parseArrow(mark: string): ArrowMark | undefined {
  const match = ARROW.exec(mark);
  if (!match || match[2] === match[3]) return undefined;
  return { colour: match[1] as MarkColour, from: match[2]!, to: match[3]! };
}

/** 'Yd5' to its colour and square; undefined for anything else. */
export function parseCircle(mark: string): CircleMark | undefined {
  const match = CIRCLE.exec(mark);
  return match ? { colour: match[1] as MarkColour, square: match[2]! } : undefined;
}

/** The marks that are well formed, each once. */
export function cleanMarks(marks: Marks): Marks {
  return {
    arrows: [...new Set(marks.arrows.filter((mark) => parseArrow(mark)))],
    circles: [...new Set(marks.circles.filter((mark) => parseCircle(mark)))],
  };
}

/**
 * Draws an arrow, as on Lichess: the same arrow again takes it away, an arrow between the same squares in another
 * colour changes colour.
 */
export function toggleArrow(marks: Marks, colour: MarkColour, from: string, to: string): Marks {
  const same = (mark: string) => {
    const arrow = parseArrow(mark);
    return arrow?.from === from && arrow.to === to;
  };
  const existing = marks.arrows.find(same);
  const rest = marks.arrows.filter((mark) => !same(mark));
  const drawn = `${colour}${from}${to}`;
  return { ...marks, arrows: existing === drawn ? rest : [...rest, drawn] };
}

/** Rings a square, or takes the ring away, or changes its colour, like `toggleArrow`. */
export function toggleCircle(marks: Marks, colour: MarkColour, square: string): Marks {
  const same = (mark: string) => parseCircle(mark)?.square === square;
  const existing = marks.circles.find(same);
  const rest = marks.circles.filter((mark) => !same(mark));
  const drawn = `${colour}${square}`;
  return { ...marks, circles: existing === drawn ? rest : [...rest, drawn] };
}

/** The colours the marks use, in the key's order. */
export function markColours(marks: Partial<Marks> | undefined): MarkColour[] {
  const used = new Set(
    [...(marks?.arrows ?? []).map(parseArrow), ...(marks?.circles ?? []).map(parseCircle)].map((mark) => mark?.colour),
  );
  return MARK_COLOURS.filter((colour) => used.has(colour));
}
