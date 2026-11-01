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

/** Swaps in another store (the SQLite one, when it opens). */
export function setLearnerStore(next: Promise<LearnerStore>): void {
  store = next;
}
