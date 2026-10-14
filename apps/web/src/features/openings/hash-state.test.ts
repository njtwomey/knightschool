import { describe, expect, it } from 'vitest';
import { boardQueryFromHash, filterFromHash, hashFromState } from './hash-state';

describe('openings hash state', () => {
  it('is the default state with an empty hash', () => {
    expect(filterFromHash({})).toEqual({ query: '', role: 'all', side: 'all', scope: 'openings' });
    expect(boardQueryFromHash({})).toEqual({ played: [], kind: 'both' });
    expect(
      hashFromState({ query: '', role: 'all', side: 'all', scope: 'openings' }, { played: [], kind: 'both' }),
    ).toEqual({
      q: undefined,
      role: undefined,
      side: undefined,
      bm: undefined,
      bk: undefined,
    });
  });

  it('round-trips a search, filters and board moves', () => {
    const filter = {
      query: 'two knights',
      role: 'against' as const,
      side: 'white' as const,
      scope: 'lines' as const,
    };
    const query = boardQueryFromHash({ bm: 'e2e4.c7c6.b1c3', bk: 'lines' });
    expect(query.played.map((move) => move.san)).toEqual(['e4', 'c6', 'Nc3']);
    expect(query.kind).toBe('lines');
    const hash = hashFromState(filter, query);
    expect(hash).toMatchObject({ q: 'two knights', role: 'against', side: 'white', bm: 'e2e4.c7c6.b1c3', bk: 'lines' });
    expect(filterFromHash(hash as Record<string, string>)).toEqual(filter);
  });

  it('ignores unknown values, and stops the board moves at the first illegal one', () => {
    expect(filterFromHash({ role: 'sideways', side: 'purple' })).toEqual({
      query: '',
      role: 'all',
      side: 'all',
      scope: 'openings',
    });
    expect(boardQueryFromHash({ bm: 'e2e4.e2e4.e7e5', bk: 'nope' })).toMatchObject({ kind: 'both' });
    expect(boardQueryFromHash({ bm: 'e2e4.e2e4.e7e5' }).played.map((move) => move.san)).toEqual(['e4']);
  });
});
