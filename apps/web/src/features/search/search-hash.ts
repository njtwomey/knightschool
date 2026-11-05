import { replay, START_EPD } from '@knightschool/core';
import type { FindKind, SearchFilters, SearchScope } from '@/components/finding/search';

/** What the search page keeps in its address: the words, the filters and the board search. */
export type SearchView = SearchFilters & { q: string; bm: string[]; bk: FindKind };

export const EMPTY_SEARCH: SearchView = {
  q: '',
  role: 'all',
  side: 'all',
  scope: 'all',
  kind: 'all',
  bm: [],
  bk: 'all',
};

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.find((candidate) => candidate === value) ?? fallback;

/**
 * `#q=caro&side=black&bm=e2e4.c7c6`, read field by field: anything missing or unknown is the default, and the moves stop
 * at the first that cannot be played (docs/v2/navigation/url-state.md). v1's `scope=courses` and `bk=refutations` still
 * read; v1's `tier` is dropped.
 */
export function readSearchHash(hash: string): SearchView {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const scope = params.get('scope') === 'courses' ? 'openings' : params.get('scope');
  const bk = params.get('bk') === 'refutations' ? 'traps' : params.get('bk');
  const written = (params.get('bm') ?? '').split('.').filter((move) => UCI.test(move));
  return {
    q: params.get('q') ?? '',
    role: oneOf(params.get('role'), ['play', 'against'], 'all'),
    side: oneOf(params.get('side'), ['white', 'black'], 'all'),
    scope: oneOf<SearchScope>(scope, ['openings', 'variations', 'lines', 'ideas'], 'all'),
    kind: oneOf(params.get('kind'), ['main', 'sideline', 'rare', 'gambit', 'trap'], 'all'),
    bm: replay(START_EPD, written).map((move) => move.uci),
    bk: oneOf(bk, ['lines', 'traps'], 'all'),
  };
}

/** Everything that differs from the default, as the hash: an empty view is an empty hash. */
export function writeSearchHash(view: SearchView): string {
  const params = new URLSearchParams();
  if (view.q.trim()) params.set('q', view.q);
  for (const key of ['role', 'side', 'scope', 'kind'] as const) {
    if (view[key] !== 'all') params.set(key, view[key]);
  }
  if (view.bm.length) params.set('bm', view.bm.join('.'));
  if (view.bk !== 'all') params.set('bk', view.bk);
  const text = params.toString().replace(/\+/g, '%20');
  return text ? `#${text}` : '';
}
