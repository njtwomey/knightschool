import { useEffect, useState } from 'react';
import { siteConfig } from '@/data/site-config';
import { rememberStage, stageOf, type Stage } from './stage-memory';

/** The stages every step, follow-up and line goes through, in order (config `teach.stages`). */
export const STAGES: Stage[] = siteConfig.teach.stages.filter((stage) => stageOf(stage) === stage);

/**
 * The Learn flow's address state (docs/v2/navigation/url-state.md): `#stage=learn|try|done`, `m` for the position
 * stepped to in Learn or the moves played in Try, and `test=1` while testing out. An old `read` or `watch` opens Learn.
 */
export type FlowHash = { stage: Stage; m: number; test: boolean };

function readHash(): FlowHash {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const stage = stageOf(params.get('stage'));
  return {
    stage: stage && STAGES.includes(stage) ? stage : (STAGES[0] ?? 'learn'),
    m: Math.max(0, Number(params.get('m')) || 0),
    test: params.get('test') === '1',
  };
}

function writeHash(state: FlowHash) {
  const params = new URLSearchParams({ stage: state.stage });
  if (state.m) params.set('m', String(state.m));
  if (state.test) params.set('test', '1');
  window.history.replaceState(null, '', `#${params.toString()}`);
}

/**
 * The stage a step, follow-up or line is at, kept in the address and, when `remember` is set, on this device, so its
 * row continues there (stage-memory.ts). One hook for every kind (docs/v2/pages/step.md).
 */
export function useLearnFlow({ opening, item, remember }: { opening: string; item: string; remember: boolean }) {
  const [hash, setHashState] = useState<FlowHash>(() => {
    const state = readHash();
    // An old address (`#stage=read`) is rewritten with the stage it now opens.
    if (window.location.hash) writeHash(state);
    return state;
  });
  const setHash = (next: Partial<FlowHash>) =>
    setHashState((current) => {
      const merged = { ...current, ...next };
      writeHash(merged);
      return merged;
    });
  // A link that changes only the hash (`#stage=try`) changes the stage too, and starts it afresh (`version`).
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onHash = () => {
      const state = readHash();
      writeHash(state);
      setHashState(state);
      setVersion((v) => v + 1);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    if (remember) rememberStage(opening, item, hash.stage);
  }, [opening, item, hash.stage, remember]);
  const nextAfter = (stage: Stage): Stage => STAGES[STAGES.indexOf(stage) + 1] ?? 'done';
  return { hash, setHash, nextAfter, version };
}
