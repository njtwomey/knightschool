import type { MarkColour } from './marks';

/**
 * Icons drawn on squares, written in PGN as `[%icon pin@f6,fork@e5]`. A fixed vocabulary, each with one meaning and
 * the mark colour that fits it, so an icon reads the same in every opening.
 */
export const SQUARE_ICONS = {
  pin: { name: 'Pin', colour: 'R', hint: 'Pinned: it cannot move without exposing what stands behind it.' },
  fork: { name: 'Fork', colour: 'R', hint: 'One piece attacks two at once, and only one can be saved.' },
  hanging: { name: 'Hanging', colour: 'R', hint: 'Undefended: it can be taken for nothing.' },
  attack: { name: 'Attacked', colour: 'R', hint: 'Under attack and needs looking after.' },
  check: { name: 'Check', colour: 'R', hint: 'The king is in check, or a check is coming here.' },
  mate: { name: 'Mate', colour: 'R', hint: 'Checkmate on this square.' },
  trap: { name: 'Trap', colour: 'R', hint: 'A trap is set here.' },
  weak: { name: 'Weak', colour: 'Y', hint: 'A weak square or pawn: hard to defend, worth aiming at.' },
  key: { name: 'Key square', colour: 'Y', hint: 'The square the play turns on.' },
  outpost: { name: 'Outpost', colour: 'G', hint: 'No enemy pawn can attack it: a good home for a piece.' },
  defended: { name: 'Defended', colour: 'B', hint: 'Guarded: taking it costs the attacker.' },
} as const satisfies Record<string, { name: string; colour: MarkColour; hint: string }>;

export type SquareIcon = keyof typeof SQUARE_ICONS;
export type IconMark = { icon: SquareIcon; square: string };

const ICON = /^([a-z]+)@([a-h][1-8])$/;

/** `pin@f6` as an icon on a square, or null when the icon is not in the vocabulary or the square is not real. */
export function parseIcon(text: string): IconMark | null {
  const match = ICON.exec(text);
  if (!match || !(match[1]! in SQUARE_ICONS)) return null;
  return { icon: match[1] as SquareIcon, square: match[2]! };
}
