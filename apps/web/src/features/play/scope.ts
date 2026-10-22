import {
  type CourseUnit,
  courseUnits,
  type LineStep,
  lineSteps,
  nodeAt,
  type OpeningContent,
  pathFromUcis,
  pathSteps,
  type UnitStretch,
  unitStretches,
} from '@knightschool/core';
import { whenStorageReady } from '@/data/storage';
import { getCardOptions } from '@/data/training-settings';
import type { UnitRef } from '@/router/hrefs';
import type { PlayMode } from './store';

/**
 * Learn or Drill scoped to a unit of the study path: its stretches (one, or one per short branch of a side unit), played
 * one after another. Each starts part-way along: the moves before `from` are already on the board.
 */
export type PlayScope = { unit: CourseUnit; ref: UnitRef; parts: UnitStretch[]; part: number };

/**
 * Where a run starts when it is resumed from the moves in a URL. A fixed line resumes after however many of its own
 * moves match; every branch rebuilds the branch that was being played, as far as the course knows it. Nothing matching
 * starts from the beginning.
 */
export function resumeFrom(
  content: OpeningContent,
  variantId: string,
  mode: PlayMode,
  moves: string[],
): { steps: LineStep[]; index: number } {
  if (mode === 'branches') {
    const edges = pathFromUcis(content, moves);
    const steps = edges.map((edge, i) => {
      const fromEpd = i === 0 ? content.opening.rootEpd : edges[i - 1]!.to;
      return { fromEpd, edge, ours: nodeAt(content, fromEpd).isOurTurn };
    });
    return { steps, index: steps.length };
  }
  const steps = lineSteps(content, variantId);
  let index = 0;
  while (index < moves.length && index < steps.length && steps[index]!.edge.uci === moves[index]) index++;
  return { steps, index };
}

/** A stretch resumed after the moves of it already played (from a saved URL); never before its own start. */
export function resumeStretch(
  content: OpeningContent,
  stretch: UnitStretch,
  moves: string[],
): { steps: LineStep[]; index: number } {
  const steps = pathSteps(content, stretch.moves);
  let index = 0;
  while (index < moves.length && index < steps.length && steps[index]!.edge.uci === moves[index]) index++;
  return { steps, index: Math.max(stretch.from, index) };
}

/** The unit a Learn or Drill address names, cut with the learner's card settings as the Path tab cuts it. */
export async function scopeFor(content: OpeningContent, line: string, ref: UnitRef, part: number): Promise<PlayScope> {
  const options = await whenStorageReady()
    .then(({ storage }) => getCardOptions(storage))
    .catch(() => ({}));
  const unit = courseUnits(content, options).find((candidate) => candidate.line === line && candidate.n === ref.n);
  if (!unit)
    throw new Error(`${content.opening.name} has no unit ${ref.n} of this line now. Pick one from the course's path.`);
  const parts = unitStretches(unit, ref.first, ref.last);
  return { unit, ref, parts, part: Math.min(Math.max(0, part), parts.length - 1) };
}
