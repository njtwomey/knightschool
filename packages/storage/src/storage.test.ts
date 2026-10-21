import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attempt, at, card, evalLine, explorerEntry, guess, speed, review, T0 } from './fixtures';
import { LATEST_SCHEMA_VERSION, migrate } from './migrate';
import { MIGRATIONS } from './migrations.generated';
import * as schema from './schema';
import { createStorage } from './repositories';
import { exportJson, importJson } from './transfer';
import { openMemoryDatabase, openMemoryStorage } from './testing/memory';

// Drizzle keeps camelCase names and converts them to snake_case when it writes SQL.
const snake = (name: string) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

type Open = Awaited<ReturnType<typeof openMemoryStorage>>;

const PGN = '[Event "Knight School"]\n[For "white"]\n\n1. e4 e5 *\n';
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
      'authored_chapters',
      'authored_courses',
      'authored_history',
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

  it('upgrades a database from schema 4 to the authoring tables without touching what was there', async () => {
    const { exec } = await openMemoryDatabase();
    await migrate(exec, MIGRATIONS.slice(0, 5));
    const storage = createStorage(exec).storage;
    await storage.cards.save(card('kept', { reps: 4 }));
    await storage.reviews.append(review('r1', 'kept'));
    await storage.settings.set('enrolled', '["italian-game"]', T0);
    await migrate(exec);
    expect(await storage.cards.get('kept')).toEqual(card('kept', { reps: 4 }));
    expect(await storage.reviews.forCard('kept')).toEqual([review('r1', 'kept')]);
    expect(await storage.settings.get('enrolled')).toBe('["italian-game"]');
    expect(await storage.authoring.chapters()).toEqual([]);
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

  it("lists the reviews of one opening's cards, oldest first", async () => {
    await s.storage.cards.insertMissing([card('a'), card('b'), card('c', { openingId: 'scotch-game' })]);
    await s.storage.reviews.append(review('r2', 'b', { at: at(20) }));
    await s.storage.reviews.append(review('r1', 'a', { at: at(10) }));
    await s.storage.reviews.append(review('r3', 'c', { at: at(5) }));
    await s.storage.reviews.append(review('r4', 'gone', { at: at(1) }));
    expect(await s.storage.reviews.byOpening('italian-game')).toEqual([
      review('r1', 'a', { at: at(10) }),
      review('r2', 'b', { at: at(20) }),
    ]);
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
  await target.storage.authoring.apply({
    group: 'g1',
    at: at(3),
    edits: [
      { historyId: 'h1', kind: 'chapter', itemId: 'my-line', body: PGN },
      { historyId: 'h2', kind: 'course', itemId: 'my-course', body: '{"name":"Mine"}' },
    ],
  });
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
      authoredChapters: 1,
      authoredCourses: 1,
      authoredHistory: 2,
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

describe('authored content', () => {
  let n = 0;
  const id = () => `h${String(++n).padStart(3, '0')}`;
  const save = (group: string, minute: number, kind: 'chapter' | 'course', itemId: string, body: string | null) =>
    s.storage.authoring.apply({ group, at: at(minute), edits: [{ historyId: id(), kind, itemId, body }] });
  const chapter = async (itemId: string) => (await s.storage.authoring.chapters()).find((row) => row.id === itemId);

  it('keeps every earlier version in history, and deletes softly', async () => {
    await save('g1', 1, 'chapter', 'a', 'one');
    await save('g2', 2, 'chapter', 'a', 'two');
    await save('g3', 3, 'chapter', 'a', null);
    expect(await chapter('a')).toEqual({ id: 'a', pgn: 'two', at: at(3), deletedAt: at(3) });
    const history = await s.storage.authoring.history();
    expect(history.map((row) => [row.group, row.before, row.beforeDeletedAt])).toEqual([
      ['g3', 'two', null],
      ['g2', 'one', null],
      ['g1', null, null],
    ]);
    // Deleting what is already deleted or never existed writes nothing.
    await save('g4', 4, 'chapter', 'a', null);
    await save('g5', 4, 'chapter', 'nothing', null);
    expect(await s.storage.authoring.history()).toHaveLength(3);
  });

  it('undoes the newest action whole, step by step, and records each undo', async () => {
    await save('g1', 1, 'chapter', 'a', 'one');
    await s.storage.authoring.apply({
      group: 'g2',
      at: at(2),
      edits: [
        { historyId: id(), kind: 'chapter', itemId: 'a', body: 'two' },
        { historyId: id(), kind: 'course', itemId: 'c', body: '{}' },
      ],
    });
    await save('g3', 3, 'chapter', 'a', null);

    expect(await s.storage.authoring.undo('u1', at(4), id)).toBe('g3'); // the delete is taken back
    expect(await chapter('a')).toMatchObject({ pgn: 'two', deletedAt: null });
    expect(await s.storage.authoring.undo('u2', at(5), id)).toBe('g2'); // both items of g2 go back
    expect(await chapter('a')).toMatchObject({ pgn: 'one', deletedAt: null });
    expect((await s.storage.authoring.courses())[0]).toMatchObject({ id: 'c', deletedAt: at(5) }); // created: deleted
    expect(await s.storage.authoring.undo('u3', at(6), id)).toBe('g1');
    expect(await chapter('a')).toMatchObject({ pgn: 'one', deletedAt: at(6) }); // the text is kept
    expect(await s.storage.authoring.undo('u4', at(7), id)).toBeUndefined();
    const undos = (await s.storage.authoring.history()).filter((row) => row.undoOf);
    expect(undos.map((row) => row.undoOf)).toEqual(['g1', 'g2', 'g2', 'g3']);
  });

  it('counts the edits since a time, for the reminder to export', async () => {
    await save('g1', 1, 'chapter', 'a', 'one');
    await save('g2', 5, 'chapter', 'a', 'two');
    expect(await s.storage.authoring.changesSince(at(0))).toBe(2);
    expect(await s.storage.authoring.changesSince(at(1))).toBe(1);
  });

  it('imports an export from before authoring (schema 4) without loss', async () => {
    await s.storage.cards.save(card('mine', { at: at(1) }));
    const old = {
      app: 'knightschool',
      schemaVersion: 4,
      exportedAt: T0,
      tables: {
        cards: [card('a')],
        reviews: [review('r1', 'a')],
        quizAttempts: [],
        guessAttempts: [],
        speedAttempts: [],
        evalCache: [],
        settings: [],
        explorerCache: [],
      },
    };
    const report = await importJson(s, old);
    expect(report).toMatchObject({ cards: 1, reviews: 1, authoredChapters: 0, authoredHistory: 0 });
    expect(await s.storage.cards.get('a')).toEqual(card('a'));
    expect(await s.storage.cards.get('mine')).toBeDefined();
  });

  it('merges authored content from another device: the newer copy wins, history is the union', async () => {
    const other = await openMemoryStorage();
    await save('g1', 1, 'chapter', 'a', 'mine');
    await other.storage.authoring.apply({
      group: 'o1',
      at: at(5),
      edits: [{ historyId: 'o-h1', kind: 'chapter', itemId: 'a', body: 'theirs' }],
    });
    await importJson(s, await exportJson(other));
    expect(await chapter('a')).toMatchObject({ pgn: 'theirs' });
    expect((await s.storage.authoring.history()).map((row) => row.group)).toEqual(['o1', 'g1']);
    other.close();
  });
});
