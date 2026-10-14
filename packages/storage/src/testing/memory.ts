import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import type { SqlExecutor } from '../executor';
import { migrate } from '../migrate';
import { createStorage, type StorageInternals } from '../repositories';
import { executeOn, transactionOn } from '../sqlite-exec';

/** A real SQLite in memory (same WASM build as the browser). For tests and anything running in Node. */
export async function openMemoryDatabase(): Promise<{ db: Database; exec: SqlExecutor }> {
  const sqlite3 = await sqlite3InitModule();
  const db = new sqlite3.oo1.DB(':memory:');
  const exec: SqlExecutor = {
    execute: async (sql, params, method) => executeOn(db, sql, params, method),
    transaction: async (statements) => transactionOn(db, statements),
  };
  return { db, exec };
}

export async function openMemoryStorage(): Promise<StorageInternals & { close(): void }> {
  const { db, exec } = await openMemoryDatabase();
  await migrate(exec);
  return { ...createStorage(exec), close: () => db.close() };
}
