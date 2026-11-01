import { cutToDepth, drawRound, speedLines, type Card, type SpeedLine } from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import type { PracticeConfig } from '@/components/practice/practice-config';
import { loadCatalog, loadFacts, loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import type { ReviewRow } from '@/data/learner-store';
import { stepStates } from '@/features/learn/model';
import { scopeOf } from '../sources';

export type SpeedData = {
  openings: BuiltOpening[];
  facts: Record<string, OpeningFacts | undefined>;
  cards: Card[];
  reviews: ReviewRow[];
};

/** Every opening with its facts, and the learner's cards and answers (an opening rush plays only known steps). */
export async function loadSpeedData(): Promise<SpeedData> {
  const catalog = await loadCatalog();
  const openings = await Promise.all(catalog.openings.map((opening) => loadOpening(opening.id)));
  const facts = Object.fromEntries(
    await Promise.all(
      openings.map(async (opening) => [opening.id, await loadFacts(opening.id).catch(() => undefined)] as const),
    ),
  );
  const store = await learnerStore();
  const cards = await store.cards.all();
  const reviews = await store.reviews.forCards(cards.map((card) => card.id));
  return { openings, facts, cards, reviews };
}

/** One line of a run: what it is called, and the moves to play (from the start of the game). */
export type RunLine = SpeedLine & { name: string; variation?: string; script: string[] };

/** The run's kind and size from the set-up (`lines:5` or `time:60`). */
export function runShape(config: PracticeConfig): { kind: 'lines' | 'time'; size: number } {
  const [kind, size] = config.run.split(':');
  return { kind: kind === 'time' ? 'time' : 'lines', size: Number(size) || 1 };
}

/** The opening a rush source names (`rush:<opening>`), or null. */
export const rushOf = (source: string) => (source.startsWith('rush:') ? source.slice('rush:'.length) : null);

/**
 * The lines a source holds, each ready to play: an opening or variation's lines cut to the depth, every opening's for
 * the fixed sources, or for a rush each known step of the opening from the start to its end (the depth ignored).
 */
export function poolOf(data: SpeedData, config: PracticeConfig): RunLine[] {
  const rush = rushOf(config.source);
  if (rush) {
    const opening = data.openings.find((o) => o.id === rush);
    if (!opening) return [];
    const { states } = stepStates(opening, data.cards, data.reviews);
    return opening.steps.flatMap((step, n) => {
      const state = states.get(step.id);
      if (state !== 'known' && state !== 'mastered') return [];
      const line = opening.lines.find((l) => l.id === step.line)!;
      const games = data.facts[opening.id]?.counts[startOf(opening, line.moves, step.from)]?.games;
      return [
        {
          opening: opening.id,
          line: `${step.line}:${n + 1}`,
          side: opening.side,
          moves: line.moves.slice(0, step.to + 1),
          weight: Math.max(1, games ?? 1),
          name: `Step ${n + 1}${step.title ? `: ${step.title}` : ''}`,
          variation: line.name,
          script: line.moves.slice(0, step.to + 1),
        },
      ];
    });
  }
  const scope = scopeOf(config.source);
  const openings = scope ? data.openings.filter((o) => o.id === scope.opening) : data.openings;
  return openings.flatMap((opening) =>
    speedLines(opening, data.facts[opening.id]?.counts, scope?.variation).map((line) => {
      const built = opening.lines.find((l) => l.id === line.line)!;
      return {
        ...line,
        name: opening.name,
        variation: built.name ?? opening.variations.find((v) => v.id === built.variation)?.name,
        script: cutToDepth(line.moves, line.side, config.depth),
      };
    }),
  );
}

/** The position a step's stretch begins at, by walking its line. */
function startOf(opening: BuiltOpening, moves: readonly string[], ply: number): string {
  let epd = opening.startEpd;
  for (let i = opening.startPly; i < ply; i++) {
    const next = opening.positions[epd]?.moves.find((move) => move.uci === moves[i]);
    if (!next) break;
    epd = next.to;
  }
  return epd;
}

/** The queue of a run: a set draws its lines once each where it can; a timed run goes round until the clock stops. */
export function queueOf(pool: readonly RunLine[], config: PracticeConfig, random = Math.random): RunLine[] {
  const { kind, size } = runShape(config);
  const count = kind === 'lines' ? size : Math.max(1, pool.length) * 50;
  return drawRound(pool, count, config.weighting === 'popular', random);
}

/** Where the best score for a set-up is kept (the learner's settings, which export with everything else). */
export const bestKey = (config: PracticeConfig) => `speed.best:${config.source}:${config.run}:${config.depth}`;
