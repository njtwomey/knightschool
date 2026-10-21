import type { GlossaryEntry } from '@knightschool/core';
import { useEffect, useState } from 'react';
import { loadGlossary } from '@/data/content';
import { onceRetryable } from '@/data/fetch-content';

/** The glossary is fetched once per page load and shared by everything that shows an idea's definition. */
export const glossary: () => Promise<GlossaryEntry[]> = onceRetryable(loadGlossary);

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
