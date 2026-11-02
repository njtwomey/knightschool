import { formatPawns, type Grade } from '@knightschool/core';
import { cn } from '@/lib/utils';
import { MoveChip } from './move-chip';
import { MoveRun, type RunMove } from './move-run';
import { VerdictBadge } from './verdict-badge';

/**
 * The one-line why: the grade, what it cost, and the punishing reply ("A mistake: after ...Nxg5 the knight is lost").
 */
export function VerdictNote({
  grade,
  ply,
  san,
  epd,
  from,
  to,
  costCp,
  because,
  refutation,
  refutationPly,
  lineMove,
  className,
}: {
  grade: Grade;
  ply: number;
  san: string;
  /** The position after the move and its squares, so the move previews and shows on the board. */
  epd?: string;
  from?: string;
  to?: string;
  costCp?: number;
  because?: string;
  refutation?: RunMove[];
  refutationPly?: number;
  /** The line's own move, when the move played was not it. */
  lineMove?: string;
  className?: string;
}) {
  const sound = grade === 'best' || grade === 'excellent' || grade === 'good';
  return (
    <div className={cn('grid gap-1.5 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <MoveChip ply={ply} san={san} epd={epd} from={from} to={to} mine />
        <VerdictBadge grade={grade} size="sm" />
        {costCp !== undefined && costCp > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            costs {formatPawns(costCp, { signed: false })}
          </span>
        ) : null}
      </div>
      {because ? <p className="text-muted-foreground">{because}</p> : null}
      {sound && lineMove ? (
        <p className="text-muted-foreground">
          A sound move, but not your repertoire move. The line plays <MoveChip ply={ply} san={lineMove} mine />.
        </p>
      ) : null}
      {refutation && refutation.length > 0 ? (
        <p className="flex flex-wrap items-baseline gap-1 text-muted-foreground">
          <span>The punishment:</span>
          <MoveRun moves={refutation} firstPly={refutationPly ?? ply + 1} />
        </p>
      ) : null}
    </div>
  );
}
