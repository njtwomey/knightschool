import type {
  Card,
  EvalCache,
  ExplorerCache,
  GuessAttempt,
  QuizAttempt,
  Review,
  Setting,
  SpeedAttempt,
} from '@knightschool/core/schema';
import { and, asc, count, eq, gt, gte, lte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { SqlExecutor, Statement } from './executor';
import * as schema from './schema';

/** What the UI and core see. Repository-shaped, not SQL-shaped, so a server can implement it over HTTP later. */
export interface Storage {
  /** Row counts, for the Settings page. */
  stats(): Promise<{ cards: number; reviews: number; quizAttempts: number }>;
  cards: {
    get(id: string): Promise<Card | undefined>;
    byOpening(openingId: string): Promise<Card[]>;
    /** How many cards in each opening have been answered at least once. */
    learnedByOpening(): Promise<Record<string, number>>;
    /** Cards due at or before `now` (ISO string), earliest first. */
    due(now: string, limit?: number): Promise<Card[]>;
    countDue(now: string, openingId?: string): Promise<number>;
    /** Adds cards that do not exist yet; existing cards (and their schedule) are left alone. */
    insertMissing(cards: Card[]): Promise<void>;
    save(card: Card): Promise<void>;
  };
  reviews: {
    append(review: Review): Promise<void>;
    forCard(cardId: string): Promise<Review[]>;
    since(at: string): Promise<Review[]>;
    /** Writes the new schedule and the log row together or not at all. */
    record(card: Card, review: Review): Promise<void>;
  };
  quizAttempts: {
    append(attempt: QuizAttempt): Promise<void>;
    forQuiz(quizId: string): Promise<QuizAttempt[]>;
    /** Writes the new schedule, the log row and the attempt together or not at all. */
    record(card: Card, review: Review, attempt: QuizAttempt): Promise<void>;
  };
  guessAttempts: {
    append(attempt: GuessAttempt): Promise<void>;
    since(at: string): Promise<GuessAttempt[]>;
  };
  speedAttempts: {
    append(attempt: SpeedAttempt): Promise<void>;
    since(at: string): Promise<SpeedAttempt[]>;
  };
  evals: {
    /** The engine lines (multipv 1, 2, 3) stored for exactly this position, depth and engine. */
    get(epd: string, depth: number, engine: string): Promise<EvalCache[]>;
    put(lines: EvalCache[]): Promise<void>;
  };
  settings: {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string, at: string): Promise<void>;
    all(): Promise<Setting[]>;
  };
  explorer: {
    /** A cached answer no older than `ttlMs` at `now`. */
    get(key: string, now: string, ttlMs: number): Promise<ExplorerCache | undefined>;
    put(entry: ExplorerCache): Promise<void>;
  };
}

export type StorageInternals = { storage: Storage; db: ReturnType<typeof createDb>; exec: SqlExecutor };

export function createDb(exec: SqlExecutor) {
  // The proxy driver only reads `casing` from its third argument, which needs a batch callback in the second.
  // Atomic writes go through exec.transaction instead, so db.batch is deliberately unavailable.
  return drizzle(
    async (query, params, method) => {
      const { rows } = await exec.execute(query, params, method);
      return { rows };
    },
    async () => {
      throw new Error('db.batch is not supported: build statements with toSQL() and call exec.transaction');
    },
    { schema, casing: 'snake_case' },
  );
}

type Db = ReturnType<typeof createDb>;
type Built = { toSQL(): { sql: string; params: unknown[] } };
export const statementOf = (built: Built): Statement => built.toSQL();

const upsertCard = (db: Db, card: Card) =>
  db.insert(schema.cards).values(card).onConflictDoUpdate({ target: schema.cards.id, set: card });

const insertReview = (db: Db, review: Review) => db.insert(schema.reviews).values(review).onConflictDoNothing();

