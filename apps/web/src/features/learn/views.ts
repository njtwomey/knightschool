import type { BuiltOpening } from '@knightschool/core/content';
import type { OpeningSummary } from '@/components/openings/types';
import type { StepData } from '@/components/openings/steps';
import type { VariationData } from '@/components/openings/variation-list';
import type { ProgressState } from '@/components/progress/states';
import type { Catalog } from '@/data/content';
import { to } from '@/router/location';
import { stepMoves } from './model';

export const openingHref = (id: string) => to(`/openings/${id}`);
export const stepHref = (id: string, n: number, stage?: string) =>
  to(`/openings/${id}/step/${n}${stage ? `#stage=${stage}` : ''}`);

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

type StepInfo = { state: ProgressState; counts: { mine: number; known: number; inReviews: number } };

/** An opening's variations and steps, as the variation list shows them. */
export function variationViews(opening: BuiltOpening, info: Map<string, StepInfo>): VariationData[] {
  let number = 0;
  return opening.variations.map((variation, v) => {
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
        };
      });
    const states = steps.map((step) => step.state);
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
      checkpoint: {
        positions: total,
        state: states.every((s) => s === 'known' || s === 'mastered') ? 'open' : 'locked',
      },
    };
  });
}

const runMove = (move: { san: string; uci: string; after: string }) => ({
  san: move.san,
  uci: move.uci,
  after: move.after,
});
