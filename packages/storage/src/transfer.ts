import { z } from 'zod';
import type { SqlExecutor, Statement } from './executor';
import { NewerSchemaError, schemaVersion } from './migrate';
import { LATEST_SCHEMA_VERSION } from './migrations';
import {
  AttemptRowSchema,
  CardRowSchema,
  ReviewRowSchema,
  SettingRowSchema,
  type AttemptRow,
  type CardRow,
  type ReviewRow,
  type SettingRow,
} from './rows';
import {
  addAttempt,
  addReview,
  ATTEMPT_SELECT,
  attemptFromRow,
  CARD_SELECT,
  cardRowFromRow,
  putCard,
  putSetting,
  REVIEW_SELECT,
  reviewFromRow,
  SETTING_SELECT,
} from './tables';

/** The export file's shape. Bump it when the shape changes, and keep every older one importing. */
export const EXPORT_FORMAT = 1;

export type LearnerTables = { settings: SettingRow[]; cards: CardRow[]; reviews: ReviewRow[]; attempts: AttemptRow[] };

/** Everything the learner has, in one JSON object (docs/v2/schemas/learner.md "Export"). */
export type LearnerExport = {
  app: 'knightschool';
  /** The export file's shape (`EXPORT_FORMAT`). */
  format: number;
  /** The database's schema version it was made from. */
  schema: number;
  /** The app that wrote it. */
  appVersion: string;
  exportedAt: string;
  tables: LearnerTables;
};

export type TableReport = { added: number; updated: number; unchanged: number };
export type ImportReport = Record<keyof LearnerTables, TableReport>;

/** An import that was refused. Nothing was written. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export async function exportJson(
  exec: SqlExecutor,
  { appVersion, now = () => new Date() }: { appVersion: string; now?: () => Date },
): Promise<LearnerExport> {
  const [settings, cards, reviews, attempts] = await Promise.all([
    exec.execute(`${SETTING_SELECT} order by key`),
    exec.execute(`${CARD_SELECT} order by rowid`),
    exec.execute(`${REVIEW_SELECT} order by at, rowid`),
    exec.execute(`${ATTEMPT_SELECT} order by at, rowid`),
  ]);
  return {
    app: 'knightschool',
    format: EXPORT_FORMAT,
    schema: await schemaVersion(exec),
    appVersion,
    exportedAt: now().toISOString(),
    tables: {
      settings: settings as unknown as SettingRow[],
      cards: cards.map(cardRowFromRow),
      reviews: reviews.map(reviewFromRow),
      attempts: attempts.map(attemptFromRow),
    },
  };
}

const Header = z.object({
  app: z.literal('knightschool', { error: 'This is not a Knight School export.' }),
  format: z.number().int().positive(),
  schema: z.number().int().nonnegative(),
});

// Tables an older schema did not have are simply missing from its exports.
const TABLES = {
  settings: SettingRowSchema,
  cards: CardRowSchema,
  reviews: ReviewRowSchema,
  attempts: AttemptRowSchema,
} as const;

function readTables(input: Record<string, unknown>): LearnerTables {
  const tables = z.record(z.string(), z.unknown()).safeParse(input.tables ?? {});
  if (!tables.success) throw new ImportError('The file has no tables to import. Nothing was changed.');
  const read = {} as Record<keyof LearnerTables, unknown[]>;
  for (const [name, schema] of Object.entries(TABLES) as [keyof LearnerTables, z.ZodType][]) {
    const rows = z.array(schema).safeParse(tables.data[name] ?? []);
    if (!rows.success) {
      const issue = rows.error.issues[0];
      const [index, ...field] = issue?.path ?? [];
      const where =
        typeof index === 'number' ? `${name}, row ${index + 1}${field.length ? `, ${field.join('.')}` : ''}` : name;
      throw new ImportError(`The file could not be imported (${where}: ${issue?.message}). Nothing was changed.`);
    }
    read[name] = rows.data;
  }
  return read as LearnerTables;
}

/** The newest row per key, so a file listing one card twice still imports. */
function newestBy<T extends { at: string }>(rows: T[], key: (row: T) => string): Map<string, T> {
  const newest = new Map<string, T>();
  for (const row of rows) {
    const seen = newest.get(key(row));
    if (!seen || row.at > seen.at) newest.set(key(row), row);
  }
  return newest;
}

/**
 * Merges an export into the database (docs/v2/library/storage.md): settings and cards by `at` (the newer copy wins),
 * reviews and attempts as logs (rows already there are kept, new ones added). Refuses a file from a newer schema or
 * export format, and writes nothing if any row fails to validate. One transaction: all of it or none.
 */
export async function importJson(exec: SqlExecutor, input: unknown): Promise<ImportReport> {
  const header = Header.safeParse(input);
  if (!header.success) {
    const issue = header.error.issues[0];
    const message = issue?.path[0] === 'app' ? issue.message : 'This is not a Knight School export.';
    throw new ImportError(`${message} Nothing was changed.`);
  }
  if (header.data.schema > LATEST_SCHEMA_VERSION) throw new NewerSchemaError(header.data.schema);
  if (header.data.format > EXPORT_FORMAT) {
    throw new ImportError(
      `This file was made by a newer version of Knight School (export format ${header.data.format}). Reload the ` +
        'page to get the newest version, then import it again.',
    );
  }
  const tables = readTables(input as Record<string, unknown>);

  const [settingsAt, cardsAt, reviewIds, attemptIds] = await Promise.all([
    exec.execute('select key as id, at from settings'),
    exec.execute('select id, at from cards'),
    exec.execute('select id from reviews'),
    exec.execute('select id from attempts'),
  ]);
  const atOf = (rows: typeof settingsAt) => new Map(rows.map((row) => [String(row.id), String(row.at)]));
  const statements: Statement[] = [];
  const report = {} as ImportReport;

  const mergeByAt = <T extends { at: string }>(
    name: 'settings' | 'cards',
    rows: Map<string, T>,
    existing: Map<string, string>,
    write: (row: T) => Statement,
  ) => {
    const counts: TableReport = { added: 0, updated: 0, unchanged: 0 };
    for (const [key, row] of rows) {
      const at = existing.get(key);
      if (at === undefined) counts.added++;
      else if (row.at > at) counts.updated++;
      else {
        counts.unchanged++;
        continue;
      }
      statements.push(write(row));
    }
    report[name] = counts;
  };
  mergeByAt(
    'settings',
    newestBy(tables.settings, (row) => row.key),
    atOf(settingsAt),
    (row) => putSetting(row, true),
  );
  mergeByAt(
    'cards',
    newestBy(tables.cards, (row) => row.id),
    atOf(cardsAt),
    (row) => putCard(row, true),
  );

  const appendLog = <T extends { id: string }>(
    name: 'reviews' | 'attempts',
    rows: T[],
    existing: typeof reviewIds,
    write: (row: T) => Statement,
  ) => {
    const seen = new Set(existing.map((row) => String(row.id)));
    const counts: TableReport = { added: 0, updated: 0, unchanged: 0 };
    for (const row of rows) {
      if (seen.has(row.id)) {
        counts.unchanged++;
        continue;
      }
      seen.add(row.id);
      counts.added++;
      statements.push(write(row));
    }
    report[name] = counts;
  };
  appendLog('reviews', tables.reviews, reviewIds, (row) => addReview(row, true));
  appendLog('attempts', tables.attempts, attemptIds, (row) => addAttempt(row, true));

  if (statements.length) await exec.transaction(statements);
  return report;
}
