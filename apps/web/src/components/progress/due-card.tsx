import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Hint } from '@/components/shared/hint';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { ABOVE_ROW_LINK, ABOVE_ROW_LINK_GROUP, CardLink, LINKED_CARD } from '@/components/shared/card-link';

export type DueOpening = { name: string; count: number; href: string };

export type DueCardProps = {
  /** Moves, questions and puzzles due now. */
  due: number;
  /** The estimate, from the learner's average time per answer. */
  minutes: number;
  byOpening?: DueOpening[];
  /** Shown when there are several kinds. */
  byKind?: { moves: number; questions?: number; puzzles?: number };
  /** New moves waiting today, from the daily allowance. */
  newToday?: number;
  /** When the next one falls, once nothing is due: "in 3 hours", "tomorrow morning". */
  nextDue?: string;
  /** `review.sessionSize`. */
  sessionSize?: number;
  /** The scheduled session, started at once (`#start=due`). */
  href: string;
  /** Free practice, which never changes the schedule. */
  practiseHref?: string;
  /** `card`, or `inline`: one line for the header menu and the opening card. */
  form?: 'card' | 'inline';
  /** `review.order`, worded on the button's hint. */
  order?: 'due first' | 'by opening' | 'mixed';
  loading?: boolean;
  className?: string;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ESTIMATE_HINT = 'From your average time per answer over the last two weeks.';

function kinds(byKind: DueCardProps['byKind']): string | null {
  if (!byKind) return null;
  const parts = [
    byKind.moves ? plural(byKind.moves, 'move') : null,
    byKind.questions ? plural(byKind.questions, 'question') : null,
    byKind.puzzles ? plural(byKind.puzzles, 'puzzle') : null,
  ].filter(Boolean);
  return parts.length > 1 ? parts.join(', ') : null;
}

/**
 * The reviews due now, how long they will take, and one button into them (docs/v2/components/due-card.md). Nothing
 * due turns it quiet; many due never turns it alarming.
 */
export function DueCard({
  due,
  minutes,
  byOpening = [],
  byKind,
  newToday,
  nextDue,
  sessionSize = siteConfig.schedule.sessionSize.default,
  href,
  practiseHref,
  form = 'card',
  order = 'due first',
  loading,
  className,
}: DueCardProps) {
  const label = due > sessionSize ? `Review ${sessionSize} of ${due}` : 'Review now';
  const orderHint =
    order === 'due first'
      ? 'Starts at once, the most overdue first.'
      : order === 'by opening'
        ? 'Starts at once, one opening at a time.'
        : 'Starts at once, your openings mixed together.';
  const button = (size: 'sm' | 'default') => (
    <Hint text={orderHint}>
      <Button asChild size={size}>
        <a href={href}>
          <Repeat aria-hidden /> {label}
        </a>
      </Button>
    </Hint>
  );

  if (form === 'inline') {
    if (loading) return <Skeleton className={cn('h-5 w-56', className)} />;
    if (!due)
      return (
        <p className={cn('text-sm text-muted-foreground', className)}>
          Nothing due.{nextDue ? ` Next review ${nextDue}.` : ''}
        </p>
      );
    return (
      <p className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm', className)}>
        <span className="font-medium text-mode-review tabular-nums">{due} due</span>
        <Hint text={ESTIMATE_HINT}>
          <span tabIndex={0} className="text-muted-foreground">
            about {plural(minutes, 'minute')}
          </span>
        </Hint>
        <Button asChild size="xs" variant="outline">
          <a href={href}>{label}</a>
        </Button>
      </p>
    );
  }

  if (loading) {
    return (
      <Card className={cn('gap-3 border-l-4 border-l-mode-review', className)}>
        <CardContent className="grid gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!due) {
    return (
      <Card className={cn(practiseHref && LINKED_CARD, 'gap-3 border-l-4 border-l-border', className)}>
        {practiseHref ? <CardLink href={practiseHref} label="Practise anyway" /> : null}
        <CardContent className="grid gap-2">
          <p className="flex items-center gap-2 font-medium">
            <Repeat className="size-4 text-muted-foreground" aria-hidden /> Nothing due.
            {nextDue ? ` Next review ${nextDue}.` : ''}
          </p>
          {newToday ? <p className="text-sm text-muted-foreground">+ {plural(newToday, 'new move')} today</p> : null}
          {practiseHref ? (
            <div className={cn('flex flex-wrap items-center gap-2', ABOVE_ROW_LINK_GROUP)}>
              <Button asChild variant="outline" size="sm">
                <a href={practiseHref}>Practise anyway</a>
              </Button>
              <span className="text-xs text-muted-foreground">Never changes your schedule.</span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const many = due > sessionSize * 3;
  const kindLine = kinds(byKind);
  return (
    <Card className={cn(LINKED_CARD, 'gap-3 border-l-4 border-l-mode-review', className)}>
      <CardLink href={href} label={label} />
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-4xl font-semibold text-mode-review tabular-nums">{due}</span>
          <span className="text-lg font-medium">due</span>
          <Hint text={ESTIMATE_HINT}>
            <span
              tabIndex={0}
              className={cn(
                'text-sm text-muted-foreground underline decoration-dotted underline-offset-4',
                ABOVE_ROW_LINK,
              )}
            >
              about {plural(minutes, 'minute')}
            </span>
          </Hint>
        </div>
        {many ? <p className="text-sm">One session of {sessionSize} is a good start.</p> : null}
        {byOpening.length || kindLine ? (
          <div className={cn('grid justify-items-start gap-1 text-sm', ABOVE_ROW_LINK_GROUP)}>
            {byOpening.length ? (
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {byOpening.map((opening) => (
                  <Hint key={opening.name} text={`Review only the ${opening.name}`}>
                    <a
                      href={opening.href}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {opening.name} <span className="font-medium tabular-nums">{opening.count}</span>
                    </a>
                  </Hint>
                ))}
              </p>
            ) : null}
            {kindLine ? <p className="text-muted-foreground">{kindLine}</p> : null}
          </div>
        ) : null}
        {newToday ? <p className="text-sm text-muted-foreground">+ {plural(newToday, 'new move')} today</p> : null}
        <div className={ABOVE_ROW_LINK_GROUP}>{button('default')}</div>
      </CardContent>
    </Card>
  );
}
