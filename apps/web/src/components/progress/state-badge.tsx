import { Badge } from '@/components/ui/badge';
import { Hint } from '@/components/shared/hint';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { STATE_INFO, stateMeaning, stateWord, type ProgressState, type StateOf } from './states';

export type StateBadgeProps = {
  state: ProgressState;
  of?: StateOf;
  /** `badge`: icon and word; `dot`: the icon alone, coloured (the map, move chips, stage dots). */
  size?: 'badge' | 'dot';
  /** Overrides the hover sentence: "Opens when step 3 (Giuoco Piano) is known." */
  reason?: string;
  /** Gates on (config `teach.gates`, and not relaxed by the learner): with them off a locked thing reads as open. */
  gates?: boolean;
  className?: string;
};

/**
 * How far along something is, as one small badge with an icon, a word and a colour that look the same everywhere
 * (docs/v2/components/state-badge.md). The word is always there for a screen reader; the icon never is.
 */
export function StateBadge({
  state,
  of = 'step',
  size = 'badge',
  reason,
  gates = siteConfig.teach.gates,
  className,
}: StateBadgeProps) {
  // With gates off, nothing is locked: it is open, only suggested for later, and never drawn with a padlock.
  const suggested = state === 'locked' && !gates;
  const shown: ProgressState = suggested ? 'open' : state;
  const info = STATE_INFO[shown];
  const Icon = info.icon;
  const word = stateWord(shown, of);
  const meaning = suggested
    ? `Suggested later${reason ? `: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : '.'}`
    : (reason ?? stateMeaning(state, of));

  if (size === 'dot') {
    return (
      <Hint text={`${word}. ${meaning}`}>
        <span
          tabIndex={0}
          className={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
            shown === 'mastered' ? 'bg-state-mastered text-background' : info.text,
            className,
          )}
        >
          <Icon className={shown === 'mastered' ? 'size-3' : 'size-4'} aria-hidden />
          <span className="sr-only">
            {word}. {meaning}
          </span>
        </span>
      </Hint>
    );
  }

  return (
    <Hint text={meaning}>
      <Badge
        tabIndex={0}
        variant="outline"
        className={cn(
          'gap-1 border-0 ring-1 ring-inset',
          info.tone,
          shown !== 'mastered' && 'text-foreground',
          className,
        )}
      >
        <Icon className={shown === 'mastered' ? undefined : info.text} aria-hidden />
        {word}
        <span className="sr-only">. {meaning}</span>
      </Badge>
    </Hint>
  );
}
