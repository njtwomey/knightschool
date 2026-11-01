import { BookOpen, Crosshair, HelpCircle, Puzzle, Target } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
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
import { Hint } from '@/components/shared/hint';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { StepMoves } from './step-moves';
import { STAGE_NAMES, stepTitle, type Extra, type StepData } from './steps';

export type StepRowProps = {
  step: StepData;
  selected?: boolean;
  /** Click anywhere on the row: the page's board shows the stretch at its end. */
  onSelect?: (step: StepData) => void;
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
  className?: string;
};

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
                <a href={extra.href} className="relative z-10 underline-offset-4 hover:underline">
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
  className,
}: StepRowProps) {
  const [asking, setAsking] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const checkboxId = useId();
  const locked = step.state === 'locked';
  const quiet = step.state === 'known' || step.state === 'mastered';
  const title = stepTitle(step);
  const opens = step.opensWhen;
  const reason = opens ? `Opens when step ${opens.number} (${opens.name}) is known.` : undefined;

  const learn = () => {
    if (locked && gates && !skipAsk) setAsking(true);
    else onLearn?.(step);
  };

  // The row selects; the buttons and links inside keep their own clicks.
  const ownClick = (target: EventTarget) => (target as HTMLElement).closest('a, button, [role="button"], input');
  const onClick = (event: MouseEvent) => {
    // Clicks in the dialog arrive here through the portal; they are not the row's.
    if (!event.currentTarget.contains(event.target as Node) || ownClick(event.target)) return;
    onSelect?.(step);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (event.key === 'Enter' && !locked) onLearn?.(step);
      else onSelect?.(step);
    }
  };

  const tryFirst = quiet;
  const buttons = (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
      <Button size="sm" variant={tryFirst ? 'outline' : 'default'} onClick={learn}>
        <BookOpen aria-hidden /> {step.stage !== undefined && !quiet ? 'Continue' : 'Learn'}
      </Button>
      <Button size="sm" variant={tryFirst ? 'default' : 'outline'} onClick={() => onTry?.(step)}>
        <Target aria-hidden /> Try
      </Button>
      {locked && gates && testOut ? (
        <Button size="sm" variant="ghost" onClick={() => onTestOut?.(step)}>
          Test out
        </Button>
      ) : null}
    </div>
  );

  return (
    <div
      data-step-row={step.id}
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'group grid cursor-pointer gap-2 rounded-lg border p-3 transition-colors outline-none',
        'hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary/40 bg-accent/60',
        locked && gates && 'opacity-75',
        className,
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums',
            quiet && 'border-state-known/40 text-muted-foreground',
          )}
        >
          {step.number}
        </span>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('font-medium', quiet && 'font-normal text-muted-foreground')}>{title}</span>
            <StateBadge state={step.state} of="step" reason={reason} gates={gates} />
            {!compact && step.stage !== undefined && step.state !== 'locked' ? (
              <StageDots stages={stages} stage={quiet ? stages.length - 1 : step.stage} />
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
                    <a href={opens.href} className="font-medium underline underline-offset-4">
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
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Start step {step.number} anyway?</AlertDialogTitle>
            <AlertDialogDescription>
              This step builds on step {opens?.number ?? step.number - 1}
              {opens ? ` (${opens.name})` : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Checkbox id={checkboxId} checked={dontAsk} onCheckedChange={(value) => setDontAsk(value === true)} />
            <Label htmlFor={checkboxId} className="text-sm font-normal">
              Don&apos;t ask again for this opening
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (dontAsk) onSkipAsk?.();
                onGoToStep?.(opens?.number ?? step.number - 1);
              }}
            >
              Go to step {opens?.number ?? step.number - 1}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dontAsk) onSkipAsk?.();
                onLearn?.(step);
              }}
            >
              Start anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
