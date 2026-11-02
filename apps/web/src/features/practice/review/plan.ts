import {
  moveCardId,
  moveExercise,
  moveInto,
  parseMoveCardId,
  pickWeighted,
  planIntroductions,
  playMove,
  quizCardId,
  runExercise,
  shuffled,
  type Exercise,
  type MoveCardDefinition,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { positionPlies } from '@knightschool/core/content';
import type { PracticeConfig } from '@/components/practice/practice-config';
import type { ShippedPuzzle } from '@/data/content';
import { getSetting } from '@/data/settings';
import { mergeFacts, mergeOpenings } from '../merge';
import { practiceOpenings, puzzlesOf, startedOpenings, type LearnerProgress, type OpeningProgress } from '../progress';
import { puzzleExercise } from '../puzzles/puzzle-data';
import { askedOf, type Asked } from '../questions/asked';
import { scopeOf } from '../sources';

/** One review session, worked out once when it starts: the move cards, the question cards, then any puzzle cards. */
export type ReviewPlan = {
  moves: Exercise[];
  questions: Asked[];
  puzzles: Exercise[];
  /** New cards in `moves` and `questions`, counted against today's allowance once answered. */
  introduced: number;
  /** Where each card comes from: "Italian Game, step 1". */
  context: Record<string, string>;
  /** Free practice: nothing is saved. */
  free: boolean;
  opening?: BuiltOpening;
  facts?: OpeningFacts;
};

/** Where each move card of the openings is taught, by card id: the line's name and the step's title. */
function contextOf(openings: readonly OpeningProgress[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const one of openings) {
    for (const card of one.cards) {
      const step = one.opening.steps.find((candidate) => candidate.id === card.step);
      const line = one.opening.lines.find((candidate) => candidate.id === step?.line);
      out[card.id] ??= `${line?.name ?? one.opening.name}${step?.title ? `: ${step.title}` : ''}`;
    }
  }
  return out;
}

/**
 * A move card as a question of `moves` moves (setting `review.movesPerQuestion`, 0 the rest of the line), along the
 * line of the step that teaches it in the first opening that has it. `allowed` keeps a run to cards the learner has.
 */
function exerciseOf(
  card: { epd: string; uci: string },
  openings: readonly OpeningProgress[],
  moves: number,
  allowed?: (id: string) => boolean,
): Exercise {
  const id = moveCardId(card.epd, card.uci);
  const home = openings.find((one) => one.cards.some((candidate) => candidate.id === id)) ?? openings[0];
  const before = openings.map((one) => moveInto(one.opening, card.epd)).find(Boolean);
  const startPly = openings.map((one) => positionPlies(one.opening).get(card.epd)).find((ply) => ply !== undefined);
  const step = home?.cards.find((candidate) => candidate.id === id)?.step;
  const options = {
    mode: 'review' as const,
    moves,
    ...(allowed ? { allowed } : {}),
    ...(before ? { before } : {}),
    ...(startPly !== undefined ? { startPly } : {}),
  };
  if (!home) return moveExercise(card, options);
  return runExercise(home.opening, { ...card, ...(step ? { step } : {}) }, options);
}

/** The card ids a run asks, its first and every later learner move of its script. */
function runCards(exercise: Exercise): string[] {
  if (exercise.responder.kind !== 'scripted') return [exercise.id];
  const out: string[] = [];
  let epd = exercise.start;
  exercise.responder.script.forEach((uci, i) => {
    if (i % 2 === 0) out.push(moveCardId(epd, uci));
    const next = playMove(epd, uci);
    if (next) epd = next.epd;
  });
  return out;
}

function merged(openings: readonly OpeningProgress[]) {
  return {
    opening: mergeOpenings(openings.map((one) => one.opening)),
    facts: mergeFacts(openings.map((one) => one.facts)),
  };
}

/** The question a question card asks (`quiz:<opening>:<id>`), if its opening still has it. */
function questionOf(cardId: string, openings: readonly OpeningProgress[]): Asked | undefined {
  for (const one of openings) {
    const question = one.opening.questions?.find((candidate) => quizCardId(one.opening.id, candidate.id) === cardId);
    if (question) return askedOf(one.opening, question);
  }
  return undefined;
}

/** The questions of the variations the learner has begun (a step learning or known), in the opening's order. */
function questionOffers(openings: readonly OpeningProgress[]): Asked[] {
  return openings.flatMap((one) => {
    const begun = new Set(
      one.opening.steps
        .filter((step) => ['learning', 'known', 'mastered'].includes(one.stepStates.get(step.id) ?? ''))
        .map((step) => step.variation),
    );
    return (one.opening.questions ?? [])
      .filter((question) => begun.has(question.variation))
      .map((question) => askedOf(one.opening, question));
  });
}

/** The shipped puzzles of the learner's openings, by Lichess id. */
export async function shippedPuzzles(progress: LearnerProgress): Promise<Map<string, ShippedPuzzle>> {
  const lists = await Promise.all(practiceOpenings(progress).map((one) => puzzlesOf(one.opening.id).catch(() => [])));
  return new Map(lists.flat().map((puzzle) => [puzzle.id, puzzle]));
}

/**
 * Today's due session (docs/v2/pages/review.md): the cards due, the most overdue first, up to the learner's
 * `review.sessionSize` (a puzzle card only when its puzzle is shipped, a question card only while its opening has it),
 * then new cards up to what is left of `review.newPerDay`: moves in step order, taking turns between the learner's
 * openings, from steps that are open or being learned, then the questions of the variations begun. Each move card asks
 * `config.movesPerQuestion` moves; a later move of a run that is due itself is not asked twice.
 */
export function duePlan(
  progress: LearnerProgress,
  puzzles: ReadonlyMap<string, ShippedPuzzle>,
  config: Pick<PracticeConfig, 'movesPerQuestion'>,
): ReviewPlan {
  const openings = startedOpenings(progress);
  const size = getSetting('review.sessionSize');
  const have = new Set(progress.cards.map((card) => card.id));
  const moves: Exercise[] = [];
  const questions: Asked[] = [];
  const puzzleCards: Exercise[] = [];
  const asked = new Set<string>();
  const count = () => moves.length + questions.length + puzzleCards.length;
  for (const card of progress.due) {
    if (count() >= size) break;
    if (asked.has(card.id)) continue;
    const move = parseMoveCardId(card.id);
    if (move) {
      const exercise = exerciseOf(move, progress.openings, config.movesPerQuestion, (id) => have.has(id));
      runCards(exercise).forEach((id) => asked.add(id));
      moves.push(exercise);
    } else if (card.id.startsWith('quiz:')) {
      const question = questionOf(card.id, progress.openings);
      if (question) questions.push(question);
    } else if (card.id.startsWith('puzzle:')) {
      const puzzle = puzzles.get(card.id.slice('puzzle:'.length));
      if (puzzle) puzzleCards.push(puzzleExercise(puzzle));
    }
  }
  const offers = openings.map((one) =>
    one.cards.filter((card) => ['open', 'learning'].includes(one.stepStates.get(card.step) ?? '')),
  );
  const fresh = planIntroductions(offers, have, progress.newLeft).filter((card) => !asked.has(card.id));
  // A new card is asked alone: a run would carry on into moves not met yet.
  moves.push(...fresh.map((card) => exerciseOf(card, progress.openings, 1)));
  const freshQuestions = questionOffers(openings)
    .filter((one) => !have.has(one.cardId))
    .slice(0, Math.max(0, progress.newLeft - fresh.length));
  questions.push(...freshQuestions);
  return {
    moves,
    questions,
    puzzles: puzzleCards,
    introduced: fresh.length + freshQuestions.length,
    context: contextOf(progress.openings),
    free: false,
    ...merged(progress.openings),
  };
}

/**
 * Free practice of some material (`/practice/review/<opening>`, or any source but Due today): its move cards and
 * questions, those already in the learner's reviews when there are any, up to a session's worth, never saved. "My
 * repertoire" is every opening started (or every opening when none is), "Everything" every opening there is.
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
  const size = getSetting('review.sessionSize');
  const allQuestions = openings.flatMap((one) =>
    (one.opening.questions ?? [])
      .filter((question) => !scope?.variation || question.variation === scope.variation)
      .map((question) => askedOf(one.opening, question)),
  );
  const knownQuestions = allQuestions.filter((one) => byId.has(one.cardId));
  let questionPool =
    config.source === 'hardest' ? knownQuestions : knownQuestions.length ? knownQuestions : allQuestions;
  if (config.source === 'hardest') questionPool = questionPool.filter((one) => (byId.get(one.cardId)?.lapses ?? 0) > 0);
  // Questions take their share of the session by how many there are beside the moves.
  const questionCount = Math.min(
    questionPool.length,
    Math.round((size * questionPool.length) / Math.max(1, questionPool.length + pool.length)),
  );
  const moveCount = size - questionCount;
  let picked: MoveCardDefinition[];
  if (config.source === 'hardest') {
    pool = known;
    picked = [...pool]
      .sort(
        (a, b) =>
          byId.get(b.id)!.lapses - byId.get(a.id)!.lapses || byId.get(b.id)!.difficulty - byId.get(a.id)!.difficulty,
      )
      .slice(0, moveCount);
  } else if (config.weighting === 'popular') {
    const facts = mergeFacts(openings.map((one) => one.facts));
    const left = pool.map((card) => ({ card, weight: facts?.counts[card.epd]?.games ?? 1 }));
    picked = [];
    while (picked.length < moveCount && left.length) {
      const choice = pickWeighted(left, random())!;
      picked.push(choice.card);
      left.splice(left.indexOf(choice), 1);
    }
  } else picked = shuffled(pool, random).slice(0, moveCount);
  return {
    moves: picked.map((card) => exerciseOf(card, openings, config.movesPerQuestion)),
    questions: shuffled(questionPool, random).slice(0, questionCount),
    puzzles: [],
    introduced: 0,
    context: contextOf(openings),
    free: true,
    ...merged(openings),
  };
}
