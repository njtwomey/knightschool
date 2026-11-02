import { lineEarnsCards, type ItemState } from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import type { LineKind } from '@/components/chess/kind-badge';
import type { LineData } from '@/components/openings/line-row';
import type { OpeningSummary } from '@/components/openings/types';
import { stepTitle, type StepData } from '@/components/openings/steps';
import type { VariationData } from '@/components/openings/variation-list';
import type { ProgressState } from '@/components/progress/states';
import type { Catalog } from '@/data/content';
import { to } from '@/router/location';
import { siteConfig } from '@/data/site-config';
import { branchPly, lineCardIds, lineMoves, stepMoves } from './model';
import { continueStage, rememberedStage, type Stage } from './stage-memory';

export const openingHref = (id: string) => to(`/openings/${id}`);
/** A step's page (docs/v2/pages/step.md): `range` plays only its moves a to b; `stage` opens that stage. */
export const stepHref = (id: string, n: number, stage?: Stage, range?: [number, number]) =>
  to(`/openings/${id}/step/${n}${range ? `/${range[0]}-${range[1]}` : ''}${stage ? `#stage=${stage}` : ''}`);
/** A step's follow-up `k` (from 1): `#stage=learn|try|done`. */
export const followUpHref = (id: string, n: number, k: number, stage?: Stage) =>
  to(`/openings/${id}/step/${n}/follow-up/${k}${stage ? `#stage=${stage}` : ''}`);
export const checkpointHref = (id: string, variation: string) => to(`/openings/${id}/${variation}/checkpoint`);
export const variationHref = (id: string, variation: string) => to(`/openings/${id}/${variation}`);
export const linesHref = (id: string) => to(`/openings/${id}/lines`);
/** A line inside an opening (docs/v2/pages/line.md), taught through the same stages as a step. */
export const lineHref = (id: string, line: string, stage?: Stage) =>
  to(`/openings/${id}/lines/${line}${stage ? `#stage=${stage}` : ''}`);
export const finalTestHref = (id: string) => to(`/openings/${id}/test`);
export const mapHref = (id: string) => to(`/openings/${id}/map`);

/** A catalogue entry as an opening card. */
export function openingSummary(entry: Catalog['openings'][number]): OpeningSummary {
  return {
    id: entry.id,
    name: entry.name,
    side: entry.side,
    trigger: entry.side === 'white' ? 'As White' : 'As Black',
    suits: entry.summary,
    style: entry.style.filter((tag): tag is OpeningSummary['style'][number] =>
      ['solid', 'attacking', 'gambit', 'trap-heavy', 'classical'].includes(tag),
    ),
    level: entry.level === 'first' ? 'beginners' : 'improvers',
    thumb: { epd: entry.startEpd, orientation: entry.side },
    size: { variations: entry.variations.length, steps: entry.steps, hours: Math.max(1, Math.round(entry.moves / 20)) },
    href: openingHref(entry.id),
  };
}

type StepInfo = {
  state: ProgressState;
  counts: { mine: number; known: number; inReviews: number };
  /** Plies of the learner's moves in the step that are known (ticked in its run). */
  known?: number[];
};

/** A variation's checkpoint as recorded: cleared when its latest attempt passed (features/practice/progress.ts). */
export type CheckpointRecord = { cleared: boolean; score?: string; positions?: number };

/** An opening's variations and steps, as the variation list shows them. */
export function variationViews(
  opening: BuiltOpening,
  info: Map<string, StepInfo>,
  checkpoints: ReadonlyMap<string, CheckpointRecord> = new Map(),
): VariationData[] {
  let number = 0;
  const views = opening.variations.map((variation, v): VariationData => {
    const steps: StepData[] = opening.steps
      .filter((step) => step.variation === variation.id)
      .map((step) => {
        number += 1;
        const { before, moves } = stepMoves(opening, step);
        const lead = before.slice(Math.max(opening.startPly, before.length - 2));
        const state = info.get(step.id)?.state ?? 'open';
        return {
          id: step.id,
          number,
          ...(step.title ? { title: step.title } : {}),
          state,
          side: opening.side,
          ...(lead.length ? { lead: { moves: lead.map(runMove), firstPly: lead[0]!.ply } } : {}),
          stretches: [{ moves: moves.map(runMove), firstPly: moves[0]?.ply ?? step.from }],
          counts: info.get(step.id)?.counts ?? { mine: 0, known: 0, inReviews: 0 },
          ...(info.get(step.id)?.known ? { known: info.get(step.id)!.known } : {}),
          // A step in progress has been tried: what is left is to try it again until every move is known.
          // The stage reached: where this device left it, else Try for a step being learned.
          ...stageReached(opening.id, step.id, state),
          // A click on the row continues where the learner left off.
          href: stepHref(opening.id, number, continueStage(opening.id, step.id, state)),
        };
      });
    const states = steps.map((step) => step.state);
    const recorded = checkpoints.get(variation.id);
    const known = steps.reduce((sum, step) => sum + step.counts.known, 0);
    const total = steps.reduce((sum, step) => sum + step.counts.mine, 0);
    return {
      id: variation.id,
      number: v + 1,
      name: variation.name ?? variation.id,
      decision: variation.intro ?? '',
      ...(variation.intro ? { intro: variation.intro } : {}),
      state: states.every((s) => s === 'mastered')
        ? 'mastered'
        : states.every((s) => s === 'known' || s === 'mastered')
          ? 'known'
          : states.some((s) => s !== 'open' && s !== 'locked')
            ? 'learning'
            : states[0] === 'locked'
              ? 'locked'
              : 'open',
      progress: { total, known, mastered: 0 },
      steps,
      href: variationHref(opening.id, variation.id),
      checkpoint: {
        href: checkpointHref(opening.id, variation.id),
        positions: recorded?.positions ?? total,
        state: recorded?.cleared
          ? 'cleared'
          : states.every((s) => s === 'known' || s === 'mastered')
            ? 'open'
            : 'locked',
        ...(recorded?.score ? { score: recorded.score } : {}),
      },
    };
  });
  // A locked step opens when the step before it is known: name it by its title or headline.
  const rows = views.flatMap((variation) => variation.steps);
  rows.forEach((row, i) => {
    const before = rows[i - 1];
    if (row.state === 'locked' && before)
      row.opensWhen = { number: before.number, name: stepTitle(before), href: stepHref(opening.id, before.number) };
  });
  return views;
}

/** A step's or follow-up's stage dot: the stage last opened on this device, or Try for one being learned. */
export function stageReached(opening: string, step: string, state: ProgressState): { stage?: number } {
  if (state === 'known' || state === 'mastered' || state === 'locked') return {};
  const stages = siteConfig.teach.stages as readonly string[];
  const left = rememberedStage(opening, step);
  const at = left ? stages.indexOf(left) : state === 'learning' ? stages.indexOf('try') : -1;
  return at >= 0 ? { stage: at } : {};
}

const runMove = (move: { san: string; uci: string; after: string }) => ({
  san: move.san,
  uci: move.uci,
  after: move.after,
});

/** The kind as the kind badge words it: a trap to spring is "for us", a danger "against us", for the line's side. */
export const KIND_SHOWN: Record<BuiltOpening['lines'][number]['kind'], LineKind> = {
  main: 'main',
  sideline: 'sideline',
  rare: 'rare',
  gambit: 'gambit',
  trap: 'for-us',
  danger: 'against-us',
};

/**
 * An opening's lines as line rows: each from where it branches off the lines before it, with the share of its moves
 * the learner knows (a line has no state of its own) and Learn at the step teaching its first move not yet known.
 */
export function lineViews(opening: BuiltOpening, states: ReadonlyMap<string, ItemState>): LineData[] {
  const stepOfCard = new Map<string, number>();
  opening.steps.forEach((step, i) => {
    for (const move of stepMoves(opening, step).moves) {
      if (move.mine)
        stepOfCard.set(`move:${move.before}:${move.uci}`, stepOfCard.get(`move:${move.before}:${move.uci}`) ?? i + 1);
    }
  });
  return opening.lines.map((line) => {
    const branch = branchPly(opening, line.id);
    const moves = lineMoves(opening, line.id);
    const own = moves.slice(branch);
    const opponentMove = own[0] && !own[0].mine ? own[0] : undefined;
    const ids = lineEarnsCards(line) ? lineCardIds(opening, line.id) : [];
    const known = ids.filter((id) => ['known', 'mastered'].includes(states.get(id) ?? '')).length;
    const mastered = ids.filter((id) => states.get(id) === 'mastered').length;
    const firstUnknown = ids.find((id) => !['known', 'mastered'].includes(states.get(id) ?? ''));
    const learnStep = stepOfCard.get(firstUnknown ?? ids[0] ?? '');
    const last = moves.at(-1);
    return {
      id: line.id,
      name: line.name ?? line.id,
      variation: opening.variations.find((variation) => variation.id === line.variation)?.name ?? line.variation,
      kind: KIND_SHOWN[line.kind],
      writtenFor: opening.side,
      ...(opponentMove ? { opponent: { ply: opponentMove.ply, move: runMove(opponentMove) } } : {}),
      moves: own.map(runMove),
      firstPly: own[0]?.ply ?? branch,
      side: opening.side,
      known: { total: ids.length, known, mastered },
      thumb: {
        epd: last?.after ?? opening.startEpd,
        ...(last ? { lastMove: { from: last.uci.slice(0, 2), to: last.uci.slice(2, 4) } } : {}),
        orientation: opening.side,
      },
      ...(line.alternative ? { alternative: true } : {}),
      href: lineHref(opening.id, line.id),
      ...(learnStep ? { learnHref: stepHref(opening.id, learnStep) } : {}),
    };
  });
}
