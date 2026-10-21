import { ListOrdered } from 'lucide-react';
import { lineHref } from '@/features/line/tabs';
import { currentUnit, nothingLeft, unitLabel, type SessionType } from './types';

/** How many moves "next three moves" asks for. */
export const NEXT_MOVES = 3;

/**
 * Next three moves: carry on with the unit being learned, from its first move not yet passed. Drilled when those moves
 * are already in the quiz, learned (every move shown) when none of them is.
 */
export const nextMoves: SessionType = {
  id: 'next-moves',
  name: `Next ${NEXT_MOVES} moves`,
  blurb: 'A short session: the next few moves of the unit you are on that are not sure yet.',
  icon: ListOrdered,
  pick({ content, path }) {
    const current = currentUnit(path);
    if (!current) return { ready: false, reason: nothingLeft(path) };
    const { unit, progress } = current;
    const start = Math.max(
      0,
      progress.moves.findIndex((move) => !move.passed && !move.graduated),
    );
    const end = Math.min(start + NEXT_MOVES, unit.cards.length);
    const fresh = progress.moves.slice(start, end).every((move) => !move.introduced);
    const first = start + 1;
    const last = end;
    return {
      ready: true,
      summary:
        first === last
          ? `Move ${first} of ${unitLabel(content, unit)}.`
          : `Moves ${first} to ${last} of ${unitLabel(content, unit)}.`,
      href: lineHref(content.opening.id, unit.line, fresh ? 'learn' : 'drill', { n: unit.n, first, last }),
    };
  },
};
