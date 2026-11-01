import type { Card } from '@knightschool/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SqlExecutor } from './executor';
import { migrate, NewerSchemaError, schemaVersion } from './migrate';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';
import { createLearnerStore } from './repositories';
import type { AttemptRow, LearnerStore, ReviewRow } from './rows';
import { openMemoryDatabase } from './testing/memory';
import { exportJson, ImportError, importJson, type LearnerExport } from './transfer';

const T0 = Date.parse('2026-11-01T09:00:00.000Z');
const at = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();

const card = (id: string, overrides: Partial<Card> = {}): Card => ({
  id,
  due: at(60),
  stability: 2.5,
  difficulty: 5.1,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 'learning',
  lastReview: at(0),
  ...overrides,
});
const review = (id: string, cardId: string, minutes: number, overrides: Partial<ReviewRow> = {}): ReviewRow => ({
  id,
  cardId,
  at: at(minutes),
  rating: 'good',
  ms: 1200,
  hint: false,
  ...overrides,
});
const attempt = (id: string, minutes: number, overrides: Partial<AttemptRow> = {}): AttemptRow => ({
  id,
  at: at(minutes),
  session: 's1',
  mode: 'drill',
  ref: 'move:rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -:e7e5',
  result: 'right',
  tries: [
    { uci: 'd7d5', ms: 800, outcome: 'wrong' },
    { uci: 'e7e5', ms: 400, outcome: 'right' },
  ],
  ms: 1200,
  hint: true,
  shown: false,
  ...overrides,
});

type Db = Awaited<ReturnType<typeof openMemoryDatabase>>;
let db: Db;
let clock: number;
let store: LearnerStore;

const open = async (): Promise<Db> => {
  const opened = await openMemoryDatabase();
  await migrate(opened.exec);
  return opened;
};
const tables = async (exec: SqlExecutor) =>
  (await exec.execute("select name from sqlite_master where type = 'table' order by name")).map((row) => row.name);

beforeEach(async () => {
  db = await open();
  clock = 0;
  store = createLearnerStore(db.exec, { now: () => new Date(T0 + clock++ * 1000) });
});
afterEach(() => db.close());

describe('migrations', () => {
  it('builds every table from nothing and records the version', async () => {
    const fresh = await openMemoryDatabase();
    expect(await schemaVersion(fresh.exec)).toBe(0);
    expect(await migrate(fresh.exec)).toBe(LATEST_SCHEMA_VERSION);
    expect(await tables(fresh.exec)).toEqual(['attempts', 'cards', 'meta', 'reviews', 'settings']);
    expect(await schemaVersion(fresh.exec)).toBe(LATEST_SCHEMA_VERSION);
    fresh.close();
  });

  it('brings a version 1 database up to date and keeps its rows', async () => {
    const old = await openMemoryDatabase();
    await migrate(old.exec, MIGRATIONS.slice(0, 1));
    expect(await schemaVersion(old.exec)).toBe(1);
    expect(await tables(old.exec)).not.toContain('attempts');
    const oldStore = createLearnerStore(old.exec);
    await oldStore.cards.put(card('a'));
    await oldStore.reviews.add(review('r1', 'a', 1));
    await oldStore.settings.set('newPerDay', '10');

    await migrate(old.exec);
    expect(await schemaVersion(old.exec)).toBe(LATEST_SCHEMA_VERSION);
    const store = createLearnerStore(old.exec);
    expect(await store.cards.get('a')).toEqual(card('a'));
    expect(await store.reviews.forCards(['a'])).toEqual([review('r1', 'a', 1)]);
    expect(await store.settings.get('newPerDay')).toBe('10');
    await store.attempts.add(attempt('t1', 2));
    expect(await store.attempts.recent(5)).toEqual([attempt('t1', 2)]);
    old.close();
  });

  it('can run again without changing anything', async () => {
    await store.cards.put(card('a'));
    await migrate(db.exec);
    expect(await store.cards.get('a')).toEqual(card('a'));
  });

  it('refuses a database saved by a newer app', async () => {
    await db.exec.execute("update meta set value = '99' where key = 'schema_version'");
    await expect(migrate(db.exec)).rejects.toThrow(NewerSchemaError);
    await expect(migrate(db.exec)).rejects.toThrow(/newer version of Knight School/);
  });

  it('leaves the database at the last version that worked when a migration fails', async () => {
    const broken = [...MIGRATIONS.slice(0, 1), { version: 2, statements: ['create table x (a)', 'not sql'] }];
    const fresh = await openMemoryDatabase();
    await expect(migrate(fresh.exec, broken)).rejects.toThrow();
    expect(await schemaVersion(fresh.exec)).toBe(1);
    expect(await tables(fresh.exec)).not.toContain('x');
    fresh.close();
  });
});

