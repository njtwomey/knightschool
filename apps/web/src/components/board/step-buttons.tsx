import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { keyTaken } from './key-owner';

export type StepButtonsProps = {
  /** The position shown. */
  index: number;
  /** The last position stepping may reach (the end of the line). */
  last: number;
  /** The first position stepping may reach: a step that starts part-way along a line starts there. */
  min?: number;
  /**
   * In an exercise, the position being asked: forward never goes past it, so the buttons cannot reveal the answer.
   * Stepping back is looking back; forward returns to it.
   */
  asked?: number;
  onIndex: (index: number) => void;
  /** Off the source (moves explored, a refutation stepped through): "Back to the line" follows the four buttons. */
  offLine?: boolean;
  onBackToLine?: () => void;
  /** The arrow keys, Home and End step too: on for the primary board only. */
  keys?: boolean;
};

const HOLD_DELAY = 400;
const HOLD_REPEAT = 110;

/** Did something else already want this key: typing, a modifier, a menu or radio group that took it. */
function StepButton({
  label,
  disabled,
  onStep,
  repeat,
  children,
}: {
  label: string;
  disabled: boolean;
  onStep: () => void;
  repeat?: boolean;
  children: ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeated = useRef(false);
  const step = useRef(onStep);
  useLayoutEffect(() => {
    step.current = onStep;
  });
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  const start = () => {
    if (!repeat) return;
    stop();
    repeated.current = false;
    const again = () => {
      repeated.current = true;
      step.current();
      timer.current = setTimeout(again, HOLD_REPEAT);
    };
    timer.current = setTimeout(again, HOLD_DELAY);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-11 sm:size-8"
          aria-label={label}
          disabled={disabled}
          onClick={() => {
            // A hold already stepped; the click that ends it does not step again.
            if (repeated.current) repeated.current = false;
            else onStep();
          }}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Start, back, forward and end: the one way to move through the moves on a board, with the arrow keys doing the same
 * (docs/v2/components/step-buttons.md). Buttons at either end stay in place, disabled, so the row never jumps.
 */
export function StepButtons({ index, last, min = 0, asked, onIndex, offLine, onBackToLine, keys }: StepButtonsProps) {
  const end = asked !== undefined ? Math.min(asked, last) : last;
  const go = (next: number) => {
    const clamped = Math.max(min, Math.min(end, next));
    if (clamped !== index) onIndex(clamped);
  };
  useEffect(() => {
    if (!keys) return;
    const onKey = (event: KeyboardEvent) => {
      if (keyTaken(event)) return;
      const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (step) go(index + step);
      else if (event.key === 'Home') go(min);
      else if (event.key === 'End') go(end);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const atStart = index <= min;
  const atEnd = index >= end;
  return (
    <div className="flex items-center gap-2">
      <ButtonGroup aria-label="Step through the moves">
        <StepButton label="To the start" disabled={atStart} onStep={() => go(min)}>
          <ChevronFirst aria-hidden />
        </StepButton>
        <StepButton label="Back one move" disabled={atStart} onStep={() => go(index - 1)} repeat>
          <ChevronLeft aria-hidden />
        </StepButton>
        <StepButton label="Forward one move" disabled={atEnd} onStep={() => go(index + 1)} repeat>
          <ChevronRight aria-hidden />
        </StepButton>
        <StepButton
          label={asked !== undefined ? 'To the move being asked' : 'To the end'}
          disabled={atEnd}
          onStep={() => go(end)}
        >
          <ChevronLast aria-hidden />
        </StepButton>
      </ButtonGroup>
      {offLine && onBackToLine ? (
        <Button variant="outline" size="sm" className="h-11 sm:h-8" onClick={onBackToLine}>
          <Undo2 aria-hidden />
          Back to the line
        </Button>
      ) : null}
    </div>
  );
}
