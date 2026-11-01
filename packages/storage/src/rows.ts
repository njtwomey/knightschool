import type { Card, ReviewRating, Try } from '@knightschool/core';
import { z } from 'zod';

/** One scheduled answer (docs/v2/schemas/learner.md `reviews`). */
export type ReviewRow = { id: string; cardId: string; at: string; rating: ReviewRating; ms: number; hint: boolean };

/** One exercise answered, with every try (docs/v2/schemas/learner.md `attempts`). */
export type AttemptRow = {
  id: string;
  at: string;
  session: string;
  mode: 'watch' | 'try' | 'mistakes' | 'review' | 'drill' | 'puzzle' | 'play-on' | 'checkpoint' | 'speed' | 'name-it';
  ref: string;
  result: 'right' | 'wrong' | 'shown';
  tries: Try[];
  ms: number;
  hint: boolean;
  shown: boolean;
};

/**
 * The learner's data, as the pages use it: SQLite over OPFS in the browser (repositories.ts), or the web app's
 * `memoryStore()`. Every write is a whole row with an id and an `at` time.
 */
export interface LearnerStore {
  cards: {
    all(): Promise<Card[]>;
    get(id: string): Promise<Card | undefined>;
    put(card: Card): Promise<void>;
  };
  reviews: {
    add(review: ReviewRow): Promise<void>;
    forCards(ids: readonly string[]): Promise<ReviewRow[]>;
  };
  attempts: {
    add(attempt: AttemptRow): Promise<void>;
    recent(limit: number): Promise<AttemptRow[]>;
  };
  settings: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
  };
}

/** A card as stored and exported: the card plus when it was last written. */
export type CardRow = Card & { at: string };
export type SettingRow = { key: string; value: string; at: string };

// The shapes an import is checked against, row by row. `satisfies` keeps them in step with core's types.

const id = z.string().min(1);
const time = z.iso.datetime();
const count = z.number().int().nonnegative();

export const SettingRowSchema = z.object({ key: id, value: z.string(), at: time }) satisfies z.ZodType<SettingRow>;

export const CardRowSchema = z.object({
  id,
  at: time,
  due: time,
  stability: z.number().nonnegative(),
  difficulty: z.number().nonnegative(),
  scheduledDays: z.number().nonnegative(),
  learningSteps: count,
  reps: count,
  lapses: count,
  state: z.enum(['new', 'learning', 'review', 'relearning']),
  lastReview: time.nullable(),
}) satisfies z.ZodType<CardRow>;

export const ReviewRowSchema = z.object({
  id,
  cardId: id,
  at: time,
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  ms: count,
  hint: z.boolean(),
}) satisfies z.ZodType<ReviewRow>;

const TrySchema = z.object({ uci: z.string(), ms: count, outcome: z.enum(['right', 'wrong', 'another']) });

export const AttemptRowSchema = z.object({
  id,
  at: time,
  session: z.string(),
  mode: z.enum(['watch', 'try', 'mistakes', 'review', 'drill', 'puzzle', 'play-on', 'checkpoint', 'speed', 'name-it']),
  ref: z.string(),
  result: z.enum(['right', 'wrong', 'shown']),
  tries: z.array(TrySchema),
  ms: count,
  hint: z.boolean(),
  shown: z.boolean(),
}) satisfies z.ZodType<AttemptRow>;
