import { Check, Flame } from 'lucide-react';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';

export type StreakProps = {
  /** Days in a row with a graded answer, today included once something is answered. */
  days: number;
  longest: number;
  doneToday: boolean;
  /** The day the streak began, in words: "Monday", "14 October". */
  since?: string;
  /** `chip`: the header, beside coverage; `full`: Today, Stats. */
  form?: 'chip' | 'full';
  /** `progress.showStreak`: off hides it entirely. */
  show?: boolean;
  /** Stats, scrolled to the activity calendar. */
  href?: string;
  className?: string;
};

const dayCount = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

/**
 * Days in a row practised, kept light: a number and a small flame, nothing to buy, lose or win
 * (docs/v2/components/streak.md). Derived from the answer log; a missed day simply restarts it, with no message.
 */
export function Streak({ days, longest, doneToday, since, form = 'chip', show = true, href, className }: StreakProps) {
  if (!show) return null;

  if (form === 'chip') {
    // A "0 days" chip nags, so a streak of nothing shows nothing.
    if (days === 0) return null;
    const hint = doneToday
      ? `${dayCount(days)} in a row. Done for today.`
      : `${dayCount(days)} in a row. Answer one review today to make it ${days + 1}.`;
    const look = cn(
      'inline-flex h-7 items-center gap-1 rounded-full px-2 text-sm font-medium tabular-nums no-underline text-foreground',
      'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
      className,
    );
    const body = (
      <>
        <Flame className={cn('size-4', doneToday ? 'text-mode-puzzle' : 'text-muted-foreground')} aria-hidden />
        {days}
        <span className="sr-only"> {days === 1 ? 'day' : 'days'} in a row</span>
      </>
    );
    return (
      <Hint text={hint}>
        {href ? (
          <a href={href} className={look} aria-label={hint}>
            {body}
          </a>
        ) : (
          <span tabIndex={0} className={look} aria-label={hint}>
            {body}
          </span>
        )}
      </Hint>
    );
  }

  if (days === 0) {
    return (
      <div className={cn('grid gap-1', className)}>
        <p className="flex items-center gap-2 font-medium">
          <Flame className="size-5 text-muted-foreground" aria-hidden /> Start a streak: answer one review
        </p>
        {longest ? <p className="text-sm text-muted-foreground">Longest: {dayCount(longest)}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-1', className)}>
      <p className="flex items-center gap-2">
        <Flame className={cn('size-6', doneToday ? 'text-mode-puzzle' : 'text-muted-foreground')} aria-hidden />
        <span className="text-2xl font-semibold tabular-nums">{days}</span>
        <span className="text-muted-foreground">{days === 1 ? 'day' : 'days'} in a row</span>
      </p>
      {since ? <p className="text-sm">Practised every day since {since}</p> : null}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {doneToday ? (
          <span className="inline-flex items-center gap-1">
            <Check className="size-4 text-state-known" aria-hidden /> Done today
          </span>
        ) : (
          <span className="text-muted-foreground">Not yet today</span>
        )}
        <span className="text-muted-foreground">Longest: {dayCount(Math.max(longest, days))}</span>
      </p>
    </div>
  );
}
