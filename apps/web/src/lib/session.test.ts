import { describe, expect, it } from 'vitest';
import { sessionLoader } from './session';

type State = { phase: 'idle' | 'loading' | 'ready' | 'error'; error: string | null; data: number };

function store() {
  let state: State = { phase: 'idle', error: null, data: 0 };
  return {
    get: () => state,
    set: (patch: Partial<State>) => void (state = { ...state, ...patch }),
  };
}

/** A promise and the function that settles it. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe('sessionLoader', () => {
  it('loads with the reset applied, and shows a failure as an error', async () => {
    const { get, set } = store();
    const load = sessionLoader(get, set, 'first');
    await load({ data: 1 }, async () => {
      expect(get()).toMatchObject({ phase: 'loading', data: 1 });
      set({ phase: 'ready' });
    });
    expect(get().phase).toBe('ready');
    await load({}, async () => {
      throw new Error('No courses');
    });
    expect(get()).toMatchObject({ phase: 'error', error: 'No courses' });
  });

  it('first: a start while loading is ignored', async () => {
    const { get, set } = store();
    const load = sessionLoader(get, set, 'first');
    const gate = deferred();
    const first = load({}, async () => {
      await gate.promise;
      set({ phase: 'ready', data: 1 });
    });
    let ran = false;
    await load({}, async () => void (ran = true));
    gate.resolve();
    await first;
    expect(ran).toBe(false);
    expect(get()).toMatchObject({ phase: 'ready', data: 1 });
  });

  it('latest: an older start gives way, and its failure is not shown', async () => {
    const { get, set } = store();
    const load = sessionLoader(get, set, 'latest');
    const gate = deferred();
    const older = load({}, async (current) => {
      await gate.promise;
      if (!current()) throw new Error('stale');
      set({ data: 1 });
    });
    await load({}, async () => set({ phase: 'ready', data: 2 }));
    gate.resolve();
    await older;
    expect(get()).toMatchObject({ phase: 'ready', data: 2, error: null });
  });
});
