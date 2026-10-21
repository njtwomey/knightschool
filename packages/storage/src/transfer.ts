import {
  AuthoredChange,
  AuthoredChapter,
  AuthoredCourse,
  Card,
  EvalCache,
  ExplorerCache,
  GuessAttempt,
  QuizAttempt,
  Review,
  Setting,
  SpeedAttempt,
} from '@knightschool/core/schema';
import { sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';
import { LATEST_SCHEMA_VERSION } from './migrate';
import { createDb, statementOf, type StorageInternals } from './repositories';
import * as schema from './schema';

/** The JSON export: every table as an array, readable by a person and importable on another device. */
export const Dump = z.object({
  app: z.literal('knightschool'),
  schemaVersion: z.number().int(),
  exportedAt: z.iso.datetime(),
  tables: z.object({
    cards: z.array(Card),
    reviews: z.array(Review),
    quizAttempts: z.array(QuizAttempt),
    guessAttempts: z.array(GuessAttempt).default([]), // older exports have none
    speedAttempts: z.array(SpeedAttempt).default([]),
    evalCache: z.array(EvalCache),
    settings: z.array(Setting),
    explorerCache: z.array(ExplorerCache),
    // Authored content (schema 5 on); older exports have none.
    authoredChapters: z.array(AuthoredChapter).default([]),
    authoredCourses: z.array(AuthoredCourse).default([]),
    authoredHistory: z.array(AuthoredChange).default([]),
  }),
});
export type Dump = z.infer<typeof Dump>;

export type ImportReport = Record<keyof Dump['tables'], number>;

export async function exportJson({ db }: StorageInternals, now = new Date()): Promise<Dump> {
  return {
    app: 'knightschool',
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tables: {
      cards: await db.select().from(schema.cards),
      reviews: await db.select().from(schema.reviews),
      quizAttempts: await db.select().from(schema.quizAttempts),
      guessAttempts: await db.select().from(schema.guessAttempts),
      speedAttempts: await db.select().from(schema.speedAttempts),
      evalCache: await db.select().from(schema.evalCache),
      settings: await db.select().from(schema.settings),
      explorerCache: await db.select().from(schema.explorerCache),
      authoredChapters: await db.select().from(schema.authoredChapters),
      authoredCourses: await db.select().from(schema.authoredCourses),
      authoredHistory: await db.select().from(schema.authoredHistory),
    },
  };
}

/**
 * Validates every row, then merges into the existing tables in one transaction. Rows are matched by id (or key):
 * logs (reviews, quiz attempts, authored history) keep what is already there, everything else keeps the copy with the
 * newer `at`.
 * Nothing is written if any row is invalid. Returns how many rows each table received.
 */
export async function importJson(internals: StorageInternals, input: unknown): Promise<ImportReport> {
  const dump = Dump.parse(input);
  if (dump.schemaVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(`This file was exported by a newer version of Knight School (schema ${dump.schemaVersion}).`);
  }
  const { db, exec } = internals;
  const t = dump.tables;
  const newer = (column: SQLiteColumn) => sql`excluded.at > ${column}`;

  const statements = [
    ...t.cards.map((row) =>
      statementOf(
        db
          .insert(schema.cards)
          .values(row)
          .onConflictDoUpdate({ target: schema.cards.id, set: row, setWhere: newer(schema.cards.at) }),
      ),
    ),
    ...t.reviews.map((row) => statementOf(db.insert(schema.reviews).values(row).onConflictDoNothing())),
    ...t.quizAttempts.map((row) => statementOf(db.insert(schema.quizAttempts).values(row).onConflictDoNothing())),
    ...t.guessAttempts.map((row) => statementOf(db.insert(schema.guessAttempts).values(row).onConflictDoNothing())),
    ...t.speedAttempts.map((row) => statementOf(db.insert(schema.speedAttempts).values(row).onConflictDoNothing())),
    ...t.evalCache.map((row) =>
      statementOf(
        db
          .insert(schema.evalCache)
          .values(row)
          .onConflictDoUpdate({
            target: [schema.evalCache.epd, schema.evalCache.depth, schema.evalCache.multipv, schema.evalCache.engine],
            set: row,
            setWhere: newer(schema.evalCache.at),
          }),
      ),
    ),
    ...t.settings.map((row) =>
      statementOf(
        db
          .insert(schema.settings)
          .values(row)
          .onConflictDoUpdate({ target: schema.settings.key, set: row, setWhere: newer(schema.settings.at) }),
      ),
    ),
    ...t.explorerCache.map((row) =>
      statementOf(
        db
          .insert(schema.explorerCache)
          .values(row)
          .onConflictDoUpdate({
            target: schema.explorerCache.key,
            set: row,
            setWhere: sql`excluded.fetched_at > ${schema.explorerCache.fetchedAt}`,
          }),
      ),
    ),
    ...t.authoredChapters.map((row) =>
      statementOf(
        db
          .insert(schema.authoredChapters)
          .values(row)
          .onConflictDoUpdate({
            target: schema.authoredChapters.id,
            set: row,
            setWhere: newer(schema.authoredChapters.at),
          }),
      ),
    ),
    ...t.authoredCourses.map((row) =>
      statementOf(
        db
          .insert(schema.authoredCourses)
          .values(row)
          .onConflictDoUpdate({
            target: schema.authoredCourses.id,
            set: row,
            setWhere: newer(schema.authoredCourses.at),
          }),
      ),
    ),
    ...t.authoredHistory.map((row) => statementOf(db.insert(schema.authoredHistory).values(row).onConflictDoNothing())),
  ];
  if (statements.length) await exec.transaction(statements);
  return {
    cards: t.cards.length,
    reviews: t.reviews.length,
    quizAttempts: t.quizAttempts.length,
    guessAttempts: t.guessAttempts.length,
    speedAttempts: t.speedAttempts.length,
    evalCache: t.evalCache.length,
    settings: t.settings.length,
    explorerCache: t.explorerCache.length,
    authoredChapters: t.authoredChapters.length,
    authoredCourses: t.authoredCourses.length,
    authoredHistory: t.authoredHistory.length,
  };
}

export { createDb };
