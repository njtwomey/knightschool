import { playMove, stepState, type FollowUp, type ItemState } from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import type { Idea } from '@/components/chess/idea-badge';
import { stepTitle, type StepData } from '@/components/openings/steps';
import type { VariationData } from '@/components/openings/variation-list';
import type { Catalog, ShippedPuzzle } from '@/data/content';
import { siteConfig } from '@/data/site-config';
import { loadProgress, puzzlesOf, type LearnerProgress, type OpeningProgress } from '@/features/practice/progress';
import { navigate, to } from '@/router/location';
import { cardStates, lineMoves, stepMoves } from './model';
import { continueStage } from './stage-memory';
import { useGates, useSkipAsk } from './use-learn';
import {
  checkpointHref,
  finalTestHref,
  followUpHref,
  stageReached,
  stepHref,
  variationViews,
  type CheckpointRecord,
} from './views';

/** Goes to an address made with `to()` (it carries the base path) without a reload. */
export const go = (href: string) => navigate(href.slice(to('').length));

export type OpeningData = {
  progress: LearnerProgress;
  one: OpeningProgress;
  puzzles: ShippedPuzzle[];
};

/** One opening's progress, from the same log Today reads, with its shipped puzzles. */
export async function loadOpeningData(id: string): Promise<OpeningData | null> {
  const progress = await loadProgress(undefined, id);
  const one = progress.openings.find((candidate) => candidate.opening.id === id);
  if (!one) return null;
  const puzzles = await puzzlesOf(id).catch(() => []);
  return { progress, one, puzzles };
}

const isKnown = (state: string | undefined) => state === 'known' || state === 'mastered';

/** An opening's follow-ups, worked out at build time and shipped with it (scripts/content/build.ts). */
export const openingFollowUps = (data: OpeningData): FollowUp[] => data.one.opening.followUps ?? [];

/**
 * Each follow-up's state: from its moves' cards, locked until the step it hangs off is known (`teach.gates`), and known
 * once a Try of it has gone cleanly (every move right first time, no help: an attempt under its id, result right).
 */
export function followUpStates(data: OpeningData, list: readonly FollowUp[]): Map<string, ItemState> {
  const states = cardStates(data.progress.cards, data.progress.reviews);
  const passed = new Set(
    data.progress.attempts.filter((attempt) => attempt.result === 'right').map((attempt) => attempt.ref),
  );
  return new Map(
    list.map((followUp) => [
      followUp.id,
      stepState(
        followUp.cards.map((card) => states.get(card.id) ?? 'open'),
        isKnown(data.one.stepStates.get(followUp.step)),
        siteConfig.teach.gates,
        passed.has(followUp.id),
      ),
    ]),
  );
}

type FollowUpMove = { san: string; uci: string; before: string; after: string; ply: number; mine: boolean };
const followUpCache = new WeakMap<FollowUp, FollowUpMove[]>();

/** The moves of a follow-up from the mistake on, as move runs show them (worked out once for the visit). */
export function followUpMoves(followUp: FollowUp): FollowUpMove[] {
  const known = followUpCache.get(followUp);
  if (known) return known;
  const out: FollowUpMove[] = [];
  let epd = followUp.mistake.epd;
  followUp.line.forEach((uci, i) => {
    const played = playMove(epd, uci);
    if (!played) return;
    out.push({ san: played.san, uci, before: epd, after: played.epd, ply: followUp.ply + i, mine: i % 2 === 1 });
    epd = played.epd;
  });
  followUpCache.set(followUp, out);
  return out;
}

