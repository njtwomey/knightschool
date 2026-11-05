import {
  chosenScope,
  dueCards,
  pickedOpenings,
  type Card,
  type ChosenScope,
  type DrillScopeOptions,
} from '@knightschool/core';
import type { ShippedPuzzle } from '@/data/content';
import { inProgressOf, type LearnerProgress, type OpeningProgress } from './progress';

/*
 * What ticking does to practice (docs/v2/stores/repertoire.md). With anything ticked, the repertoire is what Today,
 * Review, Drill, Puzzles and the daily new moves draw on: `progress.chosen` holds each opening cut to what is ticked, and
 * `progress.due` only its cards. Cards outside stay in the log and on their schedule, and come back when ticked again.
 * With nothing ticked, all of this is empty and practice runs as it always has. `progress.openings` is never cut.
 */

const dueKinds = (due: readonly Card[]) => ({
  moves: due.filter((card) => card.id.startsWith('move:')).length,
  puzzles: due.filter((card) => card.id.startsWith('puzzle:')).length,
  questions: due.filter((card) => card.id.startsWith('quiz:')).length,
});

/** One opening cut to what is ticked. A ticked step counts as open however far off it is: the learner asked for it. */
function chosenView(one: OpeningProgress, scope: ChosenScope, progress: LearnerProgress): OpeningProgress {
  const ids = new Set(scope.steps.map((step) => step.id));
  const keep = <V>(map: ReadonlyMap<string, V>) => new Map([...map].filter(([id]) => ids.has(id)));
  const stepCounts = keep(one.stepCounts);
  const stepStates = new Map(
    [...keep(one.stepStates)].map(([id, state]) => [id, state === 'locked' ? ('open' as const) : state]),
  );
  const cards = one.cards.filter((card) => ids.has(card.step));
  const dueIds = new Set(progress.allDue.map((card) => card.id));
  return {
    ...one,
    inProgress: undefined,
    scope,
    cards,
    stepCounts,
    stepStates,
    started: true,
    due: [...scope.cards].filter((id) => dueIds.has(id)).length,
    checkpoints: one.checkpoints.filter((checkpoint) => scope.variations.has(checkpoint.variation)),
    ...inProgressOf(one.opening, cards, stepCounts, progress.reviews),
  };
}

/** Whether a card is in the repertoire. Kinds that belong to no opening (a game deviation) always are. */
function inRepertoire(card: Card, chosen: readonly OpeningProgress[], progress: LearnerProgress): boolean {
  if (card.id.startsWith('move:')) return chosen.some((one) => one.scope!.cards.has(card.id));
  if (card.id.startsWith('quiz:')) {
    return chosen.some((one) =>
      one.opening.questions?.some(
        (question) =>
          `quiz:${one.opening.id}:${question.id}` === card.id && one.scope!.variations.has(question.variation),
      ),
    );
  }
  if (card.id.startsWith('puzzle:')) {
    const owner = progress.duePuzzles.get(card.id);
    const one = chosen.find((candidate) => candidate.opening.id === owner?.opening);
    return Boolean(one && (!owner?.line || one.scope!.lines.has(owner.line)));
  }
  return true;
}

/**
 * Cuts practice to `picks`, from the whole picture in `progress`: `loadProgress` does this with the stored picks, and
 * the repertoire page does it again as a tick changes.
 */
export function withRepertoire(progress: LearnerProgress, picks: readonly string[], now = new Date()): LearnerProgress {
  const picked = new Set(pickedOpenings(picks));
  const chosen = progress.openings.flatMap((one) => {
    if (!picked.has(one.opening.id)) return [];
    const scope = chosenScope(one.opening, picks);
    return scope.steps.length ? [chosenView(one, scope, progress)] : [];
  });
  const shown = chosen.length ? progress.cards.filter((card) => inRepertoire(card, chosen, progress)) : progress.cards;
  const due = dueCards(shown, now);
  const dueIds = new Set(due.map((card) => card.id));
  const later = shown
    .filter((card) => !dueIds.has(card.id))
    .map((card) => new Date(card.due))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const { nextDue: _nextDue, ...rest } = progress;
  return { ...rest, chosen, due, dueByKind: dueKinds(due), ...(later ? { nextDue: later } : {}) };
}

/** Whether anything is ticked. */
export const hasPicks = (progress: LearnerProgress) => progress.chosen.length > 0;

/** Moves and questions due outside the repertoire. */
export const dueOutside = (progress: LearnerProgress) => progress.allDue.length - progress.due.length;

/** The whole openings with something ticked (coverage asks of the opening, not of the ticks), or those started. */
export function coverageOpenings(progress: LearnerProgress): OpeningProgress[] {
  if (!hasPicks(progress)) return progress.openings.filter((one) => one.started);
  const ids = new Set(progress.chosen.map((one) => one.opening.id));
  return progress.openings.filter((one) => ids.has(one.opening.id));
}

/** A drill of the opening limited to what is ticked. */
export const drillOptions = (one: OpeningProgress): DrillScopeOptions =>
  one.scope?.ends ? { ends: one.scope.ends } : {};

/** The puzzles of the lines ticked; a puzzle matched to no one line comes with its opening. */
export const chosenPuzzles = <T extends Pick<ShippedPuzzle, 'line'>>(one: OpeningProgress, puzzles: readonly T[]) =>
  one.scope ? puzzles.filter((puzzle) => !puzzle.line || one.scope!.lines.has(puzzle.line)) : [...puzzles];
