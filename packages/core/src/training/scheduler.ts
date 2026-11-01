import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card as FsrsCard } from 'ts-fsrs';
import type { SiteConfig } from '../config/site-config';
import { wrongTries, type Attempt } from './attempt';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

/** A scheduled card: what it asks (by id) and its FSRS state, in plain fields that store and export as they are. */
export type Card = {
  id: string;
  due: string;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: string | null;
};

const STATES: CardState[] = ['new', 'learning', 'review', 'relearning'];
const RATINGS: Record<ReviewRating, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/**
 * The rating an answer earns, worked out, never asked: right first time without help, quickly, is Easy; right is
 * Good; right after a hint or a wrong try is Hard; shown is Again.
 */
export function autoGrade(attempt: Attempt, easyWithinMs: number): ReviewRating {
  if (attempt.shown) return 'again';
  if (attempt.hint || wrongTries(attempt) > 0) return 'hard';
  const right = attempt.tries.find((one) => one.outcome === 'right');
  const ms = attempt.tries.reduce((sum, one) => sum + one.ms, 0);
  return right && ms <= easyWithinMs ? 'easy' : 'good';
}

const toFsrs = (card: Card): FsrsCard => ({
  due: new Date(card.due),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: 0,
  scheduled_days: card.scheduledDays,
  learning_steps: card.learningSteps,
  reps: card.reps,
  lapses: card.lapses,
  state: STATES.indexOf(card.state) as State,
  last_review: card.lastReview ? new Date(card.lastReview) : undefined,
});

const fromFsrs = (id: string, card: FsrsCard): Card => ({
  id,
  due: card.due.toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  scheduledDays: card.scheduled_days,
  learningSteps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  state: STATES[card.state]!,
  lastReview: card.last_review ? card.last_review.toISOString() : null,
});

/** FSRS with the site's schedule (config `schedule.retention`, `schedule.maxIntervalDays`). */
export function createScheduler(schedule: Pick<SiteConfig['schedule'], 'retention' | 'maxIntervalDays'>) {
  const scheduler = fsrs(
    generatorParameters({ request_retention: schedule.retention, maximum_interval: schedule.maxIntervalDays }),
  );
  return {
    newCard: (id: string, now: Date): Card => fromFsrs(id, createEmptyCard(now)),
    review: (card: Card, rating: ReviewRating, now: Date): Card =>
      fromFsrs(card.id, scheduler.next(toFsrs(card), now, RATINGS[rating]).card),
  };
}
