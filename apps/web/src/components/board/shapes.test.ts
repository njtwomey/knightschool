import { describe, expect, it } from 'vitest';
import { MARK_RGB, marksOnBoard, uciArrow } from './shapes';

describe('shapes', () => {
  it('draws arrows in the colour of their meaning and skips malformed ones', () => {
    const { arrows } = marksOnBoard({ arrows: ['Re2e4', 'Bd1h5', 'd1h5', 'nonsense', 'Xa1a2'] });
    expect(arrows).toEqual([
      { startSquare: 'e2', endSquare: 'e4', color: MARK_RGB.R },
      { startSquare: 'd1', endSquare: 'h5', color: MARK_RGB.B },
    ]);
  });

  it('rings marked squares', () => {
    const { squareStyles } = marksOnBoard({ circles: ['Yf3', 'e4'] });
    expect(Object.keys(squareStyles)).toEqual(['f3']);
    expect(squareStyles.f3!.boxShadow).toContain(MARK_RGB.Y);
  });

  it('is empty without marks', () => {
    expect(marksOnBoard(undefined)).toEqual({ arrows: [], squareStyles: {} });
  });

  it('draws an arrow along a move, coloured by what it means', () => {
    expect(uciArrow('e2e4')).toMatchObject({ startSquare: 'e2', endSquare: 'e4' });
    expect(uciArrow('e7e8q', 'played')).toMatchObject({ startSquare: 'e7', endSquare: 'e8' });
    const colours = new Set((['answer', 'candidate', 'played'] as const).map((tone) => uciArrow('a2a4', tone).color));
    expect(colours.size).toBe(3);
    expect(uciArrow('a2a4').color).toBe(uciArrow('a2a4', 'answer').color);
  });
});
