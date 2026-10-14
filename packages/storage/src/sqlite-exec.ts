import type { Database } from '@sqlite.org/sqlite-wasm';
import type { SqlMethod, Statement } from './executor';

// Runs against an open sqlite-wasm database. Shared by the browser worker and the Node tests,
// so the code the tests exercise is the code the worker runs.

export function executeOn(db: Database, sql: string, params: unknown[], method: SqlMethod): { rows: unknown[] } {
  if (method === 'run') {
    db.exec({ sql, bind: params as never });
    return { rows: [] };
  }
  const rows = db.exec({ sql, bind: params as never, rowMode: 'array', returnValue: 'resultRows' }) as unknown[][];
  return { rows: method === 'get' ? (rows[0] ?? []) : rows };
}

export function transactionOn(db: Database, statements: Statement[]): void {
  db.transaction(() => {
    for (const { sql, params } of statements) db.exec({ sql, bind: params as never });
  });
}
