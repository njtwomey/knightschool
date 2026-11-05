import { BookOpen, Crosshair, HelpCircle, Puzzle, Target } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { StateBadge } from '@/components/progress/state-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ABOVE_ROW_LINK, CardAction, CardLink, LINKED_CARD } from '@/components/shared/card-link';
import { Hint } from '@/components/shared/hint';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { StepMoves } from './step-moves';
import { STAGE_NAMES, stepLabel, stepTitle, type Extra, type StepData } from './steps';

export type StepRowProps = {
  step: StepData;
  selected?: boolean;
  /** Click anywhere on the row: the page's board shows the stretch at its end. */
  onSelect?: (step: StepData) => void;
  /** Where a click anywhere on the row goes: the step, at the stage the learner left it (continue). */
  href?: string;
  /** Hover or focus previews the step on the page's board; `null` when the pointer or focus leaves. */
  onPreview?: (step: StepData | null) => void;
  onLearn?: (step: StepData) => void;
  onTry?: (step: StepData) => void;
  onTestOut?: (step: StepData) => void;
  /** "Go to step 3" in the ask-once dialog. */
  onGoToStep?: (number: number) => void;
  /** Number, title, badge and buttons only (Today, the variation page's sidebar). */
  compact?: boolean;
  /** `teach.gates`, and not relaxed by the learner (`learning.gatesRelaxed`). */
  gates?: boolean;
  /** `teach.testOut`. */
  testOut?: boolean;
  /** `teach.stages`: which stage dots show. */
  stages?: string[];
  /** The learner ticked "Don't ask again for this opening". */
  skipAsk?: boolean;
  onSkipAsk?: () => void;
  /** Its tick for the learner's repertoire, at the end of the row (`ChooseTick`); it keeps its own click. */
  tick?: ReactNode;
  className?: string;
};

/**
 * "Start step 3 anyway?": asked once per opening when a locked step or follow-up is opened, from its row or a crumb's
 * menu, with "Don't ask again for this opening" (docs/v2/components/step-row.md).
 */
export function StartAnywayDialog({
  open,
  onOpenChange,
  label,
  buildsOn,
  onStart,
  onGoToStep,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The step's label: "3", or "3a" for a follow-up. */
  label: string;
  /** The step it builds on. */
  buildsOn: { number: number; name?: string };
  onStart: (dontAsk: boolean) => void;
  onGoToStep: (dontAsk: boolean) => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);
  const checkboxId = useId();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start step {label} anyway?</AlertDialogTitle>
          <AlertDialogDescription>
            This step builds on step {buildsOn.number}
            {buildsOn.name ? ` (${buildsOn.name})` : ''}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-center gap-2">
          <Checkbox id={checkboxId} checked={dontAsk} onCheckedChange={(value) => setDontAsk(value === true)} />
          <Label htmlFor={checkboxId} className="text-sm font-normal">
            Don&apos;t ask again for this opening
          </Label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onGoToStep(dontAsk)}>Go to step {buildsOn.number}</AlertDialogCancel>
          <AlertDialogAction onClick={() => onStart(dontAsk)}>Start anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const EXTRA_ICON = { puzzle: Puzzle, trap: Crosshair, question: HelpCircle } as const;

