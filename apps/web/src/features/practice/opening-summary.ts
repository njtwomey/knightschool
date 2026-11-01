import type { OpeningSummary } from '@/components/openings/types';
import { openingSummary } from '@/features/learn/views';
import type { OpeningProgress } from './progress';

/** An opening the learner has started, as its card: steps known, moves known, and what is due. */
export function startedSummary(one: OpeningProgress, newLeft: number): OpeningSummary {
  const states = [...one.stepStates.values()];
  const knownSteps = states.filter((state) => state === 'known' || state === 'mastered').length;
  const counts = [...one.stepCounts.values()];
  const known = counts.reduce((sum, count) => sum + count.known, 0);
  const inReviews = counts.reduce((sum, count) => sum + count.inReviews, 0);
  return {
    ...openingSummary(one.entry),
    started: {
      progress: { total: one.cards.length, known, mastered: 0, learning: Math.max(0, inReviews - known) },
      modes: { learn: { known: knownSteps, total: states.length, newToday: newLeft }, review: { due: one.due } },
      due: one.due,
    },
  };
}
