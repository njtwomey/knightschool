import type { BrowserStorage } from '@knightschool/storage';
import { create } from 'zustand';
import { errorText } from '@/lib/errors';

type StorageState = {
  /** `paused`: another tab took the database over. Use `open()` to take it back. */
  status: 'idle' | 'opening' | 'ready' | 'paused' | 'unavailable' | 'error';
  error: string | null;
  storage: BrowserStorage | null;
  open: () => Promise<void>;
};

/** The learner's database. Opened at startup; courses work without it, training and settings need it. */
export const useStorage = create<StorageState>((set, get) => ({
  status: 'idle',
  error: null,
  storage: null,
  async open() {
    if (get().status === 'opening' || get().status === 'ready') return;
    set({ status: 'opening', error: null });
    // The database code (Drizzle, the SQLite worker's client) is a chunk of its own, loaded here rather than with the app.
    let unavailable: (error: unknown) => boolean = () => false;
    try {
      const { openBrowserStorage, StorageUnavailableError } = await import('@knightschool/storage');
      unavailable = (error) => error instanceof StorageUnavailableError;
      const storage = await openBrowserStorage(() =>
        set({
          status: 'paused',
          storage: null,
          error: 'Knight School is open in another tab. Your progress is paused in this one.',
        }),
      );
      set({ storage, status: 'ready' });
    } catch (error) {
      const message = errorText(error);
      set({
        status: unavailable(error) ? 'unavailable' : 'error',
        error: message,
        storage: null,
      });
    }
  },
}));

/**
 * Resolves with the database once it is open, waiting if it is still opening (a page opened directly or refreshed
 * starts before it is ready). Rejects with a plain message if it cannot be opened in this tab.
 */
export function whenStorageReady(): Promise<BrowserStorage> {
  return new Promise((resolve, reject) => {
    const settle = (state: StorageState): boolean => {
      if (state.status === 'ready' && state.storage) resolve(state.storage);
      else if (state.status === 'paused' || state.status === 'unavailable' || state.status === 'error') {
        reject(new Error(state.error ?? 'Your data is not available, so progress cannot be saved.'));
      } else return false;
      return true;
    };
    if (settle(useStorage.getState())) return;
    const unsubscribe = useStorage.subscribe((state) => {
      if (settle(state)) unsubscribe();
    });
  });
}
