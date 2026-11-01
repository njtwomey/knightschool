import type { Row, SqlExecutor } from '@knightschool/storage';
import type { WorkerRequest, WorkerResponse } from './protocol';

const LOCK_NAME = 'knightschool-learner-database';

/** The worker's database as an executor, plus the file operations only the browser has. */
export type BrowserDatabase = {
  exec: SqlExecutor;
  /** Copies the database to a snapshot (the newest two are kept) and returns its name. */
  snapshot(label: string): Promise<string>;
  restore(name: string): Promise<void>;
  close(): void;
};

/** Thrown by every call once another tab has taken the database. */
export class TabLostError extends Error {
  constructor() {
    super('Knight School is open in another tab, so nothing more is saved in this one. Reload to use it here.');
    this.name = 'TabLostError';
  }
}

/**
 * One tab owns the database (opfs-sahpool allows one connection). The newest tab takes the lock over (`steal`); the
 * older one's request is rejected, which calls `onLost`, so it can stop and say so. Whichever tab you look at works.
 */
async function takeTabLock(onLost: () => void): Promise<void> {
  if (!('locks' in navigator)) return;
  await new Promise<void>((resolve) => {
    const held = navigator.locks.request(LOCK_NAME, { steal: true }, () => {
      resolve();
      return new Promise<never>(() => {}); // held until the page closes or another tab steals it
    });
    held.catch(onLost);
  });
}

type Pending = { resolve(value: unknown): void; reject(error: Error): void };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

function connect(worker: Worker) {
  let next = 0;
  let failure: Error | undefined;
  const pending = new Map<number, Pending>();
  const failAll = (error: Error) => {
    failure ??= error;
    for (const waiting of pending.values()) waiting.reject(error);
    pending.clear();
  };
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const response = event.data;
    const waiting = pending.get(response.id);
    if (!waiting) return;
    pending.delete(response.id);
    if (response.ok) waiting.resolve(response.result);
    else waiting.reject(new Error(response.error));
  };
  worker.onerror = (event) => {
    event.preventDefault();
    failAll(new Error(event.message || 'The database worker stopped.'));
  };
  return {
    call: (request: DistributiveOmit<WorkerRequest, 'id'>): Promise<unknown> =>
      new Promise((resolve, reject) => {
        if (failure) return reject(failure);
        const id = next++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ ...request, id });
      }),
    /** Ends the worker; every waiting and later call fails with `error`. */
    stop: (error: Error) => {
      worker.terminate();
      failAll(error);
    },
  };
}

/**
 * Takes the tab lock and starts the database worker. Opening is retried briefly, because the tab that just lost the
 * lock may take a moment to let go of the files.
 */
export async function openBrowserDatabase(onLost: () => void): Promise<BrowserDatabase> {
  const held: { stop?: (error: Error) => void } = {};
  await takeTabLock(() => {
    held.stop?.(new TabLostError()); // release the files so the tab that took over can open them
    onLost();
  });
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'knightschool-db' });
  const { call, stop } = connect(worker);
  held.stop = stop;
  const exec: SqlExecutor = {
    execute: async (sql, params) => (await call({ op: 'execute', sql, params })) as Row[],
    transaction: async (statements) => void (await call({ op: 'transaction', statements })),
  };
  for (let attempt = 1; ; attempt++) {
    try {
      await exec.execute('select 1');
      break;
    } catch (error) {
      if (attempt >= 8 || error instanceof TabLostError) {
        stop(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return {
    exec,
    snapshot: async (label) => (await call({ op: 'snapshot', label })) as string,
    restore: async (name) => void (await call({ op: 'restore', name })),
    close: () => stop(new Error('The database was closed.')),
  };
}
