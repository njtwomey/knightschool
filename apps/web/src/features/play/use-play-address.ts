import { useEffect } from 'react';
import { encodeMoves } from '@/router/hash';
import type { UnitRef } from '@/router/hrefs';
import { setHashState } from '@/router/location';
import { startFromAddress } from './resume';
import { usePlay, type PlayMode } from './store';

/**
 * Keeps the play store and the address in step: starts the line (or unit) the address names, starts again if the store
 * was reset under the page, and writes the moves played (and the part of a side unit) to the hash as play goes on.
 */
export function usePlayAddress(course: string, line: string, mode: PlayMode, unit: UnitRef | undefined) {
  const phase = usePlay((state) => state.phase);
  const index = usePlay((state) => state.index);
  const steps = usePlay((state) => state.steps);
  const scope = usePlay((state) => state.scope);
  // The address names the unit; the effects below must not restart for a new object with the same contents.
  const unitKey = unit ? `${unit.n}/${unit.first ?? ''}-${unit.last ?? ''}` : '';

  useEffect(() => {
    // The moves played so far are in the URL hash, so a refresh carries on from the same move (and the same part).
    void startFromAddress(course, line, mode, unit);
    return () => usePlay.getState().stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, line, mode, unitKey]);

  // If the store was reset while this page stayed open (a hot reload while developing does that), start again instead of
  // sitting on a loading skeleton until the page is refreshed.
  useEffect(() => {
    if (usePlay.getState().phase === 'idle') void startFromAddress(course, line, mode, unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, course, line, mode, unitKey]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'complete') return;
    setHashState({
      m: index > 0 ? encodeMoves(steps.slice(0, index).map((step) => step.edge.uci)) : undefined,
      p: scope && scope.part > 0 ? String(scope.part) : undefined,
    });
  }, [phase, index, steps, scope]);
}
