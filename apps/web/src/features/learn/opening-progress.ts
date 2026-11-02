import { lineEarnsCards, puzzleCardId } from '@knightschool/core';
import type { ModeCountsData } from '@/components/progress/mode-counts';
import type { ModeId } from '@/components/progress/modes';
import type { NextState } from '@/components/progress/next-action-pickers';
import type { ShippedPuzzle } from '@/data/content';
import type { ReviewRow } from '@/data/learner-store';
import { siteConfig } from '@/data/site-config';
import { pickPuzzle, whenWords, type LearnerProgress, type OpeningProgress } from '@/features/practice/progress';
import { modeHref } from '@/features/practice/sources';
import { to } from '@/router/location';
import { lineCardIds } from './model';
import { checkpointHref, stepHref } from './views';

/*
 * One opening's progress as its page shows it (docs/v2/pages/opening.md): the mode counts, where each leads, and what
 * the next-action button offers for this opening only. Worked out from the same log as Today (features/practice).
 */

const isKnown = (state: string | undefined) => state === 'known' || state === 'mastered';

/** The latest answer of each card. */
function latestRatings(reviews: readonly ReviewRow[]): Map<string, ReviewRow> {
  const latest = new Map<string, ReviewRow>();
  for (const review of reviews) {
    const seen = latest.get(review.cardId);
    if (!seen || seen.at < review.at) latest.set(review.cardId, review);
  }
  return latest;
}

const answeredRight = (review: ReviewRow | undefined) => review?.rating === 'good' || review?.rating === 'easy';

/** The first step that is open and not known, else the first not known at all: where Learn goes. */
export function nextStepNumber(one: OpeningProgress): number | undefined {
  const steps = one.opening.steps;
  const open = steps.findIndex((step) => one.stepStates.get(step.id) === 'open');
  if (open >= 0) return open + 1;
  const learning = steps.findIndex((step) => one.stepStates.get(step.id) === 'learning');
  if (learning >= 0) return learning + 1;
  const unknown = steps.findIndex((step) => !isKnown(one.stepStates.get(step.id)));
  return unknown >= 0 ? unknown + 1 : undefined;
}

/** What there is to do in the opening, per mode (mode-counts). A mode with nothing to count is left out. */
export function openingModeCounts(
  one: OpeningProgress,
  progress: LearnerProgress,
  puzzles: readonly ShippedPuzzle[],
): ModeCountsData {
  const latest = latestRatings(progress.reviews);
  const have = new Set(progress.cards.map((card) => card.id));
  const steps = one.opening.steps;
  const drillLines = one.opening.lines.filter((line) => lineEarnsCards(line));
  const clean = drillLines.filter((line) => {
    const ids = lineCardIds(one.opening, line.id);
    return ids.length > 0 && ids.every((id) => have.has(id) && answeredRight(latest.get(id)));
  }).length;
  const solved = puzzles.filter((puzzle) => answeredRight(latest.get(puzzleCardId(puzzle.id)))).length;
  return {
    learn: {
      known: steps.filter((step) => isKnown(one.stepStates.get(step.id))).length,
      total: steps.length,
      newToday: progress.newLeft,
    },
    review: { due: one.due },
    ...(drillLines.length ? { drill: { clean, total: drillLines.length } } : {}),
    ...(puzzles.length ? { puzzles: { solved, total: puzzles.length } } : {}),
  };
}

/** Where each mode pill leads for this opening. */
export function openingModeHrefs(one: OpeningProgress): Partial<Record<ModeId, string>> {
  const next = nextStepNumber(one);
  const scope = { opening: one.opening.id };
  return {
    learn: next ? stepHref(one.opening.id, next) : to(`/openings/${one.opening.id}`),
    review: modeHref('review', scope),
    drill: modeHref('drill', scope),
    puzzles: modeHref('puzzles', scope),
    playOn: modeHref('play-on', scope),
  };
}

/** What the next-action button reads for one opening: its due reviews, the step in progress, the next open step. */
export function openingNextState(
  one: OpeningProgress,
  progress: LearnerProgress,
  puzzles: readonly ShippedPuzzle[],
  now = new Date(),
): NextState {
  const steps = one.opening.steps;
  const variationName = (id: string) => one.opening.variations.find((v) => v.id === id)?.name ?? id;
  const titleOf = (i: number) => steps[i]!.title ?? `the ${variationName(steps[i]!.variation)}`;
  const learning = steps.findIndex((step) => one.stepStates.get(step.id) === 'learning');
  const open = steps.findIndex((step) => one.stepStates.get(step.id) === 'open');
  const started = steps.some(
    (step) => one.stepStates.get(step.id) !== 'open' && one.stepStates.get(step.id) !== 'locked',
  );
  const checkpoint = one.checkpoints.find((c) => c.state === 'open' && c.positions > 0);
  const have = new Set(progress.cards.map((card) => card.id));
  const puzzle = pickPuzzle(puzzles, have);
  return {
    hasRepertoire: true,
    due: one.due,
    dueHref: modeHref('review', { opening: one.opening.id }),
    reviewsFirstAt: siteConfig.schedule.reviewsFirstAt,
    newLeftToday: progress.newLeft,
    ...(learning >= 0
      ? {
          stepInProgress: {
            number: learning + 1,
            title: titleOf(learning),
            stage: 'Try',
            href: stepHref(one.opening.id, learning + 1, 'try'),
          },
        }
      : {}),
    ...(open >= 0
      ? {
          nextOpenStep: {
            number: open + 1,
            title: titleOf(open),
            opening: one.opening.name,
            side: one.opening.side === 'white' ? 'White' : 'Black',
            href: stepHref(one.opening.id, open + 1),
            ...(started ? {} : { first: true }),
          },
        }
      : {}),
    ...(checkpoint
      ? { checkpoint: { variation: checkpoint.name, href: checkpointHref(one.opening.id, checkpoint.variation) } }
      : {}),
    ...(puzzle ? { puzzleHref: to(`/practice/puzzle/${puzzle.id}`) } : {}),
    ...(progress.nextDue ? { nextReview: whenWords(progress.nextDue, now) } : {}),
  };
}
