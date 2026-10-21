import type { GlossaryEntry } from '@knightschool/core';
import { loadGlossary } from '@/data/content';
import { onceRetryable } from '@/data/fetch-content';
import { useAsync } from '@/hooks/use-async';

/** The glossary is fetched once per page load and shared by everything that shows an idea's definition. */
export const glossary: () => Promise<GlossaryEntry[]> = onceRetryable(loadGlossary);

/** The glossary entries, or null until they have loaded (or if they could not be). */
export function useGlossary(): GlossaryEntry[] | null {
  return useAsync(glossary, []).data ?? null;
}
