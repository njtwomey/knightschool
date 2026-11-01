import { useEffect, useState } from 'react';

/** Loads something when its keys change: { data, error, loading }. A newer load replaces an older one still running. */
export function useLoad<T>(load: () => Promise<T>, keys: readonly unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; key: string }>({ key: '' });
  const key = JSON.stringify(keys);
  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setState({ data, key }),
      (error: unknown) => current && setState({ error: error instanceof Error ? error.message : String(error), key }),
    );
    return () => {
      current = false;
    };
  }, [key]);
  const fresh = state.key === key;
  return { data: fresh ? state.data : undefined, error: fresh ? state.error : undefined, loading: !fresh };
}
