import { describe, expect, it } from 'vitest';
import { numberedLine, numberedMove } from './notation';

describe('move numbers', () => {
  it.each([
    [0, 'e4', '1.e4'],
    [1, 'e5', '1...e5'],
    [6, 'c3', '4.c3'],
  ])('ply %i %s is %s', (ply, san, label) => expect(numberedMove(ply, san)).toBe(label));

  it('writes a run with a space after each number', () => {
    expect(numberedLine(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3');
    expect(numberedLine(['Nf6', 'Ng5'], 5)).toBe('3... Nf6 4. Ng5');
  });
});
