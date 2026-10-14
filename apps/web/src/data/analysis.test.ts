import { describe, expect, it } from 'vitest';
import type { AnalysisFile } from '@knightschool/core';
import { BAKED_PREFIX, bakedEvaluation, bakedFirstStore, isBaked } from './analysis';

const file: AnalysisFile = {
  engine: 'Stockfish 17',
  threads: 9,
  hash: 1024,
  date: '2026-10-14',
  positions: {
    deep: {
      depth: 26,
      lines: [
        { multipv: 2, cp: 5, pv: ['d2d4'] },
        { multipv: 1, mate: -3, pv: ['e2e4', 'e7e5'] },
      ],
    },
  },
};

describe('bakedEvaluation', () => {
  it('returns the lines best first, labelled as baked', () => {
    const result = bakedEvaluation(file, 'deep', 14)!;
    expect(result.depth).toBe(26);
    expect(result.engine).toBe(`${BAKED_PREFIX}Stockfish 17`);
    expect(isBaked(result)).toBe(true);
    expect(result.lines).toEqual([
      { mate: -3, pv: ['e2e4', 'e7e5'] },
      { cp: 5, pv: ['d2d4'] },
    ]);
  });

  it('ignores a position that is missing or shallower than wanted, so the live engine can take over', () => {
    expect(bakedEvaluation(file, 'nope', 14)).toBeUndefined();
    expect(bakedEvaluation(file, 'deep', 30)).toBeUndefined();
    expect(bakedEvaluation(undefined, 'deep', 1)).toBeUndefined();
  });
});

describe('bakedFirstStore', () => {
  it('reads the baked value when deep enough, otherwise the inner store, and writes only to the inner one', async () => {
    const puts: string[] = [];
    const store = bakedFirstStore(file, {
      get: async (epd) => ({ epd, depth: 14, engine: 'live', lines: [{ cp: 1, pv: [] }] }),
      put: async (evaluation) => void puts.push(evaluation.epd),
    });
    expect(isBaked((await store.get('deep', 14, 'live'))!)).toBe(true);
    expect((await store.get('deep', 40, 'live'))!.engine).toBe('live');
    expect((await store.get('other', 14, 'live'))!.engine).toBe('live');
    await store.put({ epd: 'x', depth: 14, engine: 'live', lines: [] });
    expect(puts).toEqual(['x']);
  });
});
