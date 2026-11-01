import { GRADE_INFO, numberedMove, type Grade } from '@knightschool/core';
import { cn } from '@/lib/utils';
import { MoveRun, type RunMove } from './move-run';
import { VerdictBadge } from './verdict-badge';

/**
 * The one-line why: the grade, what it cost, and the punishing reply ("A mistake: after ...Nxg5 the knight is lost").
 */
export function VerdictNote({
  grade,
  ply,
  san,
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
  costCp?: number;
  because?: string;
  refutation?: RunMove[];
  refutationPly?: number;
  /** The line's own move, when the move played was not it. */
  lineMove?: string;
  className?: string;
}) {
  const info = GRADE_INFO[grade];
  const sound = grade === 'best' || grade === 'excellent' || grade === 'good';
  return (
    <div className={cn('grid gap-1.5 text-sm', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono font-semibold">
          {numberedMove(ply, san)}
          {info.symbol}
        </span>
        <VerdictBadge grade={grade} size="sm" />
        {costCp !== undefined && costCp > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">costs {(costCp / 100).toFixed(1)}</span>
        ) : null}
      </div>
      {because ? <p className="text-muted-foreground">{because}</p> : null}
      {sound && lineMove ? (
        <p className="text-muted-foreground">
          A sound move, but not your repertoire move. The line plays <span className="font-mono">{lineMove}</span>.
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