export function ExtrasList({ extras, note }: { extras: Extra[]; note: string }) {
  if (!extras.length) return null;
  return (
    <div className="grid gap-1 text-sm text-muted-foreground">
      <span className="text-xs">{note}</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {extras.map((extra) => {
          const Icon = EXTRA_ICON[extra.kind];
          return (
            <li key={`${extra.kind}-${extra.label}`} className="inline-flex items-center gap-1.5">
              <Icon className="size-3.5" aria-hidden />
              {extra.href ? (
                <a href={extra.href} className={cn(ABOVE_ROW_LINK, 'underline-offset-4 hover:underline')}>
                  {extra.label}
                </a>
              ) : (
                extra.label
              )}
              {extra.detail ? <span className="text-xs">({extra.detail})</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StageDots({ stages, stage }: { stages: string[]; stage: number }) {
  const name = (id: string) => STAGE_NAMES[id] ?? id;
  return (
    <Hint text={`Stage: ${name(stages[stage] ?? '')}. ${stages.map(name).join(', ')}.`}>
      <span tabIndex={0} className="inline-flex items-center gap-1" aria-label={`Stage ${name(stages[stage] ?? '')}`}>
        {stages.map((id, i) => (
          <span
            key={id}
            className={cn(
              'size-2 rounded-full ring-1 ring-inset',
              i < stage
                ? 'bg-state-known/60 ring-state-known/60'
                : i === stage
                  ? 'bg-state-known ring-state-known'
                  : 'ring-border',
            )}
          />
        ))}
        <span className="ml-1 text-xs text-muted-foreground">{name(stages[stage] ?? '')}</span>
      </span>
    </Hint>
  );
}

/**
 * One step in a list: its state, title, moves, what opens it, and the ways into it (docs/v2/components/step-row.md).
 * A locked step stays readable, and Learn on it asks once.
 */
export function StepRow({
  step,
  selected,
  onSelect,
  href = step.href,
  onPreview,
  onLearn,
  onTry,
  onTestOut,
  onGoToStep,
  compact,
  gates = siteConfig.teach.gates,
  testOut = siteConfig.teach.testOut,
  stages = siteConfig.teach.stages,
  skipAsk,
  onSkipAsk,
  tick,
  className,
}: StepRowProps) {
  /** What the ask-once dialog will start when the learner says yes. */
  const [asking, setAsking] = useState<'learn' | 'try' | null>(null);
  const locked = step.state === 'locked';
  const quiet = step.state === 'known' || step.state === 'mastered';
  const title = stepTitle(step);
  const opens = step.opensWhen;
  const reason = opens ? `Opens when step ${opens.number} (${opens.name}) is known.` : undefined;

  // Opening a locked step (Learn or Try) asks once per opening; Test out never asks, since it is the honest check.
  const open = (action: 'learn' | 'try') => {
    if (locked && gates && !skipAsk) setAsking(action);
    else (action === 'learn' ? onLearn : onTry)?.(step);
  };
  const start = (dontAsk: boolean) => {
    if (dontAsk) onSkipAsk?.();
    (asking === 'try' ? onTry : onLearn)?.(step);
  };

  const tryFirst = quiet;
  const buttons = (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-1.5', ABOVE_ROW_LINK)}>
      <Button size="sm" variant={tryFirst ? 'outline' : 'default'} onClick={() => open('learn')}>
        <BookOpen aria-hidden /> {step.stage !== undefined && !quiet ? 'Continue' : 'Learn'}
      </Button>
      <Button size="sm" variant={tryFirst ? 'default' : 'outline'} onClick={() => open('try')}>
        <Target aria-hidden /> Try
      </Button>
      {locked && gates && testOut && !step.followUp ? (
        <Button size="sm" variant="ghost" onClick={() => onTestOut?.(step)}>
          Test out
        </Button>
      ) : null}
      {tick}
    </div>
  );

  return (
    <div
      data-step-row={step.id}
      aria-current={selected ? 'true' : undefined}
      onMouseEnter={onPreview ? () => onPreview(step) : undefined}
      onMouseLeave={onPreview ? () => onPreview(null) : undefined}
      onFocus={onPreview ? () => onPreview(step) : undefined}
      onBlur={
        onPreview
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onPreview(null);
            }
          : undefined
      }
      className={cn(
        'group grid gap-2 rounded-lg border p-3 hover:bg-accent/40',
        (onSelect || href) && LINKED_CARD,
        // A follow-up sits under its step, a little in, so it never reads as part of the main line.
        step.followUp && 'ml-6 border-dashed',
        selected && 'border-primary/40 bg-accent/60',
        locked && gates && 'opacity-75',
        className,
      )}
    >
      {onSelect ? (
        <CardAction
          onClick={() => onSelect(step)}
          label={`Show step ${stepLabel(step)}, ${title}`}
          pressed={selected}
        />
      ) : href ? (
        <CardLink href={href} label={`Learn step ${stepLabel(step)}, ${title}`} />
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums',
            quiet && 'border-state-known/40 text-muted-foreground',
          )}
        >
          {stepLabel(step)}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('font-medium', quiet && 'font-normal text-muted-foreground')}>{title}</span>
            <span className={ABOVE_ROW_LINK}>
              <StateBadge state={step.state} of="step" reason={reason} gates={gates} />
            </span>
            {!compact && step.stage !== undefined && step.state !== 'locked' ? (
              <span className={ABOVE_ROW_LINK}>
                <StageDots stages={stages} stage={quiet ? stages.length - 1 : step.stage} />
              </span>
            ) : null}
          </div>
          {!compact ? (
            <>
              <div className="grid gap-1">
                {step.stretches.map((stretch, i) => (
                  <StepMoves
                    key={stretch.firstPly + stretch.moves.map((m) => m.uci).join('')}
                    lead={i === 0 ? step.lead : undefined}
                    stretch={stretch}
                    side={step.side}
                    known={step.known}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {step.counts.mine} {step.counts.mine === 1 ? 'move' : 'moves'} of yours: {step.counts.known} known,{' '}
                {step.counts.inReviews} in your reviews
              </p>
              {locked && opens ? (
                <p className="text-sm">
                  {gates ? 'Opens when ' : 'Suggested after '}
                  {opens.href ? (
                    <a href={opens.href} className={cn('font-medium underline underline-offset-4', ABOVE_ROW_LINK)}>
                      step {opens.number} ({opens.name})
                    </a>
                  ) : (
                    <span className="font-medium">
                      step {opens.number} ({opens.name})
                    </span>
                  )}
                  {gates ? ' is known' : ''}
                </p>
              ) : null}
              {step.extras?.length ? <ExtrasList extras={step.extras} note="Not needed to know the step:" /> : null}
            </>
          ) : null}
        </div>
        {buttons}
      </div>
      <StartAnywayDialog
        open={asking !== null}
        onOpenChange={(next) => {
          if (!next) setAsking(null);
        }}
        label={stepLabel(step)}
        buildsOn={{ number: opens?.number ?? step.number - 1, ...(opens ? { name: opens.name } : {}) }}
        onStart={start}
        onGoToStep={(dontAsk) => {
          if (dontAsk) onSkipAsk?.();
          onGoToStep?.(opens?.number ?? step.number - 1);
        }}
      />
    </div>
  );
}
