import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attempt, at, card, evalLine, explorerEntry, guess, speed, review, T0 } from './fixtures';
import { LATEST_SCHEMA_VERSION, migrate } from './migrate';
import { MIGRATIONS } from './migrations.generated';
import * as schema from './schema';
import { exportJson, importJson } from './transfer';
import { openMemoryDatabase, openMemoryStorage } from './testing/memory';

// Drizzle keeps camelCase names and converts them to snake_case when it writes SQL.
const snake = (name: string) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

type Open = Awaited<ReturnType<typeof openMemoryStorage>>;
let s: Open;
beforeEach(async () => {
  s = await openMemoryStorage();
});
afterEach(() => s.close());

describe('migrations', () => {
  it('creates every table and records the version', async () => {
    const { rows } = await s.exec.execute(
      "select name from sqlite_master where type = 'table' order by name",
      [],
      'all',
    );
    expect(rows.flat()).toEqual([
      'cards',
      'eval_cache',
      'explorer_cache',
      'guess_attempts',
      'meta',
      'quiz_attempts',
      'reviews',
      'settings',
      'speed_attempts',
    ]);
    const version = await s.exec.execute("select value from meta where key = 'schema_version'", [], 'get');
    expect(Number(version.rows[0])).toBe(LATEST_SCHEMA_VERSION);
  });

  it('can run again without changing anything', async () => {
    await s.storage.cards.save(card('a'));
    await migrate(s.exec);
    expect(await s.storage.cards.get('a')).toEqual(card('a'));
  });

  it('matches the Drizzle schema column for column (run `pnpm db:generate` if this fails)', async () => {
    for (const table of Object.values(schema)) {
      const { name, columns } = getTableConfig(table);
      const { rows } = await s.exec.execute(`pragma table_info(${name})`, [], 'all');
      const inDb = (rows as unknown[][]).map((row) => row[1]).sort();
      expect(inDb, name).toEqual(columns.map((column) => snake(column.name)).sort());
    }
  });

  it('upgrades a database from the first version and keeps its cards', async () => {
    const { exec } = await openMemoryDatabase();
    await migrate(exec, MIGRATIONS.slice(0, 1));
    await exec.execute(
      "insert into cards values ('old', 'italian-game', 'e', 'e2e4', ?, 1, 2, 3, 0, 'review', null, ?)",
      [T0, T0],
      'run',
    );
    await migrate(exec);
    const { rows } = await exec.execute(
      "select reps, scheduled_days, learning_steps from cards where id = 'old'",
      [],
      'get',
    );
    expect(rows).toEqual([3, 0, 0]);
  });

  it('refuses a database saved by a newer app', async () => {
    const { exec } = await openMemoryDatabase();
    await migrate(exec);
    await exec.execute("update meta set value = '999' where key = 'schema_version'", [], 'run');
    await expect(migrate(exec)).rejects.toThrow(/newer version/);
  });
});

describe('transactions', () => {
  it('roll back everything when one statement fails', async () => {
    await expect(
      s.exec.transaction([
        { sql: "insert into settings (key, value, at) values ('a', '1', ?)", params: [T0] },
        { sql: 'insert into no_such_table values (1)', params: [] },
      ]),
    ).rejects.toThrow();
    expect(await s.storage.settings.all()).toEqual([]);
  });
});

describe('cards', () => {
  it('lists due cards earliest first and counts them per opening', async () => {
    await s.storage.cards.insertMissing([
      card('late', { due: at(30) }),
      card('early', { due: at(-10) }),
      card('other', { due: at(-5), openingId: 'scotch-game' }),
    ]);
    expect((await s.storage.cards.due(at(0))).map((c) => c.id)).toEqual(['early', 'other']);
    expect(await s.storage.cards.countDue(at(0))).toBe(2);
    expect(await s.storage.cards.countDue(at(0), 'scotch-game')).toBe(1);
    expect(await s.storage.cards.countDue(at(60))).toBe(3);
    expect((await s.storage.cards.due(at(60), 1)).map((c) => c.id)).toEqual(['early']);
  });

  it('insertMissing keeps the schedule of cards that already exist', async () => {
    await s.storage.cards.save(card('a', { reps: 5, state: 'review' }));
    await s.storage.cards.insertMissing([card('a'), card('b')]);
    expect((await s.storage.cards.get('a'))?.reps).toBe(5);
    expect(await s.storage.cards.byOpening('italian-game')).toHaveLength(2);
  });

  it('counts the cards answered at least once, per opening', async () => {
    await s.storage.cards.insertMissing([
      card('a', { reps: 2 }),
      card('b', { reps: 1 }),
      card('c'),
      card('d', { openingId: 'scotch-game', reps: 3 }),
      card('e', { openingId: 'london-system' }),
    ]);
    expect(await s.storage.cards.learnedByOpening()).toEqual({ 'italian-game': 2, 'scotch-game': 1 });
  });

  it('save updates an existing card', async () => {
    await s.storage.cards.save(card('a'));
    await s.storage.cards.save(card('a', { reps: 1, lastReview: at(1), at: at(1) }));
    expect(await s.storage.cards.get('a')).toMatchObject({ reps: 1, lastReview: at(1) });
  });
});

