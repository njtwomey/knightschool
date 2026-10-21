import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * First, back, forward and last: the one set of controls for moving through a line on any board you study from (a
 * line's About tab, Learn, the quiz's moves so far, board search, the tree, Lab). Pages that test you (Drill, Speed,
 * Name it) do not have it.
 */
export function StepButtons({
  onFirst,
  onPrev,
  onNext,
  onLast,
  atStart,
  atEnd,
  label = 'Step through the line',
  disabledTitle,
}: {
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  atStart: boolean;
  atEnd: boolean;
  label?: string;
  /** Shown on every button when there is nothing to step through yet, e.g. "Pick a line to step through it". */
  disabledTitle?: string;
}) {
  const buttons = [
    { name: 'First move', Icon: ChevronsLeft, run: onFirst, off: atStart },
    { name: 'Previous move', Icon: ChevronLeft, run: onPrev, off: atStart },
    { name: 'Next move', Icon: ChevronRight, run: onNext, off: atEnd },
    { name: 'Last move', Icon: ChevronsRight, run: onLast, off: atEnd },
  ];
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {buttons.map(({ name, Icon, run, off }) => (
        <Button
          key={name}
          variant="outline"
          size="icon"
          className="size-8"
          aria-label={name}
          title={disabledTitle && atStart && atEnd ? disabledTitle : name}
          disabled={off}
          onClick={run}
        >
          <Icon aria-hidden />
        </Button>
      ))}
    </div>
  );
}
