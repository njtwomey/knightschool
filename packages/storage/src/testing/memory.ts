import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import type { SqlExecutor } from '../executor';
import { executeOn, transactionOn } from '../sqlite-exec';

let sqlite: ReturnType<typeof sqlite3InitModule> | undefined;

/** A real SQLite in memory (the same WASM build as the browser's worker), unmigrated. For tests and Node scripts. */
export async function openMemoryDatabase(): Promise<{ db: Database; exec: SqlExecutor; close(): void }> {
  sqlite ??= sqlite3InitModule();
  const db = new (await sqlite).oo1.DB(':memory:');
  const exec: SqlExecutor = {
    execute: async (sql, params) => executeOn(db, sql, params),
    transaction: async (statements) => transactionOn(db, statements),
  };
  return { db, exec, close: () => db.close() };
}
