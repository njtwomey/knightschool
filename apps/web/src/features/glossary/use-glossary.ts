import type { GlossaryEntry } from '@knightschool/core';
import { useEffect, useState } from 'react';
import { loadGlossary } from '@/data/content';

let cached: Promise<GlossaryEntry[]> | undefined;

/** The glossary is fetched once per page load and shared by everything that shows an idea's definition. */
export function glossary(): Promise<GlossaryEntry[]> {
  cached ??= loadGlossary().catch((error: unknown) => {
    cached = undefined; // let a later call try again
    throw error;
  });
  return cached;
}

/** The glossary entries, or null until they have loaded (or if they could not be). */
export function useGlossary(): GlossaryEntry[] | null {
  const [entries, setEntries] = useState<GlossaryEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    glossary()
      .then((loaded) => !cancelled && setEntries(loaded))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return entries;
}
