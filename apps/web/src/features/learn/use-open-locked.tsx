import type { BuiltOpening } from '@knightschool/core/content';
import { useState } from 'react';
import { StartAnywayDialog } from '@/components/openings/step-row';
import { stepLabel, type StepData } from '@/components/openings/steps';
import { go, useStepActions } from './opening-data';
import { followUpHref, stepHref } from './views';

/**
 * Going to a step or follow-up by link, as the breadcrumbs and the pager do. A locked one still opens, asking once per
 * opening first: `opener(row)` is what to do instead of following the link, if anything, and `dialog` is the question.
 */
export function useOpenLocked(opening: BuiltOpening) {
  const actions = useStepActions(opening);
  const [asking, setAsking] = useState<StepData | null>(null);
  const hrefOf = (row: StepData) =>
    row.followUp ? followUpHref(opening.id, row.number, row.followUp.index + 1) : stepHref(opening.id, row.number);
  const locked = (row: StepData) => row.state === 'locked' && actions.gates;
  const opener = (row: StepData) => (locked(row) && !actions.skipAsk ? () => setAsking(row) : undefined);
  const dialog = (
    <StartAnywayDialog
      open={asking !== null}
      onOpenChange={(next) => {
        if (!next) setAsking(null);
      }}
      label={asking ? stepLabel(asking) : ''}
      buildsOn={{
        number: asking?.opensWhen?.number ?? (asking ? asking.number - 1 : 0),
        ...(asking?.opensWhen ? { name: asking.opensWhen.name } : {}),
      }}
      onStart={(dontAsk) => {
        if (dontAsk) actions.onSkipAsk();
        if (asking) go(hrefOf(asking));
      }}
      onGoToStep={(dontAsk) => {
        if (dontAsk) actions.onSkipAsk();
        if (asking) actions.onGoToStep(asking.opensWhen?.number ?? asking.number - 1);
      }}
    />
  );
  return { gates: actions.gates, hrefOf, locked, opener, dialog };
}
