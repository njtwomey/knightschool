import { describe, expect, it } from 'vitest';
import { moveNumber, moveNumberLabel, numberedLine, numberedMove, runMove } from './notation';

describe('move numbers', () => {
  it.each([
    [0, 'e4', '1.e4'],
    [1, 'e5', '1...e5'],
    [8, 'c3', '5.c3'],
    [9, 'Nf6', '5...Nf6'],
  ])('ply %i %s reads %s', (ply, san, text) => {
    expect(numberedMove(ply, san)).toBe(text);
  });

  it('numbers from the start or from a Black move', () => {
    expect(numberedLine(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3');
    expect(numberedLine(['Nf6', 'Ng5', 'd5'], 5)).toBe('3... Nf6 4. Ng5 d5');
    expect(numberedLine([])).toBe('');
  });

  it('writes one move of a run, numbered for White or when it opens the run', () => {
    expect(runMove(6, 'b4')).toBe('4. b4');
    expect(runMove(7, 'Bxb4')).toBe('Bxb4');
    expect(runMove(7, 'Bxb4', true)).toBe('4... Bxb4');
  });

  it('gives the number and its label alone', () => {
    expect([0, 1, 2, 9].map(moveNumber)).toEqual([1, 1, 2, 5]);
    expect(moveNumberLabel(0)).toBe('1.');
    expect(moveNumberLabel(9)).toBe('5...');
  });
});
