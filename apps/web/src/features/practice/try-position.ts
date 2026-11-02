import { epdToFen, moveNumber, sideToMove } from '@knightschool/core';
import type { Try } from '@/components/chess/tries-table';
import { writeBoardHash } from '@/pages/board/board-hash';
import { navigate, to } from '@/router/location';

/** The Board page at the position a try was played in, the side that played it below (a summary row's click). */
export function tryPositionHref(one: Try): string | null {
  if (!one.before) return null;
  const fen = epdToFen(one.before, 0, moveNumber(one.ply));
  return to(`/board${writeBoardHash({ fen, moves: [], ply: 0, side: sideToMove(one.before) })}`);
}

/** A summary's `onSelectTry`: opens the position of the try picked. */
export const openTry = (tries: readonly Try[]) => (index: number) => {
  const href = tryPositionHref(tries[index]!);
  if (href) navigate(href.slice(to('').length));
};
