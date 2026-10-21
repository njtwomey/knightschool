import { describe, expect, it } from 'vitest';
import { cutToMove, decidingPosition, formatMs, speedSummary } from './speed';
import { parsePgn } from '../chess/pgn';
import { buildOpening } from '../content/course-build';
import { variantPath } from '../navigation/content-walk';
import { manifestOf } from '../testing/manifest';

describe('speedSummary', () => {
  it('is empty before anything is played', () => {
    expect(speedSummary([])).toEqual({
      lines: 0,
      moves: 0,
      errors: 0,
      hints: 0,
      averageMs: null,
      bestLineMs: null,
      slowestMs: 0,
    });
  });

  it('averages over moves, not over lines, and finds the best line', () => {
    const summary = speedSummary([
      { moves: 4, errors: 1, hints: 2, totalMs: 8000, slowestMs: 3500 },
      { moves: 6, errors: 0, totalMs: 6000, slowestMs: 2000 },
    ]);
    expect(summary).toMatchObject({
      lines: 2,
      moves: 10,
      errors: 1,
      hints: 2,
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

describe('cutToMove', () => {
  const plies = Array.from({ length: 31 }, (_, i) => i); // 1.e4 to 16.(White)
  it('keeps both sides up to the move number, or the whole line for 0', () => {
    expect(cutToMove(plies, 6)).toHaveLength(12);
    expect(cutToMove(plies, 10).at(-1)).toBe(19);
    expect(cutToMove(plies, 0)).toHaveLength(31);
    expect(cutToMove(plies.slice(0, 8), 15)).toHaveLength(8);
  });
});

describe('decidingPosition', () => {
  const game = (moves: string, name: string) =>
    parsePgn(`[Event "x"]
[Opening "T"]
[Variation "${name}"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves}`);
  const content = buildOpening('t', manifestOf({ name: 'T', lines: ['main', 'side'], trigger: '1. e4 e5' }), [
    { id: 'main', kind: 'line', game: game('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *', 'main'), source: 'main.pgn' },
    { id: 'side', kind: 'line', game: game('1. e4 e5 2. Nf3 Nf6 3. Nxe5 *', 'side'), source: 'side.pgn' },
  ]);
  const after = (id: string, plies: number) => {
    const path = variantPath(content, id);
    return plies === 0 ? content.opening.rootEpd : path[plies - 1]!.to;
  };

  it.each([
    ['the first line is decided at the trigger', 'main', undefined, 2],
    ['a later line where it parts from the lines before it', 'side', undefined, 4],
    ['cut short before it parts: where play stops', 'side', 3, 3],
  ] as const)('%s', (_, line, plies, ply) => {
    expect(decidingPosition(content, line, plies)).toBe(after(line, ply));
  });
});
