import { playUci, START_EPD, type CatalogFilter, type ResultKind, type SearchScope } from '@knightschool/core';
import type { BoardQuery, Played } from '@/features/courses/board-query';
import { decodeMoves, encodeMoves, type HashParams } from '@/router/hash';

const ROLES: CatalogFilter['role'][] = ['all', 'play', 'against'];
const SCOPES: SearchScope[] = ['openings', 'lines', 'motifs', 'all'];
const SIDES: CatalogFilter['side'][] = ['all', 'white', 'black'];
const KINDS: ResultKind[] = ['both', 'lines', 'refutations'];

/** The Openings page's search and filters, from the URL hash. Anything missing or unrecognised is the default. */
export function filterFromHash(params: HashParams): CatalogFilter {
  return {
    query: params.q ?? '',
    role: ROLES.find((role) => role === params.role) ?? 'all',
    side: SIDES.find((side) => side === params.side) ?? 'all',
    scope: SCOPES.find((scope) => scope === params.scope) ?? 'all',
  };
}

/** The moves played on the board search, rebuilt (with SAN and position) from the UCI list in the hash. */
export function boardQueryFromHash(params: HashParams): BoardQuery {
  const played: Played[] = [];
  let epd = START_EPD;
  for (const uci of decodeMoves(params.bm)) {
    try {
      const move = playUci(epd, uci);
      played.push({ uci, san: move.san, epd: move.epd });
      epd = move.epd;
    } catch {
      break; // an illegal move ends the list: the rest cannot follow it
    }
  }
  return { played, kind: KINDS.find((kind) => kind === params.bk) ?? 'both' };
}

/** Everything that is not the default, as hash params. */
export function hashFromState(filter: CatalogFilter, query: BoardQuery): Record<string, string | undefined> {
  return {
    q: filter.query.trim() ? filter.query : undefined,
    role: filter.role === 'all' ? undefined : filter.role,
    side: filter.side === 'all' ? undefined : filter.side,
    scope: filter.scope === 'all' ? undefined : filter.scope,
    bm: query.played.length ? encodeMoves(query.played.map((move) => move.uci)) : undefined,
    bk: query.kind === 'both' ? undefined : query.kind,
  };
}
