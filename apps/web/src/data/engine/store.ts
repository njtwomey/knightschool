import { createEngine, memoryCache, type Engine } from '@knightschool/engine';
import { createWorkerTransport } from './worker-transport';

/*
 * The browser's one Stockfish: started the first time something asks, shared by every board, with a cache for this
 * visit so a position already searched answers at once (docs/v2/stores/engine.md). The database cache comes with
 * storage.
 */

export type EngineStatus = 'off' | 'starting' | 'ready' | 'error';

let engine: Engine | undefined;
let starting: Promise<Engine> | undefined;
let state: { status: EngineStatus; error: string | null } = { status: 'off', error: null };
const listeners = new Set<() => void>();

export const evalCache = memoryCache();

function setStatus(next: EngineStatus, message: string | null = null) {
  state = { status: next, error: message };
  for (const listener of listeners) listener();
}

/** The engine's state, the same object until it changes (for useSyncExternalStore). */
export const engineStatus = (): { status: EngineStatus; error: string | null } => state;

export function subscribeEngine(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The engine, started (and downloaded) the first time. A failed start can be tried again. */
export function startEngine(): Promise<Engine> {
  if (engine && state.status === 'ready') return Promise.resolve(engine);
  starting ??= (async () => {
    setStatus('starting');
    const created = createEngine(createWorkerTransport());
    try {
      await created.ready();
      engine = created;
      setStatus('ready');
      return created;
    } catch (cause) {
      created.dispose();
      setStatus('error', cause instanceof Error ? cause.message : String(cause));
      throw cause;
    } finally {
      starting = undefined;
    }
  })();
  return starting;
}

/** Shuts the engine down (its worker too); the next request starts it again. */
export function stopEngine(): void {
  engine?.dispose();
  engine = undefined;
  setStatus('off');
}
