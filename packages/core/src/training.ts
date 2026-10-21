import { MIN_POPULARITY_FOR_CARD, SESSION_SIZE } from './constants';
import { newId } from './ids';
import { pickWeighted, popularityWeight, type Weighting } from './sampling';
import type { Attempt } from './attempt';
import { newCard, scheduleReview } from './scheduler';
import type { LineNode, OpeningContent } from './schema/content';
import { lineSteps, variantPath } from './tree-helpers';

/** What decides which positions earn cards: the popularity cut-off, and whether rare lines are included. */
export type CardOptions = { minPopularity?: number; includeRare?: boolean };
const optionsOf = (options: number | CardOptions): CardOptions =>
  typeof options === 'number' ? { minPopularity: options } : options;
import type { RatingName } from './grading';
import type { Card, QuizAttempt, Review } from './schema/user';
import type { FSRS } from 'ts-fsrs';

export type CardDefinition = Pick<Card, 'id' | 'openingId' | 'epd' | 'expectedUci'>;

export const cardId = (openingId: string, epd: string) => `${openingId}:${epd}`;

/** Quizzes are cards too, scheduled by the same FSRS instance; their ids start with `quiz:`. */
export const quizCardId = (openingId: string, quizId: string) => `quiz:${openingId}:${quizId}`;
export const isQuizCard = (card: { id: string }) => card.id.startsWith('quiz:');
export const QUIZ_EVERY = 4;

export function quizDefinitions(content: OpeningContent): CardDefinition[] {
  return content.quizzes.map((quiz) => ({
    id: quizCardId(content.opening.id, quiz.id),
    openingId: content.opening.id,
    epd: quiz.epd,
    expectedUci: '', // a quiz is answered in words, not with a move
  }));
}

/** Move cards in introduction order with a quiz after every few, so quizzes arrive early instead of at the very end. */
export function introductionOrder(content: OpeningContent, options: number | CardOptions = {}): CardDefinition[] {
  const moves = cardDefinitions(content, options);
  const quizzes = quizDefinitions(content);
  const order: CardDefinition[] = [];
  let q = 0;
  moves.forEach((move, i) => {
    order.push(move);
    if ((i + 1) % QUIZ_EVERY === 0 && q < quizzes.length) order.push(quizzes[q++]!);
  });
  return [...order, ...quizzes.slice(q)];
}

/**
 * Every card a course can produce, in the order they should be introduced: the main line first, then the other
 * lines, then positions only reached in traps; each group by distance from the start.
 *
 * Which positions count: a position earns a card when some line or trap that passes through it is drilled. Main lines
 * and gambits always are; sidelines are unless the explorer says too few games reach them; rare lines only when the
 * learner has asked for them; alternative lines never (they show a second answer to a position another line already
 * answers); traps we spring (for-us) never, because the opponent has to move first, but traps we must avoid
 * (against-us) are, so the avoiding move is learned.
 */
export function cardDefinitions(content: OpeningContent, options: number | CardOptions = {}): CardDefinition[] {
  const { minPopularity = MIN_POPULARITY_FOR_CARD, includeRare = false } = optionsOf(options);
  const variants = new Map(content.opening.variants.map((variant) => [variant.id, variant]));
  const drilled = (id: string) => {
    const variant = variants.get(id);
    if (!variant || variant.alternative) return false;
    if (variant.kind === 'line') return variant.weight === 'rare' ? includeRare : true;
    return variant.whose !== 'for-us';
  };
  // Positions only on the strength of sidelines or traps are held to the popularity cut-off when it is known.
  const firmly = (id: string) =>
    variants.get(id)?.kind === 'line' && ['main', 'gambit'].includes(variants.get(id)?.weight ?? '');
  const rankOf = (node: LineNode): number => {
    const edge = node.moves.find((move) => move.isRepertoire)!;
    if (edge.isMainLine) return 0;
    return edge.variants.some((id) => variants.get(id)?.kind === 'line') ? 1 : 2;
  };
  return Object.values(content.nodes)
    .filter((node) => node.isOurTurn && node.moves.some((move) => move.isRepertoire))
    .filter((node) => node.moves.find((move) => move.isRepertoire)!.variants.some(drilled))
    .map((node) => ({ node, rank: rankOf(node) }))
    .filter(({ node, rank }) => {
      if (rank === 0 || node.popularity === undefined) return true;
      const edge = node.moves.find((move) => move.isRepertoire)!;
      return edge.variants.some((id) => drilled(id) && firmly(id)) || node.popularity >= minPopularity;
    })
    .sort((a, b) => a.rank - b.rank || a.node.ply - b.node.ply)
    .map(({ node }) => ({
      id: cardId(content.opening.id, node.epd),
      openingId: content.opening.id,
      epd: node.epd,
      expectedUci: node.moves.find((move) => move.isRepertoire)!.uci,
    }));
}