describe('repositories', () => {
  it('round-trips a card, and a put replaces it', async () => {
    expect(await store.cards.get('a')).toBeUndefined();
    await store.cards.put(card('a'));
    await store.cards.put(card('b', { lastReview: null, state: 'new', reps: 0 }));
    expect(await store.cards.get('a')).toEqual(card('a'));
    expect(await store.cards.get('b')).toEqual(card('b', { lastReview: null, state: 'new', reps: 0 }));
    await store.cards.put(card('a', { state: 'review', reps: 2, stability: 7.25 }));
    expect(await store.cards.all()).toEqual([
      card('a', { state: 'review', reps: 2, stability: 7.25 }),
      card('b', { lastReview: null, state: 'new', reps: 0 }),
    ]);
  });

  it('returns the reviews of the cards asked for, oldest first', async () => {
    await store.reviews.add(review('r2', 'a', 5, { rating: 'again', hint: true }));
    await store.reviews.add(review('r1', 'a', 1));
    await store.reviews.add(review('r3', 'b', 2));
    expect(await store.reviews.forCards(['a'])).toEqual([
      review('r1', 'a', 1),
      review('r2', 'a', 5, { rating: 'again', hint: true }),
    ]);
    expect((await store.reviews.forCards(['a', 'b', 'a'])).map((row) => row.id)).toEqual(['r1', 'r3', 'r2']);
    expect(await store.reviews.forCards([])).toEqual([]);
  });

  it('lists the most recent attempts first, with their tries', async () => {
    await store.attempts.add(attempt('t1', 1));
    await store.attempts.add(attempt('t2', 3, { result: 'shown', shown: true, hint: false, tries: [] }));
    await store.attempts.add(attempt('t3', 2));
    expect(await store.attempts.recent(2)).toEqual([
      attempt('t2', 3, { result: 'shown', shown: true, hint: false, tries: [] }),
      attempt('t3', 2),
    ]);
  });

  it('keeps one value per setting', async () => {
    expect(await store.settings.get('preset')).toBeUndefined();
    await store.settings.set('preset', 'gentle');
    await store.settings.set('preset', 'strict');
    expect(await store.settings.get('preset')).toBe('strict');
  });
});

describe('logs are append-only', () => {
  it('refuses a second review or attempt with the same id and keeps the first', async () => {
    await store.reviews.add(review('r1', 'a', 1));
    await expect(store.reviews.add(review('r1', 'a', 9, { rating: 'easy' }))).rejects.toThrow();
    expect(await store.reviews.forCards(['a'])).toEqual([review('r1', 'a', 1)]);

    await store.attempts.add(attempt('t1', 1));
    await expect(store.attempts.add(attempt('t1', 9, { result: 'wrong' }))).rejects.toThrow();
    expect(await store.attempts.recent(5)).toEqual([attempt('t1', 1)]);
  });

  it('refuses to change a logged row', async () => {
    await store.reviews.add(review('r1', 'a', 1));
    await store.attempts.add(attempt('t1', 1));
    await expect(db.exec.execute("update reviews set rating = 'easy'")).rejects.toThrow(/only ever added to/);
    await expect(db.exec.execute("update attempts set result = 'wrong'")).rejects.toThrow(/only ever added to/);
  });
});

