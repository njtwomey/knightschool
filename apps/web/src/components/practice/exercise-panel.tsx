import { ArrowRight, Check, Eye, Lightbulb, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MODE_INFO, type PracticeMode } from './practice-config';

export type ExerciseResult = 'right' | 'right-hint' | 'shown' | 'missed';

const RESULT: Record<ExerciseResult, { text: string; icon: typeof Check; tone: string }> = {
  right: { text: 'Right', icon: Check, tone: 'text-feedback-right' },
  'right-hint': { text: 'Right with a hint', icon: Check, tone: 'text-feedback-right' },
  shown: { text: 'Shown', icon: Eye, tone: 'text-muted-foreground' },
  missed: { text: 'Missed', icon: X, tone: 'text-feedback-wrong' },
};

export type ExercisePanelProps = {
  /** The mode, for the prompt's colour; a step's Try uses Learn's. */
  mode: PracticeMode | 'step';
  /** One line: "Your move as White", "Name this opening". */
  prompt: string;
  /** Quieter, under it: the opening and step, how often a mistake is made. */
  context?: ReactNode;
  /** Tries left of the total (`teach.triesBeforeShown`). */
  tries?: { left: number; total: number };
  /** Hint (the piece) and Show me (the move), lit once used. */
  help?: { hint: boolean; shown: boolean };
  progress?: { done: number; total: number };
  /** In a timed run the clock replaces the counter. */
  clock?: ReactNode;
  result?: ExerciseResult | null;
  /** The verdict on the last move (a verdict note). */
  verdict?: ReactNode;
  /** The comment or explanation to read once answered. */
  explanation?: ReactNode;
  /** Shown while there is something to read: a miss, a shown move, a typed answer. Enter or the right arrow press it. */
  onNext?: () => void;
  /** What the page adds under the prompt: an answer input, a step's stage dots, a Play on target. */
  children?: ReactNode;
  className?: string;
};

function Markers({ tries }: { tries: { left: number; total: number } }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-1" aria-hidden>
        {Array.from({ length: tries.total }, (_, i) => (
          <span
            key={i}
            className={cn(
              'size-2.5 rounded-full border border-foreground/40',
              i < tries.left ? 'bg-foreground/70' : 'bg-transparent',
            )}
          />
        ))}
      </span>
      {tries.left === 1 ? '1 try left' : `${tries.left} tries left`}
    </span>
  );
}

function HelpMarker({
  used,
  icon: Icon,
  name,
  counts,
}: {
  used: boolean;
  icon: typeof Eye;
  name: string;
  counts: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs',
            used ? 'bg-primary/10 font-medium text-foreground' : 'text-muted-foreground/60',
          )}
          aria-label={used ? `${name} used` : `${name} not used`}
        >
          <Icon className="size-3.5" aria-hidden />
          {name}
        </span>
      </TooltipTrigger>
      <TooltipContent>{used ? `${name} used: ${counts}` : `${name} not used`}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Beside the board in any exercise: the prompt, tries left, help used, progress, and once answered the result, what to
 * read and Next. It reads the session; it never grades (docs/v2/components/exercise-panel.md).
 */
export function ExercisePanel({
  mode,
  prompt,
  context,
  tries,
  help,
  progress,
  clock,
  result,
  verdict,
  explanation,
  onNext,
  children,
  className,
}: ExercisePanelProps) {
  const tone = mode === 'step' ? 'text-mode-learn' : MODE_INFO[mode].text;

  useEffect(() => {
    if (!onNext) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== 'ArrowRight') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input:not([readonly]), textarea:not([readonly]), [contenteditable]');
      if (typing || target?.closest('button, a')) return;
      event.preventDefault();
      onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);

  const shown = result ? RESULT[result] : null;
  return (
    <Card className={cn('gap-0 py-0', className)}>
      <CardContent className="grid gap-3 p-4">
        <div className="grid gap-0.5">
          <p className={cn('text-base font-semibold', tone)}>{prompt}</p>
          {context ? <div className="text-sm text-muted-foreground">{context}</div> : null}
        </div>

        {children}

        {tries || help ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {tries ? <Markers tries={tries} /> : null}
            {help ? (
              <span className="inline-flex items-center gap-1" aria-label="Help used">
                <HelpMarker used={help.hint} icon={Lightbulb} name="Hint" counts="this counts as Hard" />
                <HelpMarker used={help.shown} icon={Eye} name="Show me" counts="this move comes back soon" />
              </span>
            ) : null}
          </div>
        ) : null}

        {shown ? (
          <div className="grid gap-2 border-t pt-3" aria-live="polite">
            <p className={cn('flex items-center gap-1.5 font-medium', shown.tone)}>
              <shown.icon className="size-4" aria-hidden />
              {shown.text}
            </p>
            {verdict}
            {explanation ? <div className="text-sm">{explanation}</div> : null}
          </div>
        ) : verdict ? (
          <div className="border-t pt-3" aria-live="polite">
            {verdict}
          </div>
        ) : null}

        {onNext ? (
          <div className="flex items-center gap-2">
            <Button onClick={onNext}>
              Next
              <ArrowRight aria-hidden />
            </Button>
            <span className="text-xs text-muted-foreground">
              or <Kbd>Enter</Kbd>
            </span>
          </div>
        ) : null}

        {clock ? (
          <div className="text-sm tabular-nums">{clock}</div>
        ) : progress ? (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.done} of {progress.total}
            </span>
            <Progress value={(progress.done / progress.total) * 100} aria-label="Progress" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