/**
 * Free practice: a handful of questions from the given courses, whether or not they are being learned. The cards are
 * made fresh and are never saved, so nothing here touches the review schedule. Picked at random, or (`popular`)
 * favouring the positions more games reach. `random` is injectable for tests.
 */
export function freePractice(
  contents: OpeningContent[],
  size = SESSION_SIZE,
  options: CardOptions = {},
  random: () => number = Math.random,
  now = new Date(),
  weighting: Weighting = 'random',
): Card[] {
  const pool = contents.flatMap((content) =>
    introductionOrder(content, { ...options, includeRare: true }).map((definition) => ({
      definition,
      popularity: content.nodes[definition.epd]?.popularity,
    })),
  );
  const weight = (entry: { popularity: number | undefined }) =>
    weighting === 'popular' ? popularityWeight(entry.popularity) : 1;
  return pickWeighted(pool, weight, size, random).map(({ definition }) => newCard(definition, now));
}

/** The cards to study now: seen cards first (most overdue first), then new ones in the order introduced. */
export function planSession(due: Card[], size = SESSION_SIZE): Card[] {
  const byDue = (a: Card, b: Card) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
  const seen = due.filter((card) => card.state !== 'new').sort(byDue);
  const fresh = due.filter((card) => card.state === 'new').sort(byDue);
  return [...seen, ...fresh].slice(0, size);
}

/**
 * Whether a stored card can still be asked from a course as it is now: its quiz is still there, or its position is and
 * the course still plays its expected move from it. A line cut short or rewritten leaves cards behind that do not.
 */
export function cardFits(content: OpeningContent | undefined, card: Pick<Card, 'id' | 'epd' | 'expectedUci'>): boolean {
  if (!content) return false;
  if (isQuizCard(card)) return content.quizzes.some((quiz) => card.id === quizCardId(content.opening.id, quiz.id));
  return content.nodes[card.epd]?.moves.some((move) => move.uci === card.expectedUci) ?? false;
}

/** The new schedule and the log row for a finished attempt. */
export function recordAnswer(
  scheduler: FSRS,
  card: Card,
  attempt: Attempt,
  sessionId: string,
  now: Date,
): { card: Card; review: Review } {
  if (attempt.status !== 'done' || !attempt.rating) throw new Error('The attempt is not finished.');
  return {
    card: scheduleReview(scheduler, card, attempt.rating, now),
    review: {
      id: newId(),
      cardId: card.id,
      at: now.toISOString(),
      rating: attempt.rating,
      playedUci: attempt.shown ? null : attempt.playedUci,
      msToAnswer: Math.round(attempt.msToAnswer ?? 0),
      hintUsed: attempt.hintUsed,
      sessionId,
    },
  };
}

