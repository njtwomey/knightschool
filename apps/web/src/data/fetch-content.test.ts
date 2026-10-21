import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchContent, MissingContent, onceRetryable } from './fetch-content';

const answer = (status: number, type: string, body: string) =>
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status, headers: { 'content-type': type } })));

describe('fetchContent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a content file as JSON', async () => {
    answer(200, 'application/json', '{"a":1}');
    expect(await fetchContent('index.json')).toEqual({ a: 1 });
  });

  it.each([
    ['the dev server, which answers with the app page', 200],
    ['GitHub Pages, which answers with 404.html', 404],
  ])('says the file is missing, not "Unexpected token", on %s', async (_host, status) => {
    answer(status, 'text/html', '<!doctype html><html></html>');
    await expect(fetchContent('gone-course.json')).rejects.toBeInstanceOf(MissingContent);
  });
});

describe('onceRetryable', () => {
  it('loads once and shares the answer', async () => {
    const load = vi.fn(() => Promise.resolve(42));
    const once = onceRetryable(load);
    expect(await Promise.all([once(), once()])).toEqual([42, 42]);
    expect(await once()).toBe(42);
    expect(load).toHaveBeenCalledOnce();
  });

  it('tries again after a failure', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('back');
    const once = onceRetryable(load);
    await expect(once()).rejects.toThrow('offline');
    expect(await once()).toBe('back');
    expect(load).toHaveBeenCalledTimes(2);
  });
});
