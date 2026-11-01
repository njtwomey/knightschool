import type { SqlExecutor } from './executor';
import { LATEST_SCHEMA_VERSION, MIGRATIONS, type Migration } from './migrations';

const VERSION_KEY = 'schema_version';

/** A database (or an export) saved by a newer Knight School than this one. Never opened or imported. */
export class NewerSchemaError extends Error {
  constructor(found: number, known: number = LATEST_SCHEMA_VERSION) {
    super(
      `This data was saved by a newer version of Knight School (database version ${found}; this one knows up to ` +
        `${known}). Reload the page to get the newest version.`,
    );
    this.name = 'NewerSchemaError';
  }
}

/** The database's schema version: 0 for a new, empty database. */
export async function schemaVersion(exec: SqlExecutor): Promise<number> {
  const tables = await exec.execute("select 1 from sqlite_master where type = 'table' and name = 'meta'");
  if (!tables.length) return 0;
  const rows = await exec.execute('select value from meta where key = ?', [VERSION_KEY]);
  return rows.length ? Number(rows[0]?.value) : 0;
}

/**
 * Applies every migration newer than the database, each in its own transaction with the new version written in it, so
 * a failure leaves the database at the last version that worked. Refuses a database newer than the app.
 */
export async function migrate(exec: SqlExecutor, migrations: readonly Migration[] = MIGRATIONS): Promise<number> {
  const latest = migrations.at(-1)?.version ?? 0;
  const version = await schemaVersion(exec);
  if (version > latest) throw new NewerSchemaError(version, latest);
  for (const migration of migrations.filter((candidate) => candidate.version > version)) {
    await exec.transaction([
      ...migration.statements.map((sql) => ({ sql })),
      {
        sql: 'insert into meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value',
        params: [VERSION_KEY, String(migration.version)],
      },
    ]);
  }
  return latest;
}
