import { useLineStepper } from '@/components/board/line-stepper';
import { useQuiz } from './store';

/**
 * Steps back and forth through the moves that led to the question, up to the question itself (the last of them): the
 * same as clicking the moves in the table. Nothing to step through before the second move.
 */
export function usePathStepper(length: number) {
  const viewing = useQuiz((state) => state.viewing);
  const stepper = useLineStepper({
    length: length - 1,
    index: viewing ?? length - 1,
    setIndex: (i) => useQuiz.getState().view(i >= length - 1 ? null : Math.max(0, i)),
    atEnd: viewing === null,
    keys: length >= 2,
    label: 'Step through the moves so far',
  });
  return length >= 2 ? stepper : null;
}
