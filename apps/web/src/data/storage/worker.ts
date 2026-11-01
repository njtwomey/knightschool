import sqlite3InitModule, { type Database, type SAHPoolUtil } from '@sqlite.org/sqlite-wasm';
import type { Row } from '@knightschool/storage';
import { executeOn, transactionOn } from '@knightschool/storage/sqlite';
import { DB_PATH, SNAPSHOT_PREFIX, SNAPSHOTS_KEPT, type WorkerRequest, type WorkerResponse } from './protocol';

// The learner database's worker: sqlite-wasm on the opfs-sahpool VFS, which needs no COOP/COEP headers, so it works on
// any static host. The VFS allows one connection at a time; the client holds a Web Lock before it starts this worker.

type Session = { db: Database; pool: SAHPoolUtil };

let opened: Promise<Session> | undefined;

function open(): Promise<Session> {
  opened ??= (async () => {
    const sqlite3 = await sqlite3InitModule();
    // A pool of its own: v1's database (the default pool, schema 5) stays as it was until a migration reads it across.
    const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'knightschool-learner' });
    // The database, its journal, and the snapshots (one more while the oldest is replaced).
    await pool.reserveMinimumCapacity(8);
    return { db: new pool.OpfsSAHPoolDb(DB_PATH), pool };
  })();
  // A failed open (another tab still holding the files) must not stick: the next request tries again.
  opened.catch(() => {
    opened = undefined;
  });
  return opened;
}

async function handle(request: WorkerRequest): Promise<Row[] | string | undefined> {
  const session = await open();
  switch (request.op) {
    case 'execute':
      return executeOn(session.db, request.sql, request.params);
    case 'transaction':
      transactionOn(session.db, request.statements);
      return undefined;
    case 'snapshot': {
      const name = `${SNAPSHOT_PREFIX}${request.label}.db`;
      await session.pool.importDb(name, session.pool.exportFile(DB_PATH));
      // Labels start with a fixed-width time, so name order is age order.
      const snapshots = session.pool
        .getFileNames()
        .filter((file) => file.startsWith(SNAPSHOT_PREFIX))
        .sort();
      for (const old of snapshots.slice(0, -SNAPSHOTS_KEPT)) session.pool.unlink(old);
      return name;
    }
    case 'restore': {
      const bytes = session.pool.exportFile(request.name);
      session.db.close();
      await session.pool.importDb(DB_PATH, bytes);
      session.db = new session.pool.OpfsSAHPoolDb(DB_PATH);
      return undefined;
    }
  }
}

// One request at a time, in the order sent: a snapshot or restore never interleaves with a statement.
let queue = Promise.resolve();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  queue = queue.then(async () => {
    let response: WorkerResponse;
    try {
      response = { id: request.id, ok: true, result: await handle(request) };
    } catch (error) {
      response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    self.postMessage(response);
  });
};
