import type { SqlExecutor } from './executor';
import type { LearnerStore } from './rows';
import {
  addAttempt,
  addReview,
  ATTEMPT_SELECT,
  attemptFromRow,
  CARD_SELECT,
  cardFromRow,
  placeholders,
  putCard,
  putSetting,
  REVIEW_SELECT,
  reviewFromRow,
} from './tables';

/** Card ids per `in (...)` query: well under SQLite's limit on parameters. */
const CHUNK = 500;

export type StoreOptions = { now?: () => Date };

/** The learner's data over one SQL executor. Run `migrate` on the executor first. */
export function createLearnerStore(exec: SqlExecutor, { now = () => new Date() }: StoreOptions = {}): LearnerStore {
  const run = async (statement: { sql: string; params?: readonly (string | number | null)[] }) => {
    await exec.execute(statement.sql, statement.params);
  };
  return {
    cards: {
      all: async () => (await exec.execute(`${CARD_SELECT} order by rowid`)).map(cardFromRow),
      get: async (id) => {
        const [row] = await exec.execute(`${CARD_SELECT} where id = ?`, [id]);
        return row ? cardFromRow(row) : undefined;
      },
      put: (card) => run(putCard({ ...card, at: now().toISOString() })),
    },
    reviews: {
      add: (review) => run(addReview(review)),
      forCards: async (ids) => {
        const unique = [...new Set(ids)];
        const rows = [];
        for (let start = 0; start < unique.length; start += CHUNK) {
          const chunk = unique.slice(start, start + CHUNK);
          rows.push(
            ...(await exec.execute(`${REVIEW_SELECT} where card_id in (${placeholders(chunk.length)})`, chunk)),
          );
        }
        return rows.map(reviewFromRow).sort((a, b) => a.at.localeCompare(b.at));
      },
    },
    attempts: {
      add: (attempt) => run(addAttempt(attempt)),
      recent: async (limit) =>
        (await exec.execute(`${ATTEMPT_SELECT} order by at desc, rowid desc limit ?`, [limit])).map(attemptFromRow),
    },
    settings: {
      get: async (key) => {
        const [row] = await exec.execute('select value from settings where key = ?', [key]);
        return row ? String(row.value) : undefined;
      },
      set: (key, value) => run(putSetting({ key, value, at: now().toISOString() })),
      all: async () =>
        Object.fromEntries(
          (await exec.execute('select key, value from settings')).map((row) => [String(row.key), String(row.value)]),
        ),
      remove: (key) => run({ sql: 'delete from settings where key = ?', params: [key] }),
    },
  };
}
