import { MIN_POPULARITY_FOR_CARD, SESSION_SIZE } from './constants';
import { newId } from './ids';
import type { Attempt } from './attempt';
import { newCard, scheduleReview } from './scheduler';
import type { LineNode, OpeningContent } from './schema/content';

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
 * The next new cards to introduce today, at most `quota`, taking turns between openings so one does not hog the day.
 * `existing` holds the ids already in storage. Returns the cards to insert.
 */
export function planIntroductions(
  openings: { content: OpeningContent; existing: ReadonlySet<string> }[],
  quota: number,
  now: Date,
  options: CardOptions = {},
): Card[] {
  const queues = openings.map(({ content, existing }) =>
    introductionOrder(content, options).filter((card) => !existing.has(card.id)),
  );
  const chosen: CardDefinition[] = [];
  for (let round = 0; chosen.length < quota; round++) {
    let any = false;
    for (const queue of queues) {
      const next = queue[round];
      if (!next || chosen.length >= quota) continue;
      any = true;
      chosen.push(next);
    }
    if (!any) break;
  }
  // Due times one millisecond apart, earliest first and all already past, so a session studies the new cards in the
  // order they were introduced and every one of them is due immediately.
  return chosen.map((definition, i) => newCard(definition, new Date(now.getTime() - (chosen.length - i))));
}

/**
 * Free practice: a random handful of questions from the given courses, whether or not they are being learned. The
 * cards are made fresh and are never saved, so nothing here touches the review schedule. `random` is injectable for tests.
 */
export function freePractice(
  contents: OpeningContent[],
  size = SESSION_SIZE,
  options: CardOptions = {},
  random: () => number = Math.random,
  now = new Date(),
): Card[] {
  const pool = contents.flatMap((content) => introductionOrder(content, { ...options, includeRare: true }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, size).map((definition) => newCard(definition, now));
}

/** The cards to study now: seen cards first (most overdue first), then new ones in the order introduced. */
export function planSession(due: Card[], size = SESSION_SIZE): Card[] {
  const byDue = (a: Card, b: Card) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id);
  const seen = due.filter((card) => card.state !== 'new').sort(byDue);
  const fresh = due.filter((card) => card.state === 'new').sort(byDue);
  return [...seen, ...fresh].slice(0, size);
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
