/** A value SQLite stores in one column. Booleans are written as 0 or 1, JSON as text. */
export type SqlValue = string | number | null;

/** One row, by column name (or alias) in select order. */
export type Row = Record<string, SqlValue>;

export type Statement = { sql: string; params?: readonly SqlValue[] };

/**
 * The only thing storage needs from SQLite. The browser implements it with a Worker (apps/web/src/data/storage), the
 * tests with an in-memory database (testing/memory.ts); both run the same functions over sqlite-wasm (sqlite-exec.ts).
 */
export interface SqlExecutor {
  /** Runs one statement and returns its rows (none for a write). */
  execute(sql: string, params?: readonly SqlValue[]): Promise<Row[]>;
  /** All or nothing, and no other statement runs in between. */
  transaction(statements: readonly Statement[]): Promise<void>;
}
