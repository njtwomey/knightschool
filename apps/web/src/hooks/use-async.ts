import { useEffect, useState, type DependencyList } from 'react';
import { errorText } from '@/lib/errors';

export type AsyncState<T> = {
  /** What the latest load that finished gave: after `deps` change it stays until the new load is in. */
  data: T | undefined;
  /** Why the latest load that finished failed, in words. */
  error: string | null;
  /** A load for the current `deps` is still running; `data` (if any) is from earlier ones. */
  loading: boolean;
};

/**
 * Loads something for a component, again whenever `deps` change (like an effect's dependencies, which they are), and
 * never lets an answer for earlier `deps` land after a later one. `load` is null when there is nothing to load yet
 * (the database not open, say): nothing runs and what was there stays.
 */
export function useAsync<T>(load: (() => Promise<T>) | null, deps: DependencyList): AsyncState<T> {
  // A new object whenever `deps` change, so an answer can say which `deps` it belongs to. Set during render, React's
  // pattern for state that follows a prop, so the first render with new `deps` already counts as loading.
  const [run, setRun] = useState({ deps, token: {} });
  if (!sameDeps(run.deps, deps)) setRun({ deps, token: {} });
  const token = sameDeps(run.deps, deps) ? run.token : null;
  const [settled, setSettled] = useState<{ token: object; data?: T; error: string | null } | null>(null);
  useEffect(() => {
    if (!load || !token) return;
    let live = true;
    load().then(
      (data) => live && setSettled({ token, data, error: null }),
      (error: unknown) => live && setSettled((last) => ({ token, data: last?.data, error: errorText(error) })),
    );
    return () => {
      live = false;
    };
    // `load` is a new function each render; `deps` (through `token`) say when it means something new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  return {
    data: settled?.data,
    error: settled?.error ?? null,
    loading: load !== null && settled?.token !== token,
  };
}

const sameDeps = (a: DependencyList, b: DependencyList) =>
  a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