describe('reviews', () => {
  it('records the card and the log row together', async () => {
    await s.storage.cards.save(card('a'));
    await s.storage.reviews.record(card('a', { reps: 1, at: at(1) }), review('r1', 'a', { at: at(1) }));
    expect((await s.storage.cards.get('a'))?.reps).toBe(1);
    expect(await s.storage.reviews.forCard('a')).toEqual([review('r1', 'a', { at: at(1) })]);
  });

  it('never updates a log row, and keeps booleans as booleans', async () => {
    await s.storage.reviews.append(review('r1', 'a', { hintUsed: true }));
    await s.storage.reviews.append(review('r1', 'a', { hintUsed: false, rating: 'again' }));
    const [row, ...rest] = await s.storage.reviews.forCard('a');
    expect(rest).toEqual([]);
    expect(row).toMatchObject({ hintUsed: true, rating: 'good' });
  });

  it('lists reviews from a time onwards, oldest first', async () => {
    await s.storage.reviews.append(review('r2', 'a', { at: at(20) }));
    await s.storage.reviews.append(review('r1', 'a', { at: at(10) }));
    await s.storage.reviews.append(review('r0', 'a', { at: at(-10) }));
    expect((await s.storage.reviews.since(at(0))).map((r) => r.id)).toEqual(['r1', 'r2']);
  });
});

describe('quiz attempts, evals, settings, explorer', () => {
  it('stores quiz attempts', async () => {
    await s.storage.quizAttempts.append(attempt('q1'));
    await s.storage.quizAttempts.append(attempt('q2', { matched: false, at: at(5) }));
    expect((await s.storage.quizAttempts.forQuiz('quiz-1')).map((a) => [a.id, a.matched])).toEqual([
      ['q1', true],
      ['q2', false],
    ]);
  });

  it('stores guess attempts and exports them', async () => {
    await s.storage.guessAttempts.append(guess('g1'));
    await s.storage.guessAttempts.append(guess('g2', { result: 'miss', at: at(5) }));
    expect((await s.storage.guessAttempts.since(at(1))).map((a) => [a.id, a.result])).toEqual([['g2', 'miss']]);
    const dump = await exportJson(s);
    expect(dump.tables.guessAttempts).toHaveLength(2);
  });

  it('stores speed attempts and exports them', async () => {
    await s.storage.speedAttempts.append(speed('s1'));
    await s.storage.speedAttempts.append(speed('s2', { errors: 0, at: at(5) }));
    expect((await s.storage.speedAttempts.since(at(1))).map((a) => [a.id, a.errors])).toEqual([['s2', 0]]);
    expect((await exportJson(s)).tables.speedAttempts).toHaveLength(2);
  });

  it('records a quiz answer, its review and the new schedule together', async () => {
    await s.storage.cards.save(card('quiz:t:one', { openingId: 't' }));
    await s.storage.quizAttempts.record(
      card('quiz:t:one', { openingId: 't', reps: 1, at: at(1) }),
      review('r1', 'quiz:t:one', { at: at(1) }),
      attempt('q1', { quizId: 'quiz:t:one', at: at(1) }),
    );
    expect((await s.storage.cards.get('quiz:t:one'))?.reps).toBe(1);
    expect(await s.storage.reviews.forCard('quiz:t:one')).toHaveLength(1);
    expect((await s.storage.quizAttempts.forQuiz('quiz:t:one'))[0]).toMatchObject({ id: 'q1', matched: true });
  });

  it('caches engine lines per position, depth and engine, and overwrites on re-measure', async () => {
    await s.storage.evals.put([evalLine(1), evalLine(2), evalLine(3), evalLine(1, { depth: 12 })]);
    expect((await s.storage.evals.get('epd-1', 18, 'sf18-lite-single')).map((l) => l.multipv)).toEqual([1, 2, 3]);
    expect(await s.storage.evals.get('epd-1', 20, 'sf18-lite-single')).toEqual([]);
    await s.storage.evals.put([evalLine(1, { cp: 99 })]);
    expect((await s.storage.evals.get('epd-1', 18, 'sf18-lite-single'))[0]?.cp).toBe(99);
  });

  it('stores null scores and mates', async () => {
    await s.storage.evals.put([evalLine(1, { cp: null, mate: 3 })]);
    expect((await s.storage.evals.get('epd-1', 18, 'sf18-lite-single'))[0]).toMatchObject({ cp: null, mate: 3 });
  });

  it('keeps settings by key', async () => {
    expect(await s.storage.settings.get('grading')).toBeUndefined();
    await s.storage.settings.set('grading', 'auto', T0);
    await s.storage.settings.set('grading', 'manual', at(1));
    expect(await s.storage.settings.get('grading')).toBe('manual');
    expect(await s.storage.settings.all()).toEqual([{ key: 'grading', value: 'manual', at: at(1) }]);
  });

  it('returns an explorer answer only inside its time to live', async () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    await s.storage.explorer.put(explorerEntry());
    const key = explorerEntry().key;
    expect(await s.storage.explorer.get(key, at(60), thirtyDays)).toEqual(explorerEntry());
    expect(await s.storage.explorer.get(key, at(31 * 24 * 60), thirtyDays)).toBeUndefined();
    expect(await s.storage.explorer.get('missing', at(0), thirtyDays)).toBeUndefined();
  });
});

