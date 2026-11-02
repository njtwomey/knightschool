import type { ImportReport, LearnerExport, SqlExecutor } from '@knightschool/storage';
import { useSyncExternalStore } from 'react';
import { memoryStore, type LearnerStore } from '../learner-store';

/**
 * The learner's database in this browser: SQLite in a worker, kept in the origin-private file system (OPFS).
 * `openLearnerStore()` opens it once per page; the database code is a chunk of its own, loaded on the first call.
 * Where the browser cannot keep data, progress lives in memory for the tab's life and the status says so.
 */
export type StorageStatus =
  | { state: 'opening' }
  /** Kept on this device. */
  | { state: 'saved' }
  /** Not kept: the browser cannot keep data, or the database could not be opened. */
  | { state: 'memory'; message: string }
  /** Another tab took the database over; this one saves nothing more. */
  | { state: 'lost'; message: string };

const APP_VERSION = String(import.meta.env.VITE_APP_VERSION ?? 'dev');

let status: StorageStatus = { state: 'opening' };
const listeners = new Set<() => void>();
const setStatus = (next: StorageStatus) => {
  status = next;
  for (const listener of listeners) listener();
};

export const getStorageStatus = (): StorageStatus => status;

export function subscribeStorageStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The database's status, for a notice: in memory only, or taken by another tab. */
export const useStorageStatus = (): StorageStatus =>
  useSyncExternalStore(subscribeStorageStatus, getStorageStatus, getStorageStatus);

declare global {
  interface Window {
    /** Development only: the open store, for checks from the console or a test browser. */
    __knightschoolStore?: LearnerStore;
  }
}

type Opened = { store: LearnerStore; exec?: SqlExecutor };

let opening: Promise<Opened> | undefined;

export function openLearnerStore(): Promise<LearnerStore> {
  opening ??= openOnce();
  return opening.then((opened) => opened.store);
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

function inMemory(message: string): Opened {
  console.warn(message);
  setStatus({ state: 'memory', message });
  return { store: memoryStore() };
}

/** A label for a snapshot: a fixed-width time first, so name order is age order. */
const snapshotLabel = (version: number) => `${String(Date.now()).padStart(15, '0')}-v${version}`;

async function openOnce(): Promise<Opened> {
  if (!navigator.storage?.getDirectory || typeof Worker === 'undefined') {
    return inMemory(
      'This browser cannot keep data on this device, so your progress lasts only until this tab closes. ' +
        'A current Chrome, Safari or Firefox keeps it.',
    );
  }
  try {
    const [{ openBrowserDatabase, TabLostError }, storage] = await Promise.all([
      import('./client'),
      import('@knightschool/storage'),
    ]);
    const db = await openBrowserDatabase(() => setStatus({ state: 'lost', message: new TabLostError().message }));
    try {
      const version = await storage.schemaVersion(db.exec);
      if (version > storage.LATEST_SCHEMA_VERSION) throw new storage.NewerSchemaError(version);
      // Before an update changes the tables, the file is copied, so a failed update can be put back.
      const snapshot =
        version > 0 && version < storage.LATEST_SCHEMA_VERSION ? await db.snapshot(snapshotLabel(version)) : undefined;
      try {
        await storage.migrate(db.exec);
      } catch (error) {
        if (!snapshot) throw error;
        await db.restore(snapshot);
        throw new Error(`updating your saved data failed (${messageOf(error)}), so it was put back as it was`, {
          cause: error,
        });
      }
      const store = storage.createLearnerStore(db.exec);
      setStatus({ state: 'saved' });
      if (import.meta.env.DEV) window.__knightschoolStore = store;
      return { store, exec: db.exec };
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    return inMemory(
      `Your progress cannot be saved on this device: ${messageOf(error)}. It lasts only until this tab closes.`,
    );
  }
}

async function savedDatabase(): Promise<SqlExecutor> {
  opening ??= openOnce();
  const { exec } = await opening;
  if (!exec) throw new Error('Nothing is saved on this device, so there is nothing to export or import into.');
  return exec;
}

/** Every learner table in one JSON object, stamped with the schema, app and export format versions. */
export async function exportLearnerData(): Promise<LearnerExport> {
  const [{ exportJson }, exec] = await Promise.all([import('@knightschool/storage'), savedDatabase()]);
  return exportJson(exec, { appVersion: APP_VERSION });
}

/** Merges an export into this device's data by `at`; refuses a newer file and writes nothing if a row is bad. */
export async function importLearnerData(input: unknown): Promise<ImportReport> {
  const [{ importJson }, exec] = await Promise.all([import('@knightschool/storage'), savedDatabase()]);
  const report = await importJson(exec, input);
  // Imported settings rows apply at once, without a reload.
  await import('../settings').then((settings) => settings.reloadLearnerSettings());
  return report;
}