describe('export and import', () => {
  const fill = async () => {
    await store.settings.set('repertoire', '{"white":"italian-white"}');
    await store.cards.put(card('a'));
    await store.cards.put(card('b', { state: 'review' }));
    await store.reviews.add(review('r1', 'a', 1));
    await store.reviews.add(review('r2', 'b', 2, { hint: true }));
    await store.attempts.add(attempt('t1', 3));
  };

  it('stamps the export with the versions', async () => {
    const dump = await exportJson(db.exec, { appVersion: '2.0.0', now: () => new Date(T0) });
    expect(dump).toMatchObject({ app: 'knightschool', format: 1, schema: LATEST_SCHEMA_VERSION, appVersion: '2.0.0' });
    expect(dump.exportedAt).toBe(at(0));
  });

  it('gives the same rows when imported into an empty database', async () => {
    await fill();
    const dump = await exportJson(db.exec, { appVersion: 'test' });
    const empty = await open();
    const report = await importJson(empty.exec, JSON.parse(JSON.stringify(dump)));
    expect(report).toEqual({
      settings: { added: 1, updated: 0, unchanged: 0 },
      cards: { added: 2, updated: 0, unchanged: 0 },
      reviews: { added: 2, updated: 0, unchanged: 0 },
      attempts: { added: 1, updated: 0, unchanged: 0 },
    });
    expect((await exportJson(empty.exec, { appVersion: 'test' })).tables).toEqual(dump.tables);
    empty.close();
  });

  it('merges by `at`: the newer card or setting wins, logs keep the rows they have', async () => {
    await fill();
    const dump = await exportJson(db.exec, { appVersion: 'test' });
    const tables = dump.tables;
    const incoming: LearnerExport = {
      ...dump,
      tables: {
        settings: [{ ...tables.settings[0]!, value: 'old', at: at(-10) }],
        cards: [
          { ...tables.cards[0]!, reps: 9, at: at(100) },
          { ...tables.cards[1]!, reps: 9, at: at(-100) },
          { ...card('c'), at: at(5) },
        ],
        reviews: [{ ...tables.reviews[0]!, rating: 'easy' }, review('r3', 'c', 4)],
        attempts: tables.attempts,
      },
    };
    const report = await importJson(db.exec, incoming);
    expect(report).toEqual({
      settings: { added: 0, updated: 0, unchanged: 1 },
      cards: { added: 1, updated: 1, unchanged: 1 },
      reviews: { added: 1, updated: 0, unchanged: 1 },
      attempts: { added: 0, updated: 0, unchanged: 1 },
    });
    expect(await store.settings.get('repertoire')).toBe('{"white":"italian-white"}');
    expect((await store.cards.get('a'))?.reps).toBe(9);
    expect((await store.cards.get('b'))?.reps).toBe(1);
    expect(await store.cards.get('c')).toEqual(card('c'));
    expect((await store.reviews.forCards(['a', 'c'])).map((row) => [row.id, row.rating])).toEqual([
      ['r1', 'good'],
      ['r3', 'good'],
    ]);
  });

  it('imports an export from schema 1, which had no attempts', async () => {
    const empty = await open();
    const report = await importJson(empty.exec, {
      app: 'knightschool',
      format: 1,
      schema: 1,
      appVersion: 'old',
      exportedAt: at(0),
      tables: { settings: [], cards: [{ ...card('a'), at: at(0) }], reviews: [review('r1', 'a', 1)] },
    });
    expect(report.attempts).toEqual({ added: 0, updated: 0, unchanged: 0 });
    expect(await createLearnerStore(empty.exec).cards.get('a')).toEqual(card('a'));
    empty.close();
  });

  it('refuses an export from a newer schema or format, and anything that is not an export', async () => {
    const dump = await exportJson(db.exec, { appVersion: 'test' });
    await expect(importJson(db.exec, { ...dump, schema: LATEST_SCHEMA_VERSION + 1 })).rejects.toThrow(NewerSchemaError);
    await expect(importJson(db.exec, { ...dump, format: 99 })).rejects.toThrow(/newer version of Knight School/);
    await expect(importJson(db.exec, { hello: 'world' })).rejects.toThrow('This is not a Knight School export.');
    await expect(importJson(db.exec, 'nonsense')).rejects.toThrow(ImportError);
  });

  it('writes nothing when one row fails to validate', async () => {
    await fill();
    const dump = await exportJson(db.exec, { appVersion: 'test' });
    const empty = await open();
    const bad = {
      ...dump,
      tables: { ...dump.tables, reviews: [dump.tables.reviews[0], { ...dump.tables.reviews[1], rating: 'superb' }] },
    };
    await expect(importJson(empty.exec, bad)).rejects.toThrow(/reviews, row 2, rating/);
    const after = await exportJson(empty.exec, { appVersion: 'test' });
    expect(after.tables).toEqual({ settings: [], cards: [], reviews: [], attempts: [] });
    empty.close();
  });
});
