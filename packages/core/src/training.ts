import { MIN_POPULARITY_FOR_CARD, SESSION_SIZE } from './constants';
import { newId } from './ids';
import type { Attempt } from './attempt';
import { newCard, scheduleReview } from './scheduler';
import type { LineNode, OpeningContent } from './schema/content';
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
export function introductionOrder(content: OpeningContent, minPopularity = MIN_POPULARITY_FOR_CARD): CardDefinition[] {
  const moves = cardDefinitions(content, minPopularity);
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
 * Every card an opening can produce, in the order they should be introduced: the main line first, then the other
 * lines, then positions only reached in refutations; each group by distance from the start. A position off the
 * main line earns a card only if enough games at the explorer's band reach it (when that is known).
 */
export function cardDefinitions(content: OpeningContent, minPopularity = MIN_POPULARITY_FOR_CARD): CardDefinition[] {
  const kindOf = new Map(content.opening.variants.map((variant) => [variant.id, variant.kind]));
  const rankOf = (node: LineNode): number => {
    const edge = node.moves.find((move) => move.isRepertoire)!;
    if (edge.isMainLine) return 0;
    return edge.variants.some((id) => kindOf.get(id) === 'line') ? 1 : 2;
  };
  return Object.values(content.nodes)
    .filter((node) => node.isOurTurn && node.moves.some((move) => move.isRepertoire))
    .map((node) => ({ node, rank: rankOf(node) }))
    .filter(({ node, rank }) => rank === 0 || node.popularity === undefined || node.popularity >= minPopularity)
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
): Card[] {
  const queues = openings.map(({ content, existing }) =>
    introductionOrder(content).filter((card) => !existing.has(card.id)),
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
