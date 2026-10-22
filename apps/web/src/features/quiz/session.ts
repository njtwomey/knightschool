import {
  type Card,
  cardFits,
  freePractice,
  lineQuestions,
  newCard,
  type OpeningContent,
  planIntroductions,
  planSession,
  shuffle,
} from '@knightschool/core';
import { loadIndex, loadOpening } from '@/data/content';
import { DUE, type QuizConfig, resolvePool } from '@/data/practice-config';
import { whenStorageReady } from '@/data/storage';
import {
  addIntroducedToday,
  getCardOptions,
  getEnrolled,
  getIntroducedToday,
  getNewPerDay,
} from '@/data/training-settings';

/** A line's quiz: every question of that one line. */
export type LineScope = { course: string; line: string };

/** A line's quiz is already narrowed to the line: its set-up is only how far each question runs. */
export const LINE_FIELDS = ['moves'] as const;
export const LINE_TITLE = 'Quiz this line';

/** The questions of a session and the courses they come from. */
export type SessionQueue = { queue: Card[]; contents: Record<string, OpeningContent> };

const byId = (loaded: OpeningContent[]) => Object.fromEntries(loaded.map((content) => [content.opening.id, content]));

/**
 * The questions to ask: a line's every question (shuffled, never saved) when `scope` is set; else free practice from
 * the courses the set-up names (random, saved nowhere); else the schedule's due cards, after introducing the day's new
 * cards from each course's path.
 */
export async function sessionQueue(config: QuizConfig, scope: LineScope | null): Promise<SessionQueue> {
  const storage = (await whenStorageReady()).storage;
  const now = new Date();
  const index = await loadIndex();
  if (scope) {
    const content = await loadOpening(scope.course);
    // Shuffled, so the quiz is not the line played again in order.
    const questions = shuffle(lineQuestions(content, scope.line));
    return { queue: questions.map((definition) => newCard(definition, now)), contents: byId([content]) };
  }
  if (config.source !== DUE) {
    // Free practice: random questions, saved nowhere, so the schedule is untouched.
    const chosen = await resolvePool(config.source, index);
    const free = await Promise.all(chosen.map((course) => loadOpening(course.id)));
    const queue = freePractice(
      free,
      undefined,
      await getCardOptions(storage),
      Math.random,
      new Date(),
      config.weighting,
    );
    return { queue, contents: byId(free) };
  }
  const enrolled = await getEnrolled(
    storage,
    index.map((course) => course.id),
  );
  const loaded = await Promise.all(enrolled.map((id) => loadOpening(id)));
  const contents = byId(loaded);

  // New cards come from each course's path: its open units in order, never ahead of what is passed.
  const quota = Math.max(0, (await getNewPerDay(storage)) - (await getIntroducedToday(storage, now)));
  const courses = await Promise.all(
    loaded.map(async (content) => ({
      content,
      cards: await storage.cards.byOpening(content.opening.id),
      reviews: await storage.reviews.byOpening(content.opening.id),
    })),
  );
  const fresh = planIntroductions(courses, quota, now, await getCardOptions(storage));
  await storage.cards.insertMissing(fresh);
  if (fresh.length) await addIntroducedToday(storage, fresh.length, now);

  // A card whose position or move its course no longer has (a line cut short or rewritten) cannot be asked.
  const due = (await storage.cards.due(now.toISOString())).filter(
    (card) => enrolled.includes(card.openingId) && cardFits(contents[card.openingId], card),
  );
  return { queue: planSession(due), contents };
}
