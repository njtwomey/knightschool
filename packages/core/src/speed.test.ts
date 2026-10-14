import { describe, expect, it } from 'vitest';
import { formatMs, speedSummary } from './speed';

describe('speedSummary', () => {
  it('is empty before anything is played', () => {
    expect(speedSummary([])).toEqual({
      lines: 0,
      moves: 0,
      errors: 0,
      averageMs: null,
      bestLineMs: null,
      slowestMs: 0,
    });
  });

  it('averages over moves, not over lines, and finds the best line', () => {
    const summary = speedSummary([
      { moves: 4, errors: 1, totalMs: 8000, slowestMs: 3500 },
      { moves: 6, errors: 0, totalMs: 6000, slowestMs: 2000 },
    ]);
    expect(summary).toMatchObject({
      lines: 2,
      moves: 10,
      errors: 1,
      averageMs: 1400,
      bestLineMs: 1000,
      slowestMs: 3500,
    });
  });
});

describe('formatMs', () => {
  it('reads as milliseconds under a second and seconds above', () => {
    expect(formatMs(850)).toBe('850 ms');
    expect(formatMs(1400)).toBe('1.4 s');
    expect(formatMs(null)).toBe('–');
  });
});
