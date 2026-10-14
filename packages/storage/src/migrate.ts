import type { SqlExecutor } from './executor';
import { MIGRATIONS, type Migration } from './migrations.generated';

const VERSION_KEY = 'schema_version';

export const LATEST_SCHEMA_VERSION = MIGRATIONS.at(-1)?.id ?? -1;

async function currentVersion(exec: SqlExecutor): Promise<number> {
  try {
    const { rows } = await exec.execute('select value from meta where key = ?', [VERSION_KEY], 'get');
    return rows.length ? Number(rows[0]) : -1;
  } catch {
    return -1; // no meta table yet: a fresh database
  }
}

/** Applies every migration newer than the database's version, each in its own transaction. */
export async function migrate(exec: SqlExecutor, migrations: Migration[] = MIGRATIONS): Promise<number> {
  const latest = migrations.at(-1)?.id ?? -1;
  const version = await currentVersion(exec);
  if (version > latest) {
    throw new Error(
      `This data was saved by a newer version of Knight School (schema ${version}, this app knows ${latest}).`,
    );
  }
  for (const migration of migrations.filter((candidate) => candidate.id > version)) {
    await exec.transaction([
      ...migration.statements.map((sql) => ({ sql, params: [] })),
      {
        sql: 'insert into meta (key, value) values (?, ?) on conflict (key) do update set value = excluded.value',
        params: [VERSION_KEY, String(migration.id)],
      },
    ]);
  }
  return latest;
}
