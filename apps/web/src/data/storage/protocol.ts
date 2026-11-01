import type { Row, SqlValue, Statement } from '@knightschool/storage';

/** What the main thread asks the database worker. Each request has an id; the answer carries it back. */
export type WorkerRequest = { id: number } & (
  | { op: 'execute'; sql: string; params?: readonly SqlValue[] }
  | { op: 'transaction'; statements: readonly Statement[] }
  /** Copies the database to a new snapshot, keeping the newest two; answers with the snapshot's name. */
  | { op: 'snapshot'; label: string }
  /** Replaces the database with a snapshot taken earlier. */
  | { op: 'restore'; name: string }
);

export type WorkerResponse = { id: number } & ({ ok: true; result?: Row[] | string } | { ok: false; error: string });

/** Where the database lives in the origin-private file system. opfs-sahpool needs absolute paths. */
export const DB_PATH = '/learner.db';
export const SNAPSHOT_PREFIX = '/snapshot-';
export const SNAPSHOTS_KEPT = 2;
