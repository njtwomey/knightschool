import { createEmptyCard, fsrs, Rating, State, type Card as FsrsCard, type FSRS, type Grade } from 'ts-fsrs';
import type { RatingName } from './grading';
import type { Card } from '../schema/user';

const STATES: Record<Card['state'], State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};
const STATE_NAMES: Record<State, Card['state']> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};
const GRADES: Record<RatingName, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/** FSRS-6 via ts-fsrs. Fuzz adds a little randomness to intervals; switch it off in tests. */
export function createScheduler(options: { fuzz?: boolean } = {}): FSRS {
  return fsrs({ enable_fuzz: options.fuzz ?? true });
}

const toFsrs = (card: Card): FsrsCard => ({
  due: new Date(card.due),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: 0, // deprecated in ts-fsrs, derived from last_review
  scheduled_days: card.scheduledDays,
  learning_steps: card.learningSteps,
  reps: card.reps,
  lapses: card.lapses,
  state: STATES[card.state],
  ...(card.lastReview ? { last_review: new Date(card.lastReview) } : {}),
});

type CardTarget = Pick<Card, 'id' | 'openingId' | 'epd' | 'expectedUci'>;

/** A card nobody has answered yet, due immediately. */
export function newCard(target: CardTarget, now: Date): Card {
  const empty = createEmptyCard(now);
  return {
    ...target,
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    reps: empty.reps,
    lapses: empty.lapses,
    state: STATE_NAMES[empty.state],
    lastReview: null,
    at: now.toISOString(),
  };
}

/** The card after an answer: load, `scheduler.next(card, now, rating)`, store. */
export function scheduleReview(scheduler: FSRS, card: Card, rating: RatingName, now: Date): Card {
  const { card: next } = scheduler.next(toFsrs(card), now, GRADES[rating]);
  return {
    ...card,
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    scheduledDays: next.scheduled_days,
    learningSteps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: STATE_NAMES[next.state],
    lastReview: next.last_review?.toISOString() ?? now.toISOString(),
    at: now.toISOString(),
  };
}
