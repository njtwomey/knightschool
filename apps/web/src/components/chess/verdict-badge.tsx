import { GRADE_INFO, type Grade } from '@knightschool/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GRADE_TONE } from './grade-style';

/** A grade as its symbol and colour, with its name; the same look on the board, in tables and in feedback. */
export function VerdictBadge({
  grade,
  size = 'md',
  showName = true,
}: {
  grade: Grade;
  size?: 'sm' | 'md';
  showName?: boolean;
}) {
  const info = GRADE_INFO[grade];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset',
            size === 'sm' ? 'px-1.5 text-xs' : 'px-2 py-0.5 text-sm',
            GRADE_TONE[grade],
          )}
        >
          {info.symbol ? <span className="font-bold tabular-nums">{info.symbol}</span> : null}
          {showName || !info.symbol ? info.name : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>{info.hint}</TooltipContent>
    </Tooltip>
  );
}
