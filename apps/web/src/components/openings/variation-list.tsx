import { ChevronDown, Flag } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { RichText } from '@/components/chess/rich-text';
import type { ProgressCounts } from '@/components/progress/counts';
import { ProgressRing } from '@/components/progress/progress-ring';
import { StateBadge } from '@/components/progress/state-badge';
import type { ProgressState } from '@/components/progress/states';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ABOVE_ROW_LINK, CardLink, LINKED_CARD } from '@/components/shared/card-link';
import { EmptyState } from '@/components/shared/empty-state';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { ExtrasList, StepRow, type StepRowProps } from './step-row';
import type { Extra, StepData } from './steps';

/** A checkpoint: positions drawn from a variation's steps (or, for the final test, the whole opening). */
export type Checkpoint = {
  positions: number;
  state: 'locked' | 'open' | 'cleared';
  score?: string;
  /** Its page: a click anywhere on the row opens it. */
  href?: string;
};

export type VariationData = {
  id: string;
  number: number;
  /** Lichess's name: "Two Knights Defense". */
  name: string;
  /** The decision it is about: "When Black plays 3...Nf6". */
  decision: ReactNode;
  state: ProgressState;
  progress: ProgressCounts;
  /** Two or three sentences, rich text. */
  intro?: string;
  steps: StepData[];
  checkpoint: Checkpoint;
  extras?: Extra[];
  /** The variation's page: its name in the header opens it. */
  href?: string;
  /**
   * Each step's follow-ups, by step id: shown as rows under it, locked until it is known, never counted towards the
   * variation's steps or its checkpoint.
   */
  followUps?: Record<string, StepData[]>;
};

export type VariationListProps = {
  variations: VariationData[];
  /** The opening's final test, a checkpoint for the whole opening (its `href` opens its page). */
  finalTest?: Checkpoint;
  /** The step shown on the page's board. */
  selected?: string;
  onSelect?: (step: StepData) => void;
  /** `auto`: open the variation in progress, fold the rest; `all-open`: Create's preview. */
  fold?: 'auto' | 'all-open';
  onCheckpoint?: (variation: VariationData | null) => void;
  /** An opening with no steps yet (an authored one): where to write them. */
  createHref?: string;
  gates?: boolean;
  testOut?: boolean;
  /** A step's tick (`ChooseTick`); its follow-ups come with it, so they have none. */
  stepTick?: (step: StepData) => ReactNode;
  /** A variation's tick, at the end of its header. */
  variationTick?: (variation: VariationData) => ReactNode;
  /** Leaves out the checkpoint rows: a list of only some of each variation's steps (the repertoire page). */
  hideCheckpoints?: boolean;
} & Pick<
  StepRowProps,
  'onLearn' | 'onTry' | 'onTestOut' | 'onGoToStep' | 'skipAsk' | 'onSkipAsk' | 'stages' | 'onPreview' | 'compact'
>;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** One checkpoint (or the final test) as a row: what it asks, its state, and how to take it. */
export function CheckpointRow({
  title,
  from,
  waits,
  checkpoint,
  ready,
  testOut,
  onTake,
}: {
  title: string;
  /** What its positions are drawn from: "from these steps". */
  from: string;
  /** What it waits for: "every step above is known". */
  waits: string;
  checkpoint: Checkpoint;
  /** Every step it covers is known. */
  ready: boolean;
  testOut: boolean;
  onTake?: () => void;
}) {
  const cleared = checkpoint.state === 'cleared';
  const heading = `${title}: ${plural(checkpoint.positions, 'position')} ${from}`;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3',
        checkpoint.href && LINKED_CARD,
        cleared && 'border-solid border-state-known/40 bg-state-known/5',
      )}
    >
      <Flag className={cn('size-5 shrink-0', cleared ? 'text-state-known' : 'text-muted-foreground')} aria-hidden />
      <div className="grid min-w-0 flex-1 gap-0.5">
        {checkpoint.href ? (
          <CardLink href={checkpoint.href}>{heading}</CardLink>
        ) : (
          <span className="font-medium">{heading}</span>
        )}
        <span className="text-sm text-muted-foreground">
          {cleared
            ? `Cleared${checkpoint.score ? `, ${checkpoint.score}` : ''}`
            : ready
              ? `Ready to take: ${waits}.`
              : `Opens once ${waits}.`}
        </span>
      </div>
      {cleared ? (
        <Button size="sm" variant="ghost" onClick={onTake} className={ABOVE_ROW_LINK}>
          Take it again
        </Button>
      ) : ready ? (
        <Button size="sm" onClick={onTake} className={ABOVE_ROW_LINK}>
          Take the checkpoint
        </Button>
      ) : testOut ? (
        <Button size="sm" variant="outline" onClick={onTake} className={ABOVE_ROW_LINK}>
          Test out
        </Button>
      ) : null}
    </div>
  );
}

const isKnown = (step: StepData) => step.state === 'known' || step.state === 'mastered';
const inProgress = (variation: VariationData) => variation.state === 'learning' || variation.state === 'open';

/**
 * An opening's variations in study order, each with its steps and checkpoint: the learner's path through the opening
 * (docs/v2/components/variation-list.md). Locked variations stay readable.
 */
