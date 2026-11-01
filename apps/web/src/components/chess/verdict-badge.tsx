import { GRADE_INFO, type Grade } from '@knightschool/core';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const TONE: Record<Grade, string> = {
  book: 'bg-verdict-book/15 text-verdict-book ring-verdict-book/30',
  best: 'bg-verdict-best/15 text-verdict-best ring-verdict-best/30',
  excellent: 'bg-verdict-excellent/15 text-verdict-excellent ring-verdict-excellent/30',
  good: 'bg-verdict-good/15 text-verdict-good ring-verdict-good/30',
  inaccuracy: 'bg-verdict-inaccuracy/15 text-verdict-inaccuracy ring-verdict-inaccuracy/40',
  mistake: 'bg-verdict-mistake/15 text-verdict-mistake ring-verdict-mistake/40',
  blunder: 'bg-verdict-blunder/15 text-verdict-blunder ring-verdict-blunder/40',
  miss: 'bg-verdict-miss/15 text-verdict-miss ring-verdict-miss/40',
};

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
            TONE[grade],
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

export const gradeText: Record<Grade, string> = {
  book: 'text-verdict-book',
  best: 'text-verdict-best',
  excellent: 'text-verdict-excellent',
  good: 'text-verdict-good',
  inaccuracy: 'text-verdict-inaccuracy',
  mistake: 'text-verdict-mistake',
  blunder: 'text-verdict-blunder',
  miss: 'text-verdict-miss',
};
