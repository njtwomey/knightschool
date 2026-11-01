import { ArrowUpDown, Eye, Lightbulb } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BoardSettingsMenu, type SettingsGroup } from './board-settings-menu';
import { StepButtons, type StepButtonsProps } from './step-buttons';

/** An exercise waiting for an answer: what Hint and Show me need. */
export type ControlsExercise = {
  /** Help used on this try so far: none, the piece lit, the move drawn. */
  help: 'none' | 'hint' | 'shown';
  onHint: () => void;
  onShow: () => void;
  /** `feedback.hints`: the Exam preset turns Hint and Show me off. */
  hintsAllowed?: boolean;
  /** The tries have run out (`teach.triesBeforeShown`): Show me appears unasked. */
  triesSpent?: boolean;
};

export type BoardControlsProps = {
  /** The gear; on unless turned off. */
  settings?: boolean;
  settingsGroups?: SettingsGroup[];
  /** The model says the side is not fixed. */
  onFlip?: () => void;
  /** Key F flips, for the primary board only; the arrow keys go with the step buttons' own `keys`. */
  keys?: boolean;
  /** There is a line to step through. */
  stepper?: StepButtonsProps;
  /** An exercise waiting for an answer. */
  exercise?: ControlsExercise;
  /** The page's own buttons, last: Restart, Next, Back to the line, Open on the board. */
  actions?: ReactNode;
  className?: string;
};

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The one row of buttons under every board, always in the same order, each there only when it means something:
 * settings, flip, the steps, Hint and Show me, then the page's actions (docs/v2/components/board-controls.md).
 */
export function BoardControls({
  settings = true,
  settingsGroups,
  onFlip,
  keys,
  stepper,
  exercise,
  actions,
  className,
}: BoardControlsProps) {
  useEffect(() => {
    if (!keys || !onFlip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, [contenteditable], [role="menu"]')) return;
      onFlip();
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, onFlip]);

  const helping = exercise && exercise.hintsAllowed !== false;
  return (
    <div className={cn('flex flex-wrap items-center gap-x-1 gap-y-2', className)}>
      {settings ? <BoardSettingsMenu groups={settingsGroups} /> : null}
      {onFlip ? (
        <IconButton label="Flip the board (F)" onClick={onFlip}>
          <ArrowUpDown aria-hidden />
        </IconButton>
      ) : null}
      {stepper ? <StepButtons {...stepper} /> : null}
      {helping ? (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-11 sm:h-8"
                onClick={exercise.onHint}
                disabled={exercise.help !== 'none'}
              >
                <Lightbulb aria-hidden />
                Hint
              </Button>
            </TooltipTrigger>
            <TooltipContent>Lights the piece to move. Counted on this try.</TooltipContent>
          </Tooltip>
          {helping ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={exercise.triesSpent ? 'default' : 'outline'}
                  size="sm"
                  className="h-11 sm:h-8"
                  onClick={exercise.onShow}
                  disabled={exercise.help === 'shown'}
                >
                  <Eye aria-hidden />
                  Show me
                </Button>
              </TooltipTrigger>
              <TooltipContent>Draws the move. Counted on this try.</TooltipContent>
            </Tooltip>
          ) : null}
          {exercise.help !== 'none' ? (
            <Badge variant="secondary" className="ml-1">
              {exercise.help === 'hint' ? 'Hint used' : 'Move shown'}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