export function VariationList({
  variations,
  finalTest,
  selected,
  onSelect,
  fold = 'auto',
  onCheckpoint,
  createHref,
  gates = siteConfig.teach.gates,
  testOut = siteConfig.teach.testOut,
  stepTick,
  variationTick,
  hideCheckpoints,
  ...stepActions
}: VariationListProps) {
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Set<string>>(() => {
    if (fold === 'all-open') return new Set(variations.map((v) => v.id));
    const current = variations.find(inProgress) ?? variations[0];
    return new Set(current ? [current.id] : []);
  });

  // On arrival, the step in progress is in view.
  useEffect(() => {
    if (!selected) return;
    list.current?.querySelector(`[data-step-row="${CSS.escape(selected)}"]`)?.scrollIntoView({ block: 'nearest' });
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!variations.some((variation) => variation.steps.length)) {
    return (
      <EmptyState
        kind="new"
        text="No steps yet: write the lines in Create and they are cut into steps."
        action={createHref ? { label: 'Open in Create', href: createHref } : undefined}
      />
    );
  }

  // Up and Down move between rows while the list has focus.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const rows = [
      ...(list.current?.querySelectorAll<HTMLElement>('[data-step-row] [data-card-link], [data-variation-header]') ??
        []),
    ];
    const at = rows.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    event.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };

  return (
    <div ref={list} className="grid gap-4" onKeyDown={onKeyDown}>
      {variations.map((variation) => {
        const isOpen = open.has(variation.id);
        const ready = variation.steps.every(isKnown);
        return (
          <Collapsible
            key={variation.id}
            open={isOpen}
            onOpenChange={(next) =>
              setOpen((current) => {
                const copy = new Set(current);
                if (next) copy.add(variation.id);
                else copy.delete(variation.id);
                return copy;
              })
            }
            className="grid gap-2"
          >
            {variation.href ? (
              <div className={cn('flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent/40', LINKED_CARD)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    data-variation-header
                    aria-label={`${isOpen ? 'Fold' : 'Unfold'} ${variation.name}`}
                    className={cn('shrink-0', ABOVE_ROW_LINK)}
                  >
                    <ChevronDown className={cn('transition-transform', !isOpen && '-rotate-90')} aria-hidden />
                  </Button>
                </CollapsibleTrigger>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <CardLink href={variation.href} className="text-base font-semibold">
                      {variation.number}. {variation.name}
                    </CardLink>
                    <span className={ABOVE_ROW_LINK}>
                      <StateBadge state={variation.state} of="variation" gates={gates} />
                    </span>
                  </span>
                  <span className="text-sm font-normal text-muted-foreground">{variation.decision}</span>
                </span>
                <ProgressRing
                  counts={variation.progress}
                  size="sm"
                  cleared={variation.checkpoint.state === 'cleared'}
                  className="mr-2"
                />
                {variationTick?.(variation)}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    data-variation-header
                    className="h-auto min-w-0 flex-1 justify-start gap-3 px-2 py-2 text-left whitespace-normal"
                  >
                    <ChevronDown className={cn('shrink-0 transition-transform', !isOpen && '-rotate-90')} aria-hidden />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">
                          {variation.number}. {variation.name}
                        </span>
                        <StateBadge state={variation.state} of="variation" gates={gates} />
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">{variation.decision}</span>
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <ProgressRing
                  counts={variation.progress}
                  size="sm"
                  cleared={variation.checkpoint.state === 'cleared'}
                  className="mr-2"
                />
                {variationTick?.(variation)}
              </div>
            )}
            <CollapsibleContent className="grid gap-2 pl-2 sm:pl-9">
              {variation.intro ? <RichText text={variation.intro} className="text-muted-foreground" /> : null}
              {variation.steps.flatMap((step) => [
                <StepRow
                  key={step.id}
                  step={step}
                  selected={selected === step.id}
                  onSelect={onSelect}
                  href={step.href}
                  gates={gates}
                  testOut={testOut}
                  tick={stepTick?.(step)}
                  {...stepActions}
                />,
                ...(variation.followUps?.[step.id] ?? []).map((followUp) => (
                  <StepRow
                    key={followUp.id}
                    step={followUp}
                    selected={selected === followUp.id}
                    onSelect={onSelect}
                    href={followUp.href}
                    gates={gates}
                    testOut={testOut}
                    {...stepActions}
                  />
                )),
              ])}
              {variation.extras?.length ? (
                <div className="px-3">
                  <ExtrasList extras={variation.extras} note="Not needed to know the variation:" />
                </div>
              ) : null}
              {hideCheckpoints ? null : (
                <CheckpointRow
                  title="Checkpoint"
                  from="from these steps"
                  waits="every step above is known"
                  checkpoint={variation.checkpoint}
                  ready={ready}
                  testOut={testOut}
                  onTake={() => onCheckpoint?.(variation)}
                />
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      {finalTest ? (
        <CheckpointRow
          title="Final test"
          from="from the whole opening"
          waits="every checkpoint is cleared"
          checkpoint={finalTest}
          ready={variations.every((variation) => variation.checkpoint.state === 'cleared')}
          testOut={testOut}
          onTake={() => onCheckpoint?.(null)}
        />
      ) : null}
    </div>
  );
}
