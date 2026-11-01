import type { Database } from '@sqlite.org/sqlite-wasm';
import type { Row, SqlValue, Statement } from './executor';

// Runs statements on an open sqlite-wasm database. Shared by the browser worker and the Node tests, so the code the
// tests exercise is the code the worker runs. Imports only types, so the worker bundles nothing else from storage.

const bind = (params: readonly SqlValue[] | undefined) => (params?.length ? (params as SqlValue[]) : undefined);

export function executeOn(db: Database, sql: string, params?: readonly SqlValue[]): Row[] {
  return db.exec({ sql, bind: bind(params), rowMode: 'object', returnValue: 'resultRows' }) as Row[];
}

export function transactionOn(db: Database, statements: readonly Statement[]): void {
  db.transaction(() => {
    for (const { sql, params } of statements) db.exec({ sql, bind: bind(params) });
  });
}
