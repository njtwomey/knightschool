import {
  createEngine,
  evaluateCached,
  fromRows,
  measureLineCached,
  toRows,
  type CachedEvaluation,
  type Engine,
  type EvalStore,
} from '@knightschool/engine';
import { create } from 'zustand';
import { bakedEvaluation, bakedFirstStore, loadAnalysis } from '@/data/analysis';
import { useStorage } from '@/data/storage';
import { createWorkerTransport } from './worker-transport';
import { errorText } from '@/lib/errors';

/** Deep enough to be far stronger than any beginner, shallow enough to answer in about a second. */
const ANALYSIS = { depth: 14, multipv: 3 } as const;

type EngineState = {
  status: 'off' | 'starting' | 'ready' | 'error';
  error: string | null;
  /** The engine's view of the position on the board. */
  current: CachedEvaluation | null;
  thinking: boolean;
  measure: { running: boolean; done: number; total: number; epds: string[] } | null;
  /** Every evaluation seen this visit, by position, for the measured-line list. */
  seen: Record<string, CachedEvaluation>;

  turnOn: () => Promise<void>;
  turnOff: () => void;
  analyse: (epd: string) => Promise<void>;
  measureLine: (epds: string[]) => Promise<void>;
  cancelMeasure: () => void;
};

let engine: Engine | undefined;
let analysing = 0; // token: only the newest analyse() may write its result
let measuring: AbortController | undefined;

/** The cache is the database when it is available, and nothing otherwise (the engine still works). */
function evalStore(): EvalStore {
  const storage = useStorage.getState().storage?.storage;
  if (!storage) return { get: async () => undefined, put: async () => {} };
  return {
    get: async (epd, depth, engineId) => fromRows(await storage.evals.get(epd, depth, engineId)),
    put: (evaluation) => storage.evals.put(toRows(evaluation, new Date().toISOString())),
  };
}

export const useEngine = create<EngineState>((set, get) => ({
  status: 'off',
  error: null,
  current: null,
  thinking: false,
  measure: null,
  seen: {},

  async turnOn() {
    if (get().status === 'starting' || get().status === 'ready') return;
    set({ status: 'starting', error: null });
    try {
      engine ??= createEngine(createWorkerTransport());
      await engine.ready();
      set({ status: 'ready' });
    } catch (error) {
      engine?.dispose();
      engine = undefined;
      set({ status: 'error', error: errorText(error) });
    }
  },

  turnOff() {
    measuring?.abort();
    engine?.dispose();
    engine = undefined;
    analysing++;
    set({ status: 'off', current: null, thinking: false, measure: null });
  },

  async analyse(epd) {
    if (get().status === 'off') return;
    const token = ++analysing;
    // A position searched deeper offline answers at once, without the browser engine (which may still be starting).
    const baked = bakedEvaluation(await loadAnalysis(), epd, ANALYSIS.depth);
    if (token !== analysing) return;
    if (baked) {
      const result = { ...baked, cached: true };
      set((state) => ({ current: result, thinking: false, seen: { ...state.seen, [epd]: result } }));
      return;
    }
    if (get().status !== 'ready' || !engine) return;
    set({ thinking: true });
    try {
      const result = await evaluateCached(engine, evalStore(), epd, ANALYSIS);
      if (token !== analysing || result.partial) return;
      set((state) => ({ current: result, thinking: false, seen: { ...state.seen, [epd]: result } }));
    } catch (error) {
      if (token === analysing) set({ thinking: false, error: errorText(error) });
    }
  },

  async measureLine(epds) {
    if (get().status !== 'ready' || !engine || get().measure?.running) return;
    measuring = new AbortController();
    const store = bakedFirstStore(await loadAnalysis(), evalStore());
    set({ measure: { running: true, done: 0, total: epds.length, epds } });
    try {
      for await (const result of measureLineCached(engine, store, epds, ANALYSIS, measuring.signal)) {
        set((state) => ({
          seen: { ...state.seen, [result.epd]: result },
          measure: state.measure && { ...state.measure, done: state.measure.done + 1 },
        }));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        set({ error: errorText(error) });
      }
    } finally {
      set((state) => ({ measure: state.measure && { ...state.measure, running: false } }));
    }
  },

  cancelMeasure: () => measuring?.abort(),
}));

/**
 * One search in the browser engine (starting it if it is off), read from the database cache first and never from the
 * baked analysis, so two positions searched this way are compared at the same depth. Undefined if the engine cannot
 * start or the search was cut short.
 */
export async function evaluateLive(
  epd: string,
  depth: number,
  signal?: AbortSignal,
): Promise<CachedEvaluation | undefined> {
  await useEngine.getState().turnOn();
  if (!engine || signal?.aborted) return undefined;
  const result = await evaluateCached(engine, evalStore(), epd, { depth, multipv: 1 }, signal);
  return result.partial ? undefined : result;
}
