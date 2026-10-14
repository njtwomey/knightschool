/// <reference lib="webworker" />
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import { executeOn, transactionOn } from '../sqlite-exec';
import { DB_PATH, type WorkerRequest, type WorkerResponse } from './protocol';

// opfs-sahpool needs no COOP/COEP headers, so this works on any static host. It allows one connection at a time,
// which the client enforces with a Web Lock before it starts this worker.

type Opened = {
  db: Database;
  pool: Awaited<ReturnType<Awaited<ReturnType<typeof sqlite3InitModule>>['installOpfsSAHPoolVfs']>>;
};

let opened: Promise<Opened> | undefined;

function open(): Promise<Opened> {
  opened ??= (async () => {
    const sqlite3 = await sqlite3InitModule();
    const pool = await sqlite3.installOpfsSAHPoolVfs({});
    return { db: new pool.OpfsSAHPoolDb(DB_PATH), pool };
  })();
  // A failed open (another tab still holding the files) must not stick: the next request tries again.
  opened.catch(() => {
    opened = undefined;
  });
  return opened;
}

async function handle(request: WorkerRequest): Promise<unknown> {
  const session = await open();
  switch (request.op) {
    case 'execute':
      return executeOn(session.db, request.sql, request.params, request.method);
    case 'transaction':
      transactionOn(session.db, request.statements);
      return undefined;
    case 'exportDb':
      return session.pool.exportFile(DB_PATH);
    case 'importDb': {
      session.db.close();
      await session.pool.importDb(DB_PATH, request.bytes);
      session.db = new session.pool.OpfsSAHPoolDb(DB_PATH);
      return undefined;
    }
    case 'wipe': {
      session.db.close();
      await session.pool.wipeFiles();
      session.db = new session.pool.OpfsSAHPoolDb(DB_PATH);
      return undefined;
    }
  }
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id } = event.data;
  let response: WorkerResponse;
  try {
    const result = await handle(event.data);
    response = { id, ok: true, result };
  } catch (error) {
    response = { id, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  postMessage(response);
};
