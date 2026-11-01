import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';
import { MODE_INFO, MODE_ORDER, type ModeId } from './modes';

/** What there is to do in a scope, per mode. A mode left out, or with nothing to count, shows no pill. */
export type ModeCountsData = {
  /** Steps known out of steps; `newToday` is what is left of today's allowance of new moves. */
  learn?: { known: number; total: number; newToday?: number };
  /** Moves and questions due now. */
  review?: { due: number };
  /** Lines drilled clean out of lines with cards. */
  drill?: { clean: number; total: number };
  /** Puzzles solved out of puzzles matched. */
  puzzles?: { solved: number; total: number };
  /** Play on positions held out of the opening's Play on positions. */
  playOn?: { held: number; total: number };
};

export type ModeCountsProps = {
  counts?: ModeCountsData;
  /** Which modes to show, always in the fixed order (Today shows Learn and Review only). */
  modes?: ModeId[];
  /** `full`: name and count; `compact`: icon and count, the name in the hint. */
  size?: 'full' | 'compact';
  /** Each pill goes straight into its mode for the scope. */
  hrefs?: Partial<Record<ModeId, string>>;
  loading?: boolean;
  className?: string;
};

type Pill = { mode: ModeId; count: string; full: string; hint: string; quiet?: boolean };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function pillOf(mode: ModeId, counts: ModeCountsData): Pill | null {
  switch (mode) {
    case 'learn': {
      const learn = counts.learn;
      if (!learn?.total) return null;
      const left = learn.newToday
        ? `; ${plural(learn.newToday, 'new move')} left today`
        : learn.newToday === 0
          ? '; no new moves left today'
          : '';
      return {
        mode,
        count: `${learn.known}/${learn.total}`,
        full: `Learn ${learn.known}/${learn.total}${learn.newToday ? ` · ${learn.newToday} new today` : ''}`,
        hint: `${learn.known} of ${plural(learn.total, 'step')} known${left}.`,
      };
    }
    case 'review': {
      const review = counts.review;
      if (!review) return null;
      if (!review.due)
        return { mode, count: '0', full: 'Review: none due', hint: 'Nothing due now: good news.', quiet: true };
      return {
        mode,
        count: String(review.due),
        full: `Review ${review.due} due`,
        hint: `${plural(review.due, 'move or question', 'moves and questions')} due now.`,
      };
    }
    case 'drill': {
      const drill = counts.drill;
      if (!drill?.total) return null;
      return {
        mode,
        count: `${drill.clean}/${drill.total}`,
        full: `Drill ${drill.clean}/${drill.total}`,
        hint: `${drill.clean} of ${plural(drill.total, 'line')} drilled with no mistakes.`,
      };
    }
    case 'puzzles': {
      const puzzles = counts.puzzles;
      if (!puzzles?.total) return null;
      return {
        mode,
        count: `${puzzles.solved}/${puzzles.total}`,
        full: `Puzzles ${puzzles.solved}/${puzzles.total}`,
        hint: `${puzzles.solved} of ${plural(puzzles.total, 'puzzle')} from this opening solved.`,
      };
    }
    case 'playOn': {
      const playOn = counts.playOn;
      if (!playOn?.total) return null;
      return {
        mode,
        count: `${playOn.held}/${playOn.total}`,
        full: `Play on ${playOn.held}/${playOn.total}`,
        hint: `${playOn.held} of ${plural(playOn.total, 'position')} held against the computer after the book ends.`,
      };
    }
  }
}

/**
 * What there is to do, per mode, each pill in its mode's colour: "Learn 12/40, Review 6 due, Puzzles 3/15"
 * (docs/v2/components/mode-counts.md). Each pill is a link into that mode.
 */
export function ModeCounts({ counts, modes = MODE_ORDER, size = 'full', hrefs, loading, className }: ModeCountsProps) {
  const shown = MODE_ORDER.filter((mode) => modes.includes(mode));
  if (loading || !counts) {
    return (
      <span className={cn('inline-flex flex-wrap gap-1.5', className)} aria-busy>
        {shown.slice(0, 3).map((mode) => (
          <Skeleton key={mode} className={cn('h-5 rounded-full', size === 'full' ? 'w-20' : 'w-11')} />
        ))}
      </span>
    );
  }
  const pills = shown.map((mode) => pillOf(mode, counts)).filter((pill): pill is Pill => pill !== null);
  if (!pills.length) return null;
  return (
    <span className={cn('inline-flex flex-wrap gap-1.5', className)}>
      {pills.map((pill) => {
        const info = MODE_INFO[pill.mode];
        const Icon = info.icon;
        const href = hrefs?.[pill.mode];
        const content = (
          <>
            <Icon className={pill.quiet ? 'text-muted-foreground' : info.text} aria-hidden />
            {size === 'full' ? pill.full : <span className="tabular-nums">{pill.count}</span>}
          </>
        );
        const look = cn(
          'gap-1 border-0 font-medium tabular-nums ring-1 ring-inset no-underline',
          pill.quiet ? 'bg-transparent text-muted-foreground ring-border' : cn(info.tone, 'text-foreground'),
          href && 'hover:brightness-95 dark:hover:brightness-125',
        );
        const label = size === 'compact' ? `${info.name}: ${pill.hint}` : pill.hint;
        return (
          <Hint key={pill.mode} text={label}>
            {href ? (
              <Badge asChild variant="outline" className={look}>
                <a href={href} aria-label={`${info.name}: ${pill.hint}`}>
                  {content}
                </a>
              </Badge>
            ) : (
              <Badge variant="outline" tabIndex={0} className={look} aria-label={`${info.name}: ${pill.hint}`}>
                {content}
              </Badge>
            )}
          </Hint>
        );
      })}
    </span>
  );
}
