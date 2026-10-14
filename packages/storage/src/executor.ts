/** The only thing storage needs from SQLite: run a statement, or run a batch atomically. */
export type SqlMethod = 'run' | 'all' | 'get' | 'values';
export type Statement = { sql: string; params: unknown[] };

export interface SqlExecutor {
  /** Rows come back as arrays of column values, in select order (the shape Drizzle's proxy driver expects). */
  execute(sql: string, params: unknown[], method: SqlMethod): Promise<{ rows: unknown[] }>;
  /** All or nothing, and no other statement runs in between. */
  transaction(statements: Statement[]): Promise<void>;
}
