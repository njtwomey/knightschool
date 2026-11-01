import { createContext, useContext } from 'react';

/** The words a control shows on hover while another tab has the database. */
export const PAUSED_REASON = 'Paused while Knight School is open in another tab';

/**
 * Why saving is paused on this page, or null. The page shell provides it; anything that saves reads it, disables
 * itself and shows the reason on hover (docs/v2/patterns/states.md, "Another tab").
 */
export const PausedContext = createContext<string | null>(null);

export const usePausedReason = (): string | null => useContext(PausedContext);