export function createStorage(exec: SqlExecutor): StorageInternals {
  const db = createDb(exec);

  const storage: Storage = {
    async stats() {
      const n = async (table: typeof schema.cards | typeof schema.reviews | typeof schema.quizAttempts) =>
        (await db.select({ n: count() }).from(table))[0]?.n ?? 0;
      return {
        cards: await n(schema.cards),
        reviews: await n(schema.reviews),
        quizAttempts: await n(schema.quizAttempts),
      };
    },
    cards: {
      get: async (id) => (await db.select().from(schema.cards).where(eq(schema.cards.id, id)))[0],
      async learnedByOpening() {
        const rows = await db
          .select({ openingId: schema.cards.openingId, n: count() })
          .from(schema.cards)
          .where(gt(schema.cards.reps, 0))
          .groupBy(schema.cards.openingId);
        return Object.fromEntries(rows.map((row) => [row.openingId, row.n]));
      },
      byOpening: (openingId) => db.select().from(schema.cards).where(eq(schema.cards.openingId, openingId)),
      due: (now, limit = 1000) =>
        db.select().from(schema.cards).where(lte(schema.cards.due, now)).orderBy(asc(schema.cards.due)).limit(limit),
      async countDue(now, openingId) {
        const where = openingId
          ? and(lte(schema.cards.due, now), eq(schema.cards.openingId, openingId))
          : lte(schema.cards.due, now);
        const [row] = await db.select({ n: count() }).from(schema.cards).where(where);
        return row?.n ?? 0;
      },
      async insertMissing(cards) {
        if (cards.length === 0) return;
        await exec.transaction(
          cards.map((card) => statementOf(db.insert(schema.cards).values(card).onConflictDoNothing())),
        );
      },
      async save(card) {
        await upsertCard(db, card);
      },
    },
    reviews: {
      async append(review) {
        await insertReview(db, review);
      },
      forCard: (cardId) =>
        db.select().from(schema.reviews).where(eq(schema.reviews.cardId, cardId)).orderBy(asc(schema.reviews.at)),
      since: (at) => db.select().from(schema.reviews).where(gte(schema.reviews.at, at)).orderBy(asc(schema.reviews.at)),
      async record(card, review) {
        await exec.transaction([statementOf(upsertCard(db, card)), statementOf(insertReview(db, review))]);
      },
    },
    quizAttempts: {
      async append(attempt) {
        await db.insert(schema.quizAttempts).values(attempt).onConflictDoNothing();
      },
      async record(card, review, attempt) {
        await exec.transaction([
          statementOf(upsertCard(db, card)),
          statementOf(insertReview(db, review)),
          statementOf(db.insert(schema.quizAttempts).values(attempt).onConflictDoNothing()),
        ]);
      },
      forQuiz: (quizId) =>
        db
          .select()
          .from(schema.quizAttempts)
          .where(eq(schema.quizAttempts.quizId, quizId))
          .orderBy(asc(schema.quizAttempts.at)),
    },
    guessAttempts: {
      async append(attempt) {
        await db.insert(schema.guessAttempts).values(attempt).onConflictDoNothing();
      },
      since: (at) =>
        db
          .select()
          .from(schema.guessAttempts)
          .where(gte(schema.guessAttempts.at, at))
          .orderBy(asc(schema.guessAttempts.at)),
    },
    speedAttempts: {
      async append(attempt) {
        await db.insert(schema.speedAttempts).values(attempt).onConflictDoNothing();
      },
      since: (at) =>
        db
          .select()
          .from(schema.speedAttempts)
          .where(gte(schema.speedAttempts.at, at))
          .orderBy(asc(schema.speedAttempts.at)),
    },
    evals: {
      get: (epd, depth, engine) =>
        db
          .select()
          .from(schema.evalCache)
          .where(
            and(eq(schema.evalCache.epd, epd), eq(schema.evalCache.depth, depth), eq(schema.evalCache.engine, engine)),
          )
          .orderBy(asc(schema.evalCache.multipv)),
      async put(lines) {
        if (lines.length === 0) return;
        await exec.transaction(
          lines.map((line) =>
            statementOf(
              db
                .insert(schema.evalCache)
                .values(line)
                .onConflictDoUpdate({
                  target: [
                    schema.evalCache.epd,
                    schema.evalCache.depth,
                    schema.evalCache.multipv,
                    schema.evalCache.engine,
                  ],
                  set: line,
                }),
            ),
          ),
        );
      },
    },
    settings: {
      get: async (key) => (await db.select().from(schema.settings).where(eq(schema.settings.key, key)))[0]?.value,
      async set(key, value, at) {
        await db
          .insert(schema.settings)
          .values({ key, value, at })
          .onConflictDoUpdate({ target: schema.settings.key, set: { value, at } });
      },
      all: () => db.select().from(schema.settings),
    },
    explorer: {
      async get(key, now, ttlMs) {
        const oldest = new Date(new Date(now).getTime() - ttlMs).toISOString();
        const [row] = await db
          .select()
          .from(schema.explorerCache)
          .where(and(eq(schema.explorerCache.key, key), gt(schema.explorerCache.fetchedAt, oldest)));
        return row;
      },
      async put(entry) {
        await db
          .insert(schema.explorerCache)
          .values(entry)
          .onConflictDoUpdate({ target: schema.explorerCache.key, set: entry });
      },
    },
  };
  return { storage, db, exec };
}

export { sql };
