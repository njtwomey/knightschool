import { decodeMoves } from '@/router/hash';
import { readHashState } from '@/router/location';
import { usePlay, type PlayMode } from './store';
import type { UnitRef } from '@/router/hrefs';

/**
 * Starts the play page where its address says: the moves played (`#m=`) and the part of a side unit (`#p=`), so a
 * refresh, or a restart after the store was reset, carries on from the same move of the same part. Every start of the
 * page goes through here, so none of them can lose the part.
 */
export function startFromAddress(course: string, line: string, mode: PlayMode, unit?: UnitRef): Promise<void> {
  const hash = readHashState();
  return usePlay.getState().start(course, line, mode, decodeMoves(hash.m), unit, Number(hash.p) || 0);
}