/** A typed answer to a quiz: matched is good, anything else is missed. */
export function recordQuizAnswer(
  scheduler: FSRS,
  card: Card,
  result: { matched: boolean; answer: string; msToAnswer: number },
  sessionId: string,
  now: Date,
): { card: Card; review: Review; attempt: QuizAttempt } {
  const rating: RatingName = result.matched ? 'good' : 'again';
  const at = now.toISOString();
  const msToAnswer = Math.round(result.msToAnswer);
  return {
    card: scheduleReview(scheduler, card, rating, now),
    review: { id: newId(), cardId: card.id, at, rating, playedUci: null, msToAnswer, hintUsed: false, sessionId },
    attempt: { id: newId(), quizId: card.id, at, answer: result.answer, matched: result.matched, msToAnswer },
  };
}

const MISTAKE_NAGS = new Set([2, 4, 6]); // ?, ??, ?!

/**
 * Every question one line asks, in the order it asks them: our move at each position from the course's trigger to the
 * end of the line, and the course's quizzes about positions on it. Unlike `cardDefinitions` it asks the line's own move
 * even where the line is an alternative, and it stops at a mistake of ours (a trap shows it; nothing after it is asked).
 * For quizzing one line on its own page; these are never saved to the schedule.
 */
export function lineQuestions(content: OpeningContent, lineId: string): CardDefinition[] {
  const { opening } = content;
  if (!opening.variants.some((variant) => variant.id === lineId)) return [];
  const path = variantPath(content, lineId);
  const positions = [opening.rootEpd, ...path.map((edge) => edge.to)];
  const from = Math.max(0, positions.indexOf(opening.triggerEpd));
  const quizzes = quizDefinitions(content);
  const questions: CardDefinition[] = [];
  for (let i = 0; i < path.length; i++) {
    const epd = positions[i]!;
    const edge = path[i]!;
    const ours = content.nodes[epd]?.isOurTurn ?? false;
    if (ours && edge.annotation?.nag.some((nag) => MISTAKE_NAGS.has(nag))) break;
    if (i < from) continue;
    questions.push(...quizzes.filter((quiz) => quiz.epd === epd));
    if (ours) questions.push({ id: cardId(opening.id, epd), openingId: opening.id, epd, expectedUci: edge.uci });
  }
  questions.push(...quizzes.filter((quiz) => quiz.epd === positions[path.length]));
  return questions;
}

/** How many of your moves one quiz question runs for: 1 to 5, or the rest of the line (0). */
export type MovesPerQuestion = 0 | 1 | 2 | 3 | 4 | 5;
export const MOVES_PER_QUESTION: readonly MovesPerQuestion[] = [1, 2, 3, 4, 5, 0];

/**
 * The next question after answering one: carry on along a line through the position, past the opponent's reply, to
 * your next move there. `line` keeps a run of questions on one line; without it, one of the lines whose move this is
 * is picked (`random`), preferring lines that are drilled. Stops (null) at the end of the line or at a move marked as a
 * mistake, which is shown, never asked.
 */
export function followOn(
  content: OpeningContent,
  epd: string,
  expectedUci: string,
  line?: string,
  random: () => number = Math.random,
): { definition: CardDefinition; line: string } | null {
  const edge = content.nodes[epd]?.moves.find((move) => move.uci === expectedUci);
  if (!edge) return null;
  const variants = content.opening.variants.filter((variant) => edge.variants.includes(variant.id));
  const drilled = variants.filter((variant) => !variant.alternative && variant.kind === 'line');
  const pool = drilled.length ? drilled : variants;
  const chosen = (line && pool.find((variant) => variant.id === line)) || pool[Math.floor(random() * pool.length)];
  if (!chosen) return null;
  const steps = lineSteps(content, chosen.id);
  const at = steps.findIndex((step) => step.fromEpd === epd && step.edge.uci === expectedUci);
  if (at < 0) return null;
  const next = steps.slice(at + 1).find((step) => step.ours);
  if (!next || next.edge.annotation?.nag.some((nag) => MISTAKE_NAGS.has(nag))) return null;
  return {
    line: chosen.id,
    definition: {
      id: cardId(content.opening.id, next.fromEpd),
      openingId: content.opening.id,
      epd: next.fromEpd,
      expectedUci: next.edge.uci,
    },
  };
}
