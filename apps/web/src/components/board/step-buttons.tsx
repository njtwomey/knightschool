import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LineStepper } from './line-stepper';

/**
 * First, back, forward and last: the one set of controls for moving through a line. `StudyBoard` draws them from a
 * `useLineStepper` wherever there is a line to step through (a course, a line's About, Learn, the quiz's moves so far,
 * Lab, board search, the tree, the path, Create); the arrow keys do the same.
 */
/** The old props, until every board is a StudyBoard. */
type LegacyProps = {
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
  atStart: boolean;
  atEnd: boolean;
  label?: string;
  disabledTitle?: string;
};

export function StepButtons(props: { stepper: LineStepper } | LegacyProps) {
  const stepper: LineStepper =
    'stepper' in props
      ? props.stepper
      : { ...props, index: 0, first: props.onFirst, prev: props.onPrev, next: props.onNext, last: props.onLast };
  const { atStart, atEnd, disabledTitle, label = 'Step through the line' } = stepper;
  const buttons = [
    { name: 'First move', Icon: ChevronsLeft, run: stepper.first, off: atStart },
    { name: 'Previous move', Icon: ChevronLeft, run: stepper.prev, off: atStart },
    { name: 'Next move', Icon: ChevronRight, run: stepper.next, off: atEnd },
    { name: 'Last move', Icon: ChevronsRight, run: stepper.last, off: atEnd },
  ];
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {buttons.map(({ name, Icon, run, off }) => (
        <Button
          key={name}
          variant="outline"
          size="icon"
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
