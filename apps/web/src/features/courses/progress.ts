import { create } from 'zustand';
import { useStorage } from '@/data/storage';

type ProgressState = {
  /** Cards answered at least once, by opening id. */
  learned: Record<string, number>;
  refresh: () => Promise<void>;
};

/** How far through each course the learner is. Empty until the database is open. */
export const useProgress = create<ProgressState>((set) => ({
  learned: {},
  async refresh() {
    const storage = useStorage.getState().storage?.storage;
    if (storage) set({ learned: await storage.cards.learnedByOpening() });
  },
}));

export const percent = (learned: number, total: number) =>
  total === 0 ? 0 : Math.min(100, Math.round((learned / total) * 100));
