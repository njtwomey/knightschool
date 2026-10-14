import { openMemoryStorage } from '@knightschool/storage/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { START_EPD } from '@knightschool/core';
import { createExplorer, ExplorerPausedError, PAUSE_AFTER_429_MS } from './service';

const REPLY = {
  white: 60,
  draws: 10,
  black: 30,
  moves: [{ uci: 'e2e4', san: 'e4', white: 40, draws: 5, black: 15 }],
  opening: { eco: 'B00', name: 'King’s Pawn' },
  extra: 'ignored',
};

const ok = (body: unknown = REPLY) => new Response(JSON.stringify(body), { status: 200 });

describe('explorer service', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('makes no calls without a token', async () => {
    const { storage } = await openMemoryStorage();
    const fetch = vi.fn();
    const explorer = createExplorer({ storage, token: null, fetch });
    expect(explorer.enabled).toBe(false);
    expect(await explorer.lookup(START_EPD)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('asks Lichess with the token, then answers from the cache for a month', async () => {
    const { storage } = await openMemoryStorage();
    const fetch = vi.fn(async () => ok());
    const explorer = createExplorer({ storage, token: 'secret', fetch });
    const first = await explorer.lookup(START_EPD);
    expect(first).toMatchObject({ white: 60, openingName: 'King’s Pawn', moves: [{ san: 'e4' }] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('explorer.lichess.org/lichess?');
    expect(url).toContain('ratings=1000%2C1200%2C1400%2C1600');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');

    await explorer.lookup(START_EPD);
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    await explorer.lookup(START_EPD);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps one request in flight at a time', async () => {
    const { storage } = await openMemoryStorage();
    let inFlight = 0;
    let most = 0;
    const fetch = vi.fn(async () => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return ok();
    });
    const explorer = createExplorer({ storage, token: 't', fetch });
    await Promise.all([explorer.lookup('a b c -'), explorer.lookup('d e f -'), explorer.lookup('g h i -')]);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(most).toBe(1);
  });

  it('pauses for a minute after a 429 and then carries on', async () => {
    const { storage } = await openMemoryStorage();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValue(ok());
    const explorer = createExplorer({ storage, token: 't', fetch });
    await expect(explorer.lookup(START_EPD)).rejects.toBeInstanceOf(ExplorerPausedError);
    await expect(explorer.lookup(START_EPD)).rejects.toBeInstanceOf(ExplorerPausedError);
    expect(fetch).toHaveBeenCalledTimes(1); // the second lookup did not even try
    vi.setSystemTime(Date.now() + PAUSE_AFTER_429_MS + 1);
    expect(await explorer.lookup(START_EPD)).toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('says plainly when the token is refused or the reply is odd', async () => {
    const { storage } = await openMemoryStorage();
    const refused = createExplorer({
      storage,
      token: 'bad',
      fetch: vi.fn(async () => new Response('', { status: 401 })),
    });
    await expect(refused.lookup(START_EPD)).rejects.toThrow(/did not accept that token/);
    const odd = createExplorer({ storage, token: 't', fetch: vi.fn(async () => ok({ nope: true })) });
    await expect(odd.lookup('x y z -')).rejects.toThrow();
  });
});
