import type { OpeningContent, UnitProgress, UnitStretch } from '@knightschool/core';
import { MoveList, type MoveListMove } from '@/components/move-list';
import { stretchMoves } from './unit-text';

/** A unit's stretch as numbered moves, the unit's own moves in bold, after the last two moves that lead to it. */
export function StretchMoves({
  content,
  stretch,
  progress,
}: {
  content: OpeningContent;
  stretch: UnitStretch;
  progress?: UnitProgress;
}) {
  const { lead, own } = stretchMoves(content, stretch);
  const passedPlies = new Set(
    stretch.plies.filter((_, i) => progress?.moves[i]?.passed || progress?.moves[i]?.graduated),
  );
  return (
    <p className="text-sm">
      <MoveList
        layout="inline"
        truncated={lead.length > 2}
        moves={[
          ...lead.slice(-2).map((move): MoveListMove => ({ ...move, state: 'lead' })),
          ...own.map((move): MoveListMove => ({
            ...move,
            state: !move.core ? 'played' : passedPlies.has(move.ply) ? 'done' : 'core',
          })),
        ]}
      />
    </p>
  );
}
