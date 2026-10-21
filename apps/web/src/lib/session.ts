import { errorText } from './errors';

/**
 * The phases every session store (Learn and Drill, Quiz, Name it, Speed) shares, with its own in between: it starts
 * idle, loads, runs through its own phases, and may end in an error with its text.
 */
export type SessionPhase<Own extends string> = 'idle' | 'loading' | Own | 'error';

type SessionFields = { phase: string; error: string | null };

/**
 * What to do when a session is started while another is still loading: `first` ignores the new start (React runs
 * effects twice in development, and two sessions starting together would introduce cards twice); `latest` lets the
 * new one win, and the older one, when it finishes, must check `current()` and give way.
 */
export type SessionOverlap = 'first' | 'latest';

/**
 * Makes a session store's loader. Each call sets `phase: 'loading'` (with `reset`, and no error), runs `load`, and if
 * it throws shows the error in `phase: 'error'`, unless a newer start has taken over.
 */
export function sessionLoader<S extends SessionFields>(
  get: () => S,
  set: (patch: Partial<S>) => void,
  overlap: SessionOverlap,
) {
  let runs = 0;
  return async (reset: Partial<S>, load: (current: () => boolean) => Promise<void>): Promise<void> => {
    if (overlap === 'first' && get().phase === 'loading') return;
    const run = ++runs;
    const current = () => run === runs;
    set({ ...reset, phase: 'loading', error: null } as Partial<S>);
    try {
      await load(current);
    } catch (error) {
      if (current()) set({ phase: 'error', error: errorText(error) } as Partial<S>);
    }
  };
}
