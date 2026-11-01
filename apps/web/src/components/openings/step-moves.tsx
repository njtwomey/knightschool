import { Check } from 'lucide-react';
import { MoveChip } from '@/components/chess/move-chip';
import type { RunMove } from '@/components/chess/move-run';
import { cn } from '@/lib/utils';
import type { Side } from './types';

/** A stretch of a step: the moves it adds, from `firstPly`. */
export type Stretch = { moves: RunMove[]; firstPly: number };

/**
 * A step's moves as one run: the moves leading in, greyed, then the step's own, the learner's in bold and ticked once
 * known (docs/v2/components/step-row.md).
 */
export function StepMoves({
  lead,
  stretch,
  side,
  known = [],
  onHover,
  className,
}: {
  /** The last moves before the stretch, shown greyed for context. */
  lead?: Stretch;
  stretch: Stretch;
  side: Side;
  /** Plies of the learner's moves that are known: ticked. */
  known?: number[];
  onHover?: (move: RunMove | null) => void;
  className?: string;
}) {
  const orientation = side;
  const mine = (ply: number) => (ply % 2 === 0) === (side === 'white');
  const chip = (move: RunMove, ply: number, first: boolean, own: boolean) => (
    <span key={`${ply}-${move.uci}`} className="inline-flex items-baseline">
      <MoveChip
        ply={ply}
        san={move.san}
        epd={move.after}
        from={move.uci.slice(0, 2)}
        to={move.uci.slice(2, 4)}
        mine={own && mine(ply)}
        numbered={first ? 'always' : 'white'}
        orientation={orientation}
        onHover={onHover ? (hovering) => onHover(hovering ? move : null) : undefined}
      />
      {own && mine(ply) && known.includes(ply) ? (
        <Check className="size-3 self-center text-state-known" aria-label="known" />
      ) : null}
    </span>
  );
  const leadMoves = lead?.moves ?? [];
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-0.5 gap-y-1', className)}>
      {leadMoves.length ? (
        <span className="inline-flex flex-wrap items-baseline text-muted-foreground opacity-70">
          {leadMoves.map((move, i) => chip(move, lead!.firstPly + i, i === 0, false))}
        </span>
      ) : null}
      {stretch.moves.map((move, i) => {
        const ply = stretch.firstPly + i;
        // After the greyed moves the run carries on, so only a stretch with no lead numbers its first move.
        return chip(move, ply, i === 0 && !leadMoves.length, true);
      })}
    </span>
  );
}
