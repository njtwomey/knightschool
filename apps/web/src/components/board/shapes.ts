import { parseArrow, parseCircle, type MarkColour, type Marks } from '@knightschool/core';
import type { CSSProperties } from 'react';

/** An arrow on the board, as react-chessboard draws it. */
export type BoardArrow = { startSquare: string; endSquare: string; color: string };

/** A tick or cross on a square, for a right or a wrong answer. */
export type BoardBadge = { square: string; kind: 'correct' | 'wrong' };

/**
 * What an arrow drawn from a move means: `answer` the move to play (the course's move, a shown move), `candidate` one
 * of several moves on offer (fainter), `played` a move that was wrong.
 */
export type ArrowTone = 'answer' | 'candidate' | 'played';

// Board arrows take a colour string, not a class.
const TONES: Record<ArrowTone, string> = {
  answer: 'rgb(21 128 61 / 0.85)',
  candidate: 'rgb(21 128 61 / 0.55)',
  played: 'rgb(220 38 38 / 0.8)',
};

/** An arrow along a UCI move ('e2e4', 'e7e8q'), in the colour of its tone. */
export function uciArrow(uci: string, tone: ArrowTone = 'answer'): BoardArrow {
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color: TONES[tone] };
}

/** The colour of each kind of mark (`MARK_MEANINGS` in core says what each means). Shared with the key under a board. */
export const MARK_RGB: Record<MarkColour, string> = {
  G: 'rgb(21 128 61 / 0.85)',
  R: 'rgb(185 28 28 / 0.85)',
  Y: 'rgb(202 138 4 / 0.9)',
  B: 'rgb(29 78 216 / 0.85)',
};

/** A move's marks as the board draws them: arrows, and rings round squares. Malformed marks are skipped. */
export function marksOnBoard(marks: Partial<Marks> | undefined): {
  arrows: BoardArrow[];
  squareStyles: Record<string, CSSProperties>;
} {
  const arrows = (marks?.arrows ?? []).flatMap((mark) => {
    const arrow = parseArrow(mark);
    return arrow ? [{ startSquare: arrow.from, endSquare: arrow.to, color: MARK_RGB[arrow.colour] }] : [];
  });
  const squareStyles: Record<string, CSSProperties> = {};
  for (const mark of marks?.circles ?? []) {
    const circle = parseCircle(mark);
    if (circle) squareStyles[circle.square] = { boxShadow: `inset 0 0 0 4px ${MARK_RGB[circle.colour]}` };
  }
  return { arrows, squareStyles };
}
