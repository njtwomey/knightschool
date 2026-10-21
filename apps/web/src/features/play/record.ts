import {
  cardId,
  createScheduler,
  newCard,
  recordAnswer,
  type Attempt,
  type LineStep,
  type OpeningContent,
} from '@knightschool/core';
import type { Storage } from '@knightschool/storage';

const scheduler = createScheduler();

const cardFor = (content: OpeningContent, step: LineStep, now: Date) =>
  newCard(
    {
      id: cardId(content.opening.id, step.fromEpd),
      openingId: content.opening.id,
      epd: step.fromEpd,
      expectedUci: step.edge.uci,
    },
    now,
  );

/** Only the move the repertoire wants makes a card; a move marked as a mistake never does. */
const hasCard = (step: LineStep) => step.ours && step.edge.isRepertoire;

/** Learn: make sure the card exists so it turns up in reviews, without grading it. */
export async function introduceStep(storage: Storage, content: OpeningContent, step: LineStep, now = new Date()) {
  if (hasCard(step)) await storage.cards.insertMissing([cardFor(content, step, now)]);
}

/** Drill: the answer is graded and scheduled exactly like a review. */
export async function recordStep(
  storage: Storage,
  content: OpeningContent,
  step: LineStep,
  attempt: Attempt,
  sessionId: string,
  now = new Date(),
) {
  if (!hasCard(step)) return;
  const card = (await storage.cards.get(cardId(content.opening.id, step.fromEpd))) ?? cardFor(content, step, now);
  const answer = recordAnswer(scheduler, card, attempt, sessionId, now);
  await storage.reviews.record(answer.card, answer.review);
}
