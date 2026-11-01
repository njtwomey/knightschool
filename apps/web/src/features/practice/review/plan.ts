import {
  moveExercise,
  moveInto,
  parseMoveCardId,
  pickWeighted,
  planIntroductions,
  shuffled,
  type Exercise,
  type MoveCardDefinition,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import type { PracticeConfig } from '@/components/practice/practice-config';
import type { ShippedPuzzle } from '@/data/content';
import { siteConfig } from '@/data/site-config';
import { mergeFacts, mergeOpenings } from '../merge';
import { practiceOpenings, puzzlesOf, startedOpenings, type LearnerProgress, type OpeningProgress } from '../progress';
import { puzzleExercise } from '../puzzles/puzzle-data';
import { scopeOf } from '../sources';

/** One review session, worked out once when it starts: the move cards, then any puzzle cards. */
export type ReviewPlan = {
  moves: Exercise[];
  puzzles: Exercise[];
  /** New cards in `moves`, counted against today's allowance. */
  introduced: number;
  /** Where each card comes from: "Italian Game, step 1". */
  context: Record<string, string>;
  /** Free practice: nothing is saved. */
  free: boolean;
  opening?: BuiltOpening;
  facts?: OpeningFacts;
};

/** Where each move card of the openings is taught, by card id. */
function contextOf(openings: readonly OpeningProgress[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const one of openings) {
    for (const card of one.cards) {
      const n = one.opening.steps.findIndex((step) => step.id === card.step) + 1;
      out[card.id] ??= `${one.opening.name}, step ${n}`;
    }
  }
  return out;
}

function exerciseOf(card: { epd: string; uci: string }, openings: readonly OpeningProgress[]): Exercise {
  const before = openings.map((one) => moveInto(one.opening, card.epd)).find(Boolean);
  return moveExercise(card, { mode: 'review', ...(before ? { before } : {}) });
}

function merged(openings: readonly OpeningProgress[]) {
  return {
    opening: mergeOpenings(openings.map((one) => one.opening)),
    facts: mergeFacts(openings.map((one) => one.facts)),
  };
}

/** The shipped puzzles of the learner's openings, by Lichess id. */
export async function shippedPuzzles(progress: LearnerProgress): Promise<Map<string, ShippedPuzzle>> {
  const lists = await Promise.all(practiceOpenings(progress).map((one) => puzzlesOf(one.opening.id).catch(() => [])));
  return new Map(lists.flat().map((puzzle) => [puzzle.id, puzzle]));
}

/**
 * Today's due session (docs/v2/pages/review.md): the cards due, the most overdue first, up to `schedule.sessionSize`
 * (a puzzle card only when its puzzle is shipped), then new cards up to what is left of `schedule.newPerDay`, in step
 * order, taking turns between the learner's openings, from steps that are open or being learned.
 */
export function duePlan(progress: LearnerProgress, puzzles: ReadonlyMap<string, ShippedPuzzle>): ReviewPlan {
  const openings = startedOpenings(progress);
  const moves: Exercise[] = [];
  const puzzleCards: Exercise[] = [];
  for (const card of progress.due) {
    if (moves.length + puzzleCards.length >= siteConfig.schedule.sessionSize.default) break;
    const move = parseMoveCardId(card.id);
    if (move) moves.push(exerciseOf(move, progress.openings));
    else if (card.id.startsWith('puzzle:')) {
      const puzzle = puzzles.get(card.id.slice('puzzle:'.length));
      if (puzzle) puzzleCards.push(puzzleExercise(puzzle));
    }
  }
  const have = new Set(progress.cards.map((card) => card.id));
  const offers = openings.map((one) =>
    one.cards.filter((card) => ['open', 'learning'].includes(one.stepStates.get(card.step) ?? '')),
  );
  const fresh = planIntroductions(offers, have, progress.newLeft);
  moves.push(...fresh.map((card) => exerciseOf(card, progress.openings)));
  return {
    moves,
    puzzles: puzzleCards,
    introduced: fresh.length,
    context: contextOf(progress.openings),
    free: false,
    ...merged(progress.openings),
  };
}

/**
 * Free practice of some material (`/practice/review/<opening>`, or any source but Due today): its move cards, those
 * already in the learner's reviews when there are any, up to a session's worth, never saved.
 */
export function freePlan(progress: LearnerProgress, config: PracticeConfig, random = Math.random): ReviewPlan {
  const scope = scopeOf(config.source);
  const openings = scope
    ? progress.openings.filter((one) => one.opening.id === scope.opening)
    : config.source === 'everything'
      ? progress.openings
      : practiceOpenings(progress);
  const inScope = (one: OpeningProgress, card: MoveCardDefinition) =>
    !scope?.variation || one.opening.steps.find((step) => step.id === card.step)?.variation === scope.variation;
  const all = openings.flatMap((one) => one.cards.filter((card) => inScope(one, card)));
  const byId = new Map(progress.cards.map((card) => [card.id, card]));
  const known = all.filter((card) => byId.has(card.id));
  let pool = known.length ? known : all;
  const size = siteConfig.schedule.sessionSize.default;
  let picked: MoveCardDefinition[];
  if (config.source === 'hardest') {
    pool = known;
    picked = [...pool]
      .sort(
        (a, b) =>
          byId.get(b.id)!.lapses - byId.get(a.id)!.lapses || byId.get(b.id)!.difficulty - byId.get(a.id)!.difficulty,
      )
      .slice(0, size);
  } else if (config.weighting === 'popular') {
    const facts = mergeFacts(openings.map((one) => one.facts));
    const left = pool.map((card) => ({ card, weight: facts?.counts[card.epd]?.games ?? 1 }));
    picked = [];
    while (picked.length < size && left.length) {
      const choice = pickWeighted(left, random())!;
      picked.push(choice.card);
      left.splice(left.indexOf(choice), 1);
    }
  } else picked = shuffled(pool, random).slice(0, size);
  return {
    moves: picked.map((card) => exerciseOf(card, openings)),
    puzzles: [],
    introduced: 0,
    context: contextOf(openings),
    free: true,
    ...merged(openings),
  };
}
