import { numberedLine, START_EPD, type Played, type ResultKind } from '@knightschool/core';

/** What the board search is asking for: the moves played, and whether to look for lines, traps or both. */
export type BoardQuery = { played: Played[]; kind: ResultKind };

export const START_QUERY: BoardQuery = { played: [], kind: 'both' };

export const queryEpd = (query: BoardQuery) => query.played.at(-1)?.epd ?? START_EPD;

/** "1. e4 e5 2. Nf3" */
export const movesText = (played: Played[]) => numberedLine(played.map((move) => move.san));

export const isActive = (query: BoardQuery) => query.played.length > 0 || query.kind !== 'both';