/** The opening's variations with their steps, states and checkpoints, as the variation list and step rows show them. */
export function openingVariations(data: OpeningData): VariationData[] {
  const { one, progress } = data;
  const states = cardStates(progress.cards, progress.reviews);
  const info = new Map(
    one.opening.steps.map((step) => {
      const known = stepMoves(one.opening, step)
        .moves.filter((move) => move.mine && ['known', 'mastered'].includes(states.get(cardOf(move)) ?? ''))
        .map((move) => move.ply);
      return [step.id, { state: one.stepStates.get(step.id)!, counts: one.stepCounts.get(step.id)!, known }];
    }),
  );
  const checkpoints = new Map<string, CheckpointRecord>(
    one.checkpoints.map((c) => [
      c.variation,
      { cleared: c.state === 'cleared', ...(c.score ? { score: c.score } : {}), positions: c.positions },
    ]),
  );
  const views = variationViews(one.opening, info, checkpoints);
  // Each step's follow-ups as rows under it.
  const list = openingFollowUps(data);
  const followStates = followUpStates(data, list);
  const rows = new Map(views.flatMap((variation) => variation.steps).map((row) => [row.id, row]));
  for (const variation of views) {
    const byStep: Record<string, StepData[]> = {};
    for (const followUp of list) {
      const parent = rows.get(followUp.step);
      if (!parent || !variation.steps.includes(parent)) continue;
      const moves = followUpMoves(followUp);
      const step = one.opening.steps.find((s) => s.id === followUp.step)!;
      const lead = lineMoves(one.opening, step.line)[followUp.ply - 1];
      const state = followStates.get(followUp.id) ?? 'open';
      (byStep[followUp.step] ??= []).push({
        id: followUp.id,
        number: parent.number,
        followUp: { index: followUp.index },
        state,
        side: one.opening.side,
        ...(lead ? { lead: { moves: [{ san: lead.san, uci: lead.uci, after: lead.after }], firstPly: lead.ply } } : {}),
        stretches: [{ moves: moves.map(({ san, uci, after }) => ({ san, uci, after })), firstPly: followUp.ply }],
        known: moves.filter((move) => move.mine && isKnown(states.get(cardOf(move)))).map((move) => move.ply),
        counts: {
          mine: followUp.cards.length,
          known: followUp.cards.filter((card) => isKnown(states.get(card.id))).length,
          inReviews: followUp.cards.filter((card) => states.has(card.id)).length,
        },
        ...stageReached(one.opening.id, followUp.id, state),
        ...(state === 'locked'
          ? { opensWhen: { number: parent.number, name: stepTitle(parent), href: parent.href } }
          : {}),
        href: followUpHref(
          one.opening.id,
          parent.number,
          followUp.index + 1,
          continueStage(one.opening.id, followUp.id, state),
        ),
      });
    }
    variation.followUps = byStep;
  }
  return views;
}

const cardOf = (move: { before: string; uci: string }) => `move:${move.before}:${move.uci}`;

/** The step-row actions every page with a variation list or step rows shares (docs/v2/components/step-row.md). */
export function useStepActions(opening: BuiltOpening) {
  const [skipAsk, rememberSkip] = useSkipAsk(opening.id);
  const gates = useGates(opening.id);
  return {
    gates,
    skipAsk,
    onSkipAsk: rememberSkip,
    onLearn: (step: StepData) =>
      go(
        step.followUp
          ? followUpHref(opening.id, step.number, step.followUp.index + 1, 'learn')
          : stepHref(opening.id, step.number, 'learn'),
      ),
    onTry: (step: StepData) =>
      go(
        step.followUp
          ? followUpHref(opening.id, step.number, step.followUp.index + 1, 'try')
          : stepHref(opening.id, step.number, 'try'),
      ),
    onTestOut: (step: StepData) =>
      go(
        step.followUp
          ? followUpHref(opening.id, step.number, step.followUp.index + 1, 'try')
          : `${stepHref(opening.id, step.number, 'try')}&test=1`,
      ),
    onGoToStep: (n: number) => go(stepHref(opening.id, n)),
    onCheckpoint: (variation: VariationData | null) =>
      go(variation ? checkpointHref(opening.id, variation.id) : finalTestHref(opening.id)),
  };
}

/** The ideas an opening lists, as idea badges know them (an id no idea has is left out). */
export function openingIdeas(catalog: Catalog, ids: readonly string[]): Idea[] {
  return ids.flatMap((id) => {
    const idea = catalog.ideas.find((candidate) => candidate.id === id);
    return idea ? [{ id: idea.id, name: idea.name, kind: idea.kind, summary: idea.summary }] : [];
  });
}

/** Up to `count` puzzles the learner's side solves, matched as closely as can be. */
export function topPuzzles(puzzles: readonly ShippedPuzzle[], count: number, levels?: readonly string[]) {
  const order = siteConfig.puzzles.levels as readonly string[];
  return puzzles
    .filter((puzzle) => puzzle.mine !== false && (!levels || levels.includes(puzzle.level)))
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
    .slice(0, count);
}
