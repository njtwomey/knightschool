import { describe, expect, it } from 'vitest';
import { AnalysisFile, mergeAnalysis, restrictAnalysis, serializeAnalysis } from './analysis';

const entry = (depth: number, cp = 10) => ({ depth, lines: [{ multipv: 1, cp, pv: ['e2e4'] }] });
const file: AnalysisFile = {
  engine: 'Stockfish 17',
  threads: 9,
  hash: 1024,
  date: '2026-10-14',
  positions: { b: entry(20), a: entry(24, -5) },
};

describe('analysis file', () => {
  it('round-trips through serializeAnalysis, one position per line', () => {
    const text = serializeAnalysis(file);
    expect(text.trim().split('\n')).toHaveLength(4);
    expect(AnalysisFile.parse(JSON.parse(text))).toEqual(file);
    expect(text.indexOf('"a"')).toBeLessThan(text.indexOf('"b"'));
  });

  it('rejects a line with a non-integer score', () => {
    expect(
      AnalysisFile.safeParse({ ...file, positions: { a: { depth: 1, lines: [{ multipv: 1, cp: 1.5, pv: [] }] } } })
        .success,
    ).toBe(false);
  });

  it('merge keeps the deeper entry and prefers the new one on a tie', () => {
    const merged = mergeAnalysis({ a: entry(24), b: entry(30) }, { a: entry(24, 99), b: entry(20), c: entry(10) });
    expect(merged['a']!.lines[0]!.cp).toBe(99);
    expect(merged['b']!.depth).toBe(30);
    expect(Object.keys(merged)).toEqual(['a', 'b', 'c']);
  });

  it('restrict keeps only listed positions that exist', () => {
    expect(Object.keys(restrictAnalysis(file, ['a', 'zzz']).positions)).toEqual(['a']);
  });
});
