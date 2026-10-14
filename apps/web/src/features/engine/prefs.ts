import { create } from 'zustand';

const KEY = 'knightschool.engine';

export type EnginePrefs = {
  /** Start the engine on course pages, so the evaluation bar is there without asking. */
  auto: boolean;
};

/** Reads the saved choice. Anything other than an explicit "off" means on: the engine is on by default. */
export function parseEnginePrefs(raw: string | null): EnginePrefs {
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object' && (parsed as { auto?: unknown }).auto === false) return { auto: false };
  } catch {
    // fall through to the default
  }
  return { auto: true };
}

const read = (): EnginePrefs => {
  try {
    return parseEnginePrefs(localStorage.getItem(KEY));
  } catch {
    return { auto: true };
  }
};

/** Per-device, so it lives in localStorage and applies before the database is open. */
export const useEnginePrefs = create<EnginePrefs & { setAuto: (auto: boolean) => void }>((set) => ({
  ...read(),
  setAuto(auto) {
    set({ auto });
    try {
      localStorage.setItem(KEY, JSON.stringify({ auto }));
    } catch {
      // not saved; the choice still applies for this visit
    }
  },
}));
