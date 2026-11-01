import type { NextState } from '@/components/progress/next-action-pickers';
import { siteConfig } from '@/data/site-config';
import { checkpointHref, stepHref } from '@/features/learn/views';
import { to } from '@/router/location';
import { startedOpenings, whenWords, type LearnerProgress } from '../progress';

export const reviewHref = () => to('/practice/review');
export const puzzleHref = (id: string) => to(`/practice/puzzle/${id}`);

/**
 * What the next-action button reads (docs/v2/pages/today.md): reviews first at `schedule.reviewsFirstAt` due, then
 * the next open step in path order across the learner's openings (taking turns: each opening's first open step, the
 * one with the fewest started steps first), then a checkpoint whose steps are all known, then any reviews at all.
 */
export function nextStateOf(progress: LearnerProgress, now = new Date()): NextState {
  const openings = startedOpenings(progress);
  const candidates = openings
    .map((one) => {
      const index = one.opening.steps.findIndex((step) => one.stepStates.get(step.id) === 'open');
      const started = one.opening.steps.filter((step) => one.stepStates.get(step.id) !== 'open').length;
      return { one, index, started };
    })
    .filter((candidate) => candidate.index >= 0)
    .sort((a, b) => a.started - b.started);
  const pick = candidates[0];
  const step = pick ? pick.one.opening.steps[pick.index]! : undefined;
  const variationName = (id: string) => pick?.one.opening.variations.find((v) => v.id === id)?.name ?? id;
  const checkpoint = openings
    .flatMap((one) => one.checkpoints.filter((c) => c.state === 'open').map((c) => ({ one, c })))
    .find((found) => found.c.positions > 0);
  return {
    hasRepertoire: openings.length > 0,
    due: progress.due.length,
    dueHref: reviewHref(),
    reviewsFirstAt: siteConfig.schedule.reviewsFirstAt,
    newLeftToday: progress.newLeft,
    ...(pick && step
      ? {
          nextOpenStep: {
            number: pick.index + 1,
            title: step.title ?? `the ${variationName(step.variation)}`,
            opening: pick.one.opening.name,
            side: pick.one.opening.side === 'white' ? 'White' : 'Black',
            href: stepHref(pick.one.opening.id, pick.index + 1),
          },
        }
      : {}),
    ...(checkpoint
      ? {
          checkpoint: {
            variation: checkpoint.c.name,
            href: checkpointHref(checkpoint.one.opening.id, checkpoint.c.variation),
          },
        }
      : {}),
    ...(progress.nextDue ? { nextReview: whenWords(progress.nextDue, now) } : {}),
  };
}
