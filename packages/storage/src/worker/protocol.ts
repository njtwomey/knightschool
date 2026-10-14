import type { SqlMethod, Statement } from '../executor';

export type WorkerRequest = { id: number } & (
  | { op: 'execute'; sql: string; params: unknown[]; method: SqlMethod }
  | { op: 'transaction'; statements: Statement[] }
  | { op: 'exportDb' }
  | { op: 'importDb'; bytes: ArrayBuffer }
  | { op: 'wipe' }
);

export type WorkerResponse = { id: number } & ({ ok: true; result?: unknown } | { ok: false; error: string });

/** Where the database lives inside the origin-private file system. Paths must be absolute for opfs-sahpool. */
export const DB_PATH = '/knightschool.db';
