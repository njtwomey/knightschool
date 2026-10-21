import {
  EXPLORER_BAND,
  EXPLORER_TTL_MS,
  ExplorerResponse,
  epdToFen,
  explorerKey,
  toExplorerCache,
  type ExplorerCache,
} from '@knightschool/core';
import type { Storage } from '@knightschool/storage';
import { readPref, writePref } from '@/lib/local-prefs';

const TOKEN_KEY = 'knightschool.explorerToken';
export const PAUSE_AFTER_429_MS = 60_000;

/** The token lives only in this browser, never in the database, so exports and backups cannot leak it. */
export const getToken = (): string | null => readPref<string | null>(TOKEN_KEY, (raw) => raw || undefined, null);

/** Saves the token (none removes it); if it cannot be saved the explorer simply stays off. */
export const setToken = (token: string | null): void => writePref(TOKEN_KEY, token || null);

export class ExplorerPausedError extends Error {
  constructor(public readonly untilMs: number) {
    super('Lichess asked us to slow down. The explorer is paused for a minute.');
  }
}

type Deps = { storage: Storage; token: string | null; fetch?: typeof fetch; now?: () => Date };

/**
 * What people at 1000 to 1600 play from a position, following the Lichess API tips: one request in flight at a time,
 * every answer cached for 30 days, and no calls for 60 seconds after a 429. With no token there are no calls at all.
 */
export function createExplorer({ storage, token, fetch: fetchImpl = fetch, now = () => new Date() }: Deps) {
  let queue: Promise<unknown> = Promise.resolve();
  let pausedUntil = 0;

  async function ask(epd: string): Promise<ExplorerCache> {
    if (Date.now() < pausedUntil) throw new ExplorerPausedError(pausedUntil);
    const query = new URLSearchParams({
      fen: epdToFen(epd),
      speeds: EXPLORER_BAND.speeds.join(','),
      ratings: EXPLORER_BAND.ratings.join(','),
    });
    const response = await fetchImpl(`https://explorer.lichess.org/lichess?${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 429) {
      pausedUntil = Date.now() + PAUSE_AFTER_429_MS;
      throw new ExplorerPausedError(pausedUntil);
    }
    if (response.status === 401) throw new Error('Lichess did not accept that token. Check it in Settings.');
    if (!response.ok) throw new Error(`The Lichess explorer answered ${response.status}.`);
    const row = toExplorerCache(epd, ExplorerResponse.parse(await response.json()), now());
    await storage.explorer.put(row);
    return row;
  }

  return {
    enabled: token !== null,
    /** Undefined when there is no token. Cached answers cost nothing and skip the queue. */
    async lookup(epd: string): Promise<ExplorerCache | undefined> {
      if (!token) return undefined;
      const cached = await storage.explorer.get(explorerKey(epd), now().toISOString(), EXPLORER_TTL_MS);
      if (cached) return cached;
      const result = queue.then(() => ask(epd));
      queue = result.catch(() => undefined); // the next request waits for this one, whether or not it worked
      return result;
    },
  };
}
