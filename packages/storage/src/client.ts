import type { SqlExecutor } from './executor';
import { migrate } from './migrate';
import { createStorage, type StorageInternals } from './repositories';
import { exportJson, importJson, type Dump, type ImportReport } from './transfer';
import type { WorkerRequest, WorkerResponse } from './worker/protocol';

export class StorageUnavailableError extends Error {
  constructor() {
    super(
      'This browser cannot keep data on this device (no private file storage). Try a current Chrome, Safari or Firefox.',
    );
  }
}

export type BrowserStorage = StorageInternals & {
  exportJson(): Promise<Dump>;
  importJson(input: unknown): Promise<ImportReport>;
  /** The raw SQLite file, for backup or opening in any SQLite tool. */
  exportSqlite(): Promise<Uint8Array<ArrayBuffer>>;
  /** Replaces the whole database with a SQLite file exported earlier. */
  importSqlite(bytes: Uint8Array): Promise<void>;
  /** Deletes everything stored on this device. */
  wipe(): Promise<void>;
  close(): void;
};

const LOCK_NAME = 'knightschool-database';

/**
 * Only one tab can hold the database (opfs-sahpool allows one connection), but a second tab is not turned away:
 * the newest tab takes the lock over and the older one is told it lost it (`onLost`), so it can pause and offer to
 * take it back. Whichever tab you are looking at works.
 */
async function takeTabLock(onLost: () => void): Promise<void> {
  if (!('locks' in navigator)) return;
  await new Promise<void>((resolve) => {
    const held = navigator.locks.request(LOCK_NAME, { steal: true }, () => {
      resolve();
      return new Promise<never>(() => {}); // held until the page closes or another tab steals it
    });
    held.catch(onLost); // a steal rejects the old holder's request
  });
}

function connect(worker: Worker): {
  call(request: DistributiveOmit<WorkerRequest, 'id'>, transfer?: Transferable[]): Promise<unknown>;
} {
  let next = 0;
  const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const waiting = pending.get(response.id);
    if (!waiting) return;
    pending.delete(response.id);
    if (response.ok) waiting.resolve(response.result);
    else waiting.reject(new Error(response.error));
  };
  worker.onerror = (event) => {
    for (const waiting of pending.values()) waiting.reject(new Error(event.message || 'The database worker crashed.'));
    pending.clear();
  };
  return {
    call: (request, transfer = []) =>
      new Promise((resolve, reject) => {
        const id = next++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ ...request, id }, transfer);
      }),
  };
}

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/** Starts the database worker, applies migrations and returns the repositories. A second tab takes the database over; the first is told through `onLost`. */
export async function openBrowserStorage(onLost: () => void = () => {}): Promise<BrowserStorage> {
  if (!navigator.storage?.getDirectory) throw new StorageUnavailableError();
  const held: { worker?: Worker } = {};
  await takeTabLock(() => {
    held.worker?.terminate(); // release the files so the tab that took over can open them
    onLost();
  });

  const opened = new Worker(new URL('./worker/sqlite-worker.ts', import.meta.url), { type: 'module' });
  held.worker = opened;
  const { call } = connect(opened);
  const exec: SqlExecutor = {
    execute: async (sql, params, method) => (await call({ op: 'execute', sql, params, method })) as { rows: unknown[] },
    transaction: async (statements) => {
      await call({ op: 'transaction', statements });
    },
  };
  // The tab that just lost the lock may take a moment to let go of the files, so opening is retried briefly.
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate(exec);
      break;
    } catch (error) {
      if (attempt >= 8) {
        opened.terminate();
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const internals = createStorage(exec);
  return {
    ...internals,
    exportJson: () => exportJson(internals),
    importJson: (input) => importJson(internals, input),
    exportSqlite: async () => (await call({ op: 'exportDb' })) as Uint8Array<ArrayBuffer>,
    importSqlite: async (bytes) => {
      const copy = bytes.slice().buffer;
      await call({ op: 'importDb', bytes: copy }, [copy]);
      await migrate(exec); // a file from an older version is brought up to date
    },
    wipe: async () => {
      await call({ op: 'wipe' });
      await migrate(exec);
    },
    close: () => opened.terminate(),
  };
}
