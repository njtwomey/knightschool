import { memoryStore, type LearnerStore } from './learner-store';

let store: Promise<LearnerStore> | null = null;

/**
 * The learner's store, opened once: SQLite in the browser (packages/storage, OPFS), falling back to memory with a
 * notice when the browser cannot store files.
 */
export function learnerStore(): Promise<LearnerStore> {
  store ??= import('./storage').then((module) => module.openLearnerStore()).catch(() => memoryStore());
  return store;
}

/** Writes still landing (answers, attempts): a read that must include them waits for them first. */
const writes = new Set<Promise<unknown>>();

/** Tracks a write, so `whenWritesSettled` waits for it. */
export function trackWrite<T>(write: Promise<T>): Promise<T> {
  writes.add(write);
  void write.catch(() => undefined).finally(() => writes.delete(write));
  return write;
}

/** Resolves once every tracked write has landed (or failed), including writes started while waiting. */
export async function whenWritesSettled(): Promise<void> {
  while (writes.size) await Promise.allSettled([...writes]);
}

/** Swaps in another store (the SQLite one, when it opens). */
export function setLearnerStore(next: Promise<LearnerStore>): void {
  store = next;
}
