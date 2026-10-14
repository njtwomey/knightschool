import type { ExplorerMove } from '@knightschool/core/schema';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Column for column the same as the Zod schemas in packages/core/src/schema/user.ts: a row selected from
// these tables is already a Card, Review and so on. Timestamps are ISO-8601 UTC strings, which sort correctly.

export const cards = sqliteTable(
  'cards',
  {
    id: text().primaryKey(),
    openingId: text().notNull(),
    epd: text().notNull(),
    expectedUci: text().notNull(),
    due: text().notNull(),
    stability: real().notNull(),
    difficulty: real().notNull(),
    scheduledDays: integer().notNull().default(0),
    learningSteps: integer().notNull().default(0),
    reps: integer().notNull(),
    lapses: integer().notNull(),
    state: text().$type<'new' | 'learning' | 'review' | 'relearning'>().notNull(),
    lastReview: text(),
    at: text().notNull(),
  },
  (table) => [index('cards_due_idx').on(table.due), index('cards_opening_idx').on(table.openingId)],
);

/** Append-only. Rows are never updated. */
export const reviews = sqliteTable(
  'reviews',
  {
    id: text().primaryKey(),
    cardId: text().notNull(),
    at: text().notNull(),
    rating: text().$type<'again' | 'hard' | 'good' | 'easy'>().notNull(),
    playedUci: text(),
    msToAnswer: integer().notNull(),
    hintUsed: integer({ mode: 'boolean' }).notNull(),
    sessionId: text().notNull(),
  },
  (table) => [index('reviews_card_idx').on(table.cardId), index('reviews_at_idx').on(table.at)],
);

/** Append-only. */
export const quizAttempts = sqliteTable(
  'quiz_attempts',
  {
    id: text().primaryKey(),
    quizId: text().notNull(),
    at: text().notNull(),
    answer: text().notNull(),
    matched: integer({ mode: 'boolean' }).notNull(),
    msToAnswer: integer().notNull(),
  },
  (table) => [index('quiz_attempts_quiz_idx').on(table.quizId)],
);

/** Append-only. One row per answer in Name That Opening. */
export const guessAttempts = sqliteTable(
  'guess_attempts',
  {
    id: text().primaryKey(),
    at: text().notNull(),
    epd: text().notNull(),
    answer: text().notNull(),
    result: text({ enum: ['full', 'partial', 'miss'] }).notNull(),
    msToAnswer: integer().notNull(),
  },
  (table) => [index('guess_attempts_at_idx').on(table.at)],
);

/** One row per engine line (multipv 1 is the best move). */
export const evalCache = sqliteTable(
  'eval_cache',
  {
    epd: text().notNull(),
    depth: integer().notNull(),
    multipv: integer().notNull(),
    engine: text().notNull(),
    cp: integer(),
    mate: integer(),
    pv: text().notNull(),
    at: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.epd, table.depth, table.multipv, table.engine] })],
);

export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),
  at: text().notNull(),
});

export const explorerCache = sqliteTable('explorer_cache', {
  key: text().primaryKey(),
  epd: text().notNull(),
  db: text().$type<'lichess' | 'masters'>().notNull(),
  speeds: text().notNull(),
  ratings: text().notNull(),
  white: integer().notNull(),
  draws: integer().notNull(),
  black: integer().notNull(),
  moves: text({ mode: 'json' }).$type<ExplorerMove[]>().notNull(),
  openingName: text(),
  fetchedAt: text().notNull(),
});

/** Schema version lives here, not in the tables above: migrations run before anything else reads. */
export const meta = sqliteTable('meta', {
  key: text().primaryKey(),
  value: text().notNull(),
});
