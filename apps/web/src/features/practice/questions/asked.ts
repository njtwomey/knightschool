import { createScheduler, quizCardId } from '@knightschool/core';
import type { BuiltOpening, BuiltQuestion } from '@knightschool/core/content';
import { learnerStore } from '@/data/learner';
import type { AttemptRow } from '@/data/learner-store';
import { scheduleConfig } from '@/data/settings';

/** FSRS with the learner's retention, read when a card is graded. */
const scheduler = () => createScheduler(scheduleConfig());
const newId = () => crypto.randomUUID();

/** A question to ask, from its opening. */
export type Asked = { opening: BuiltOpening; question: BuiltQuestion; cardId: string };

export const askedOf = (opening: BuiltOpening, question: BuiltQuestion): Asked => ({
  opening,
  question,
  cardId: quizCardId(opening.id, question.id),
});

/** One question answered: what was typed (empty when the learner asked for the answer) and whether it matched. */
export type QuestionAnswer = { cardId: string; typed: string; matched: boolean; ms: number };

/**
 * A typed answer on the schedule: matched is Good, missed is Again; logged as an attempt in `mode` (the typed words as
 * its one try, so the log keeps what was said).
 */
export async function saveQuestionAnswer(answer: QuestionAnswer, session: string, mode: AttemptRow['mode']) {
  const store = await learnerStore();
  const now = new Date();
  const rating = answer.matched ? 'good' : 'again';
  const card = (await store.cards.get(answer.cardId)) ?? scheduler().newCard(answer.cardId, now);
  await store.cards.put(scheduler().review(card, rating, now));
  await store.reviews.add({
    id: newId(),
    cardId: answer.cardId,
    at: now.toISOString(),
    rating,
    ms: answer.ms,
    hint: false,
  });
  await store.attempts.add({
    id: newId(),
    at: now.toISOString(),
    session,
    mode,
    ref: answer.cardId,
    result: answer.matched ? 'right' : answer.typed ? 'wrong' : 'shown',
    tries: answer.typed ? [{ uci: answer.typed, ms: answer.ms, outcome: answer.matched ? 'right' : 'wrong' }] : [],
    ms: answer.ms,
    hint: false,
    shown: !answer.typed,
  });
}