async function populate(target: Open) {
  await target.storage.cards.insertMissing([card('a', { reps: 2, state: 'review', at: at(2) }), card('b')]);
  await target.storage.reviews.append(review('r1', 'a'));
  await target.storage.reviews.append(
    review('r2', 'a', { at: at(2), rating: 'hard', playedUci: null, hintUsed: true }),
  );
  await target.storage.quizAttempts.append(attempt('q1'));
  await target.storage.evals.put([evalLine(1), evalLine(2)]);
  await target.storage.settings.set('grading', 'auto', T0);
  await target.storage.explorer.put(explorerEntry());
}

describe('export and import', () => {
  it('imports an export into a wiped database with identical rows', async () => {
    await populate(s);
    const dump = await exportJson(s);
    const fresh = await openMemoryStorage();
    const report = await importJson(fresh, JSON.parse(JSON.stringify(dump)));
    expect(report).toEqual({
      cards: 2,
      reviews: 2,
      quizAttempts: 1,
      guessAttempts: 0,
      speedAttempts: 0,
      evalCache: 2,
      settings: 1,
      explorerCache: 1,
    });
    expect((await exportJson(fresh)).tables).toEqual(dump.tables);
    fresh.close();
  });

  it('is safe to import twice', async () => {
    await populate(s);
    const dump = await exportJson(s);
    await importJson(s, dump);
    await importJson(s, dump);
    expect((await exportJson(s)).tables).toEqual(dump.tables);
  });

  it('merges two devices: union of logs, newer copy of everything else', async () => {
    const other = await openMemoryStorage();
    await s.storage.cards.save(card('a', { reps: 1, at: at(1) }));
    await s.storage.reviews.append(review('r1', 'a'));
    await s.storage.settings.set('grading', 'auto', at(1));
    await other.storage.cards.save(card('a', { reps: 3, at: at(5) }));
    await other.storage.cards.save(card('c'));
    await other.storage.reviews.append(review('r2', 'a', { at: at(5) }));
    await other.storage.settings.set('grading', 'manual', at(0));

    await importJson(s, await exportJson(other));

    expect((await s.storage.cards.get('a'))?.reps).toBe(3); // other device is newer
    expect(await s.storage.cards.get('c')).toBeDefined();
    expect((await s.storage.reviews.forCard('a')).map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(await s.storage.settings.get('grading')).toBe('auto'); // this device is newer
    other.close();
  });

  it('writes nothing when one row is invalid', async () => {
    const dump = await exportJson(s);
    const bad = { ...dump, tables: { ...dump.tables, cards: [card('a'), { ...card('b'), reps: 'many' }] } };
    await expect(importJson(s, bad)).rejects.toThrow();
    expect(await s.storage.cards.byOpening('italian-game')).toEqual([]);
  });

  it('rejects a file from another app or a newer schema', async () => {
    const dump = await exportJson(s);
    await expect(importJson(s, { ...dump, app: 'something-else' })).rejects.toThrow();
    await expect(importJson(s, { ...dump, schemaVersion: 999 })).rejects.toThrow(/newer version/);
  });
});

describe('stats', () => {
  it('counts rows', async () => {
    await populate(s);
    expect(await s.storage.stats()).toEqual({ cards: 2, reviews: 2, quizAttempts: 1 });
  });
});
