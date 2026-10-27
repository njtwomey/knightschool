import { describe, expect, it } from 'vitest';
import { CourseManifest } from './course';

const base = {
  name: 'Ruy Lopez',
  side: 'white',
  opening: 'ruy-lopez',
  tier: 3,
  trigger: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
  summary: 'x',
  about: { idea: 'x', risks: 'x', suits: 'x' },
  lines: ['some-line'],
};

describe('CourseManifest sources', () => {
  it('leaves them out when a course has none', () => {
    expect(CourseManifest.parse(base).sources).toBeUndefined();
  });

  it('reads a title, a link and the optional author and note', () => {
    const sources = [
      { title: 'A video', url: 'https://www.youtube.com/watch?v=abc', author: 'A channel', note: 'The traps' },
      { title: 'A book', url: 'https://example.com/book' },
    ];
    expect(CourseManifest.parse({ ...base, sources }).sources).toEqual(sources);
  });

  it.each([
    ['no title', { url: 'https://example.com' }],
    ['no link', { title: 'A video' }],
    ['a link that is not one', { title: 'A video', url: 'youtube' }],
    ['an unknown field', { title: 'A video', url: 'https://example.com', by: 'someone' }],
  ])('rejects a source with %s', (_, source) => {
    expect(CourseManifest.safeParse({ ...base, sources: [source] }).success).toBe(false);
  });
});
