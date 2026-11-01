import { Check, Flag } from 'lucide-react';
import { Hint } from '@/components/shared/hint';
import { cn } from '@/lib/utils';
import { knownShare, progressBreakdown, progressSentence, type ProgressCounts } from './counts';

const SIZES = {
  xs: { px: 18, stroke: 3.5 },
  sm: { px: 44, stroke: 5 },
  md: { px: 72, stroke: 7 },
} as const;

export type ProgressRingProps = {
  counts?: ProgressCounts;
  size?: keyof typeof SIZES;
  /** Beside the ring: nothing, the share ("62%") or the sentence ("26 of 42 moves known, 9 mastered"). */
  label?: 'none' | 'short' | 'long';
  /** The final test (or checkpoint) is cleared: a small flag. */
  cleared?: boolean;
  /** What is counted, in the plural. */
  noun?: string;
  loading?: boolean;
  className?: string;
};

/**
 * The share of the learner's moves known and mastered, as a small ring: mastered solid, known but not mastered in the
 * lighter teal, over a faint track (docs/v2/components/progress-ring.md). Not a link; the card or row around it is.
 */
export function ProgressRing({
  counts,
  size = 'sm',
  label = 'none',
  cleared,
  noun = 'moves',
  loading,
  className,
}: ProgressRingProps) {
  const { px, stroke } = SIZES[size];
  const r = (px - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const total = counts?.total ?? 0;
  const mastered = total && counts ? counts.mastered / total : 0;
  const known = counts ? knownShare(counts) : 0;
  const done = Boolean(counts && total > 0 && counts.mastered >= total);
  const percent = Math.round(known * 100);
  const arc = (from: number, to: number) => ({
    strokeDasharray: `${Math.max(0, to - from) * circumference} ${circumference}`,
    strokeDashoffset: -from * circumference,
  });

  const ring = (
    <span
      tabIndex={loading ? undefined : 0}
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full', className)}
      style={{ width: px, height: px }}
      role={loading ? undefined : 'img'}
      aria-label={loading || !counts ? 'Loading' : `${progressSentence(counts, noun)}. ${progressBreakdown(counts)}`}
    >
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className={cn('-rotate-90', loading && 'animate-pulse')}>
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {!loading && counts ? (
          <>
            <circle
              cx={px / 2}
              cy={px / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-state-known/70 transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
              style={arc(mastered, known)}
            />
            <circle
              cx={px / 2}
              cy={px / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              className="stroke-state-mastered transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
              style={arc(0, mastered)}
            />
          </>
        ) : null}
      </svg>
      {size !== 'xs' && !loading && counts ? (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-medium tabular-nums',
            size === 'md' ? 'text-base' : 'text-[0.7rem]',
          )}
          aria-hidden
        >
          {done ? <Check className={cn('text-state-mastered', size === 'md' ? 'size-7' : 'size-4')} /> : `${percent}%`}
        </span>
      ) : null}
      {cleared && !loading ? (
        <span
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-state-mastered text-background ring-2 ring-background',
            size === 'xs'
              ? '-top-1 -right-1 size-2.5'
              : size === 'sm'
                ? '-top-0.5 -right-0.5 size-4'
                : 'top-0 right-0 size-5',
          )}
          aria-hidden
        >
          {size === 'xs' ? null : <Flag className={size === 'md' ? 'size-3' : 'size-2.5'} />}
        </span>
      ) : null}
    </span>
  );

  const wrapped =
    loading || !counts ? (
      ring
    ) : (
      <Hint
        text={
          <>
            {progressSentence(counts, noun)}
            {cleared ? '. Final test cleared' : ''}
            <br />
            {progressBreakdown(counts)}
          </>
        }
      >
        {ring}
      </Hint>
    );

  if (label === 'none') return wrapped;
  return (
    <span className="inline-flex items-center gap-2">
      {wrapped}
      <span className="text-sm text-muted-foreground tabular-nums">
        {loading || !counts ? ' ' : label === 'short' ? `${percent}%` : progressSentence(counts, noun)}
      </span>
    </span>
  );
}
