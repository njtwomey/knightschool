import { describe, expect, it } from 'vitest';
import { arrowsOf, squareStylesOf, uciArrow } from './shapes';

const annotation = (arrows: string[], circles: string[]) => ({ nag: [], motifs: [], arrows, circles });

describe('shapes', () => {
  it('reads coloured and uncoloured arrows and skips malformed ones', () => {
    const arrows = arrowsOf(annotation(['Re2e4', 'd1h5', 'nonsense', 'Xa1a2'], []));
    expect(arrows.map((arrow) => `${arrow.startSquare}${arrow.endSquare}`)).toEqual(['e2e4', 'd1h5']);
    expect(arrows[0]!.color).not.toBe(arrows[1]!.color);
  });

  it('highlights the last move and rings circled squares', () => {
    const styles = squareStylesOf('g1f3', annotation([], ['Rf3', 'e4']));
    expect(Object.keys(styles).sort()).toEqual(['e4', 'f3', 'g1']);
    expect(styles.f3).toMatchObject({ backgroundColor: 'var(--board-highlight)' });
    expect(styles.f3!.boxShadow).toContain('inset');
  });

  it('is empty without a move or annotation', () => {
    expect(arrowsOf(undefined)).toEqual([]);
    expect(squareStylesOf(undefined, undefined)).toEqual({});
  });

  it('draws an arrow along a move, coloured by what it means', () => {
    expect(uciArrow('e2e4')).toMatchObject({ startSquare: 'e2', endSquare: 'e4' });
    expect(uciArrow('e7e8q', 'played')).toMatchObject({ startSquare: 'e7', endSquare: 'e8' });
    const colours = new Set((['answer', 'candidate', 'played'] as const).map((tone) => uciArrow('a2a4', tone).color));
    expect(colours.size).toBe(3);
    expect(uciArrow('a2a4').color).toBe(uciArrow('a2a4', 'answer').color);
  });
});
