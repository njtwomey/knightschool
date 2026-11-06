import { useMemo } from 'react';
import { stepTitle, type StepData } from '@/components/openings/steps';
import { Pager, type PagerLink } from '@/components/shared/pager';
import { openingVariations, type OpeningData } from './opening-data';
import { useOpenLocked } from './use-open-locked';
import { stepNeighbours } from './views';

/** Previous and next on a step or follow-up page, in the order `stepNeighbours` walks them. */
export function LearnPager({ data, at }: { data: OpeningData; at: { step: number; followUp?: number } }) {
  const { hrefOf, opener, dialog } = useOpenLocked(data.one.opening);
  const { previous, next } = useMemo(() => stepNeighbours(openingVariations(data), at), [data, at]);
  const link = (row: StepData): PagerLink => {
    const onOpen = opener(row);
    return { name: stepTitle(row), href: hrefOf(row), ...(onOpen ? { onOpen } : {}) };
  };
  return (
    <>
      <Pager
        label="Steps of this opening"
        {...(previous ? { previous: link(previous) } : {})}
        {...(next ? { next: link(next) } : {})}
      />
      {dialog}
    </>
  );
}
