import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchContent, MissingContent } from './fetch-content';

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
