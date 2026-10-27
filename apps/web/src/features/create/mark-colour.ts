import type { MarkColour } from '@knightschool/core';
import type { MarkKeys } from '@/components/board/app-board';

/**
 * The colour a mark is drawn in: the one picked, or, as on Lichess, Shift for a threat, Alt for support and both for a
 * target, so marks can be drawn without leaving the board.
 */
export function markColourFor(picked: MarkColour, keys: MarkKeys): MarkColour {
  if (keys.shift && keys.alt) return 'Y';
  if (keys.shift) return 'R';
  if (keys.alt) return 'B';
  return picked;
}
