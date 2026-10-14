import { describe, expect, it } from 'vitest';
import { PopularityFile, mergePopularity, serializePopularity, type PopularityEntry } from './popularity';

const entry = (at: string, white = 1): PopularityEntry => ({ white, draws: 0, black: 0, moves: [], at });

describe('popularity file', () => {
  it('lets the newer fetch of a position win and keeps the rest', () => {
    const merged = mergePopularity(
      { a: entry('2026-01-01', 1), b: entry('2026-01-01', 2) },
      { a: entry('2026-06-01', 9), c: entry('2026-06-01', 3) },
    );
    expect(Object.keys(merged).sort()).toEqual(['a', 'b', 'c']);
    expect(merged.a!.white).toBe(9);
    expect(mergePopularity({ a: entry('2026-06-01', 9) }, { a: entry('2026-01-01', 1) }).a!.white).toBe(9);
  });

  it('serialises one sorted position per line and reads back as the same file', () => {
    const file: PopularityFile = {
      speeds: ['blitz'],
      ratings: [1000],
      date: '2026-10-14',
      positions: { b: entry('2026-10-14', 2), a: entry('2026-10-14', 1) },
    };
    const text = serializePopularity(file);
    const lines = text.trimEnd().split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[1]!.startsWith('"a":')).toBe(true);
    expect(PopularityFile.parse(JSON.parse(text))).toEqual(file);
  });

  it('rejects a position without a fetch date', () => {
    expect(() =>
      PopularityFile.parse({
        speeds: [],
        ratings: [],
        date: 'x',
        positions: { a: { white: 1, draws: 0, black: 0, moves: [] } },
      }),
    ).toThrow();
  });
});
