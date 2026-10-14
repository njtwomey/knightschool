import { START_EPD, type ResultKind } from '@knightschool/core';

export type Played = { uci: string; san: string; epd: string };

/** What the board search is asking for: the moves played, and whether to look for lines, traps or both. */
export type BoardQuery = { played: Played[]; kind: ResultKind };

export const START_QUERY: BoardQuery = { played: [], kind: 'both' };

export const queryEpd = (query: BoardQuery) => query.played.at(-1)?.epd ?? START_EPD;

/** "1. e4 e5 2. Nf3" */
export const movesText = (played: Played[]) =>
  played.map((move, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${move.san}`).join(' ');

export const isActive = (query: BoardQuery) => query.played.length > 0 || query.kind !== 'both';
