import { describe, expect, it, vi } from 'vitest';
import type { StepData } from '@/components/openings/steps';
import type { VariationData } from '@/components/openings/variation-list';
import { stepNeighbours } from './views';

// The web tests have no YAML loader: the same file, as core's tests read it.
vi.mock('@/data/site-config', () => {
  const path = new URL('../../../../../packages/core/src/testing/site-config.ts', import.meta.url).href;
  return import(/* @vite-ignore */ path);
});

const row = (id: string, number: number, index?: number) =>
  ({ id, number, ...(index !== undefined ? { followUp: { index } } : {}) }) as unknown as StepData;

const variations: Pick<VariationData, 'steps' | 'followUps'>[] = [
  { steps: [row('one', 1), row('two', 2)], followUps: { one: [row('one-a', 1, 0), row('one-b', 1, 1)] } },
  { steps: [row('three', 3)], followUps: { three: [row('three-a', 3, 0)] } },
];
const ids = (at: { step: number; followUp?: number }) => {
  const { previous, next } = stepNeighbours(variations, at);
  return [previous?.id, next?.id];
};

describe('stepNeighbours', () => {
  it('goes from step to step, past the follow-ups', () => {
    expect(ids({ step: 1 })).toEqual([undefined, 'two']);
    expect(ids({ step: 2 })).toEqual(['one', 'three']);
    expect(ids({ step: 3 })).toEqual(['two', undefined]);
  });

  it('runs through a step’s follow-ups and rejoins at the next step', () => {
    expect(ids({ step: 1, followUp: 1 })).toEqual(['one', 'one-b']);
    expect(ids({ step: 1, followUp: 2 })).toEqual(['one-a', 'two']);
  });

  it('stops at the end of the opening', () => {
    expect(ids({ step: 3, followUp: 1 })).toEqual(['three', undefined]);
  });

  it('has nothing for a step it does not know', () => {
    expect(stepNeighbours(variations, { step: 9 })).toEqual({});
  });
});
