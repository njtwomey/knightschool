import { describe, expect, it } from 'vitest';
import { EMPTY_SEARCH, readSearchHash, writeSearchHash } from './search-hash';

describe('search hash', () => {
  it('is empty for a clear view', () => {
    expect(writeSearchHash(EMPTY_SEARCH)).toBe('');
    expect(readSearchHash('')).toEqual(EMPTY_SEARCH);
  });

  it('round-trips the words, the filters and the board search', () => {
    const view = {
      q: 'fried liver',
      role: 'play' as const,
      side: 'white' as const,
      scope: 'lines' as const,
      kind: 'trap' as const,
      bm: ['e2e4', 'e7e5'],
      bk: 'traps' as const,
    };
    const hash = writeSearchHash(view);
    expect(hash).toContain('q=fried%20liver');
    expect(hash).toContain('bm=e2e4.e7e5');
    expect(readSearchHash(hash)).toEqual(view);
  });

  it("reads v1's keys", () => {
    const view = readSearchHash('#q=caro&tier=2&scope=courses&bk=refutations&role=against');
    expect(view).toEqual({ ...EMPTY_SEARCH, q: 'caro', scope: 'openings', bk: 'traps', role: 'against' });
  });

  it('drops a bad value field by field', () => {
    expect(readSearchHash('#side=green&scope=nope&kind=odd&bk=x&q=ok')).toEqual({ ...EMPTY_SEARCH, q: 'ok' });
  });

  it('cuts the moves at the first that cannot be played', () => {
    expect(readSearchHash('#bm=e2e4.e7e5.e4e5.g1f3').bm).toEqual(['e2e4', 'e7e5']);
    expect(readSearchHash('#bm=rubbish').bm).toEqual([]);
  });
});
