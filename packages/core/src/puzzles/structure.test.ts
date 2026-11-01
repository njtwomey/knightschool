import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { pawnSquares, pawnStructure, structureDistance } from './structure';

const ITALIAN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq -';
const ITALIAN_C3 = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R b KQkq -';

describe('pawnStructure', () => {
  it('keeps the pawns only', () => {
    expect(pawnStructure(START_EPD)).toBe('8/pppppppp/8/8/8/8/PPPPPPPP/8');
    expect(pawnStructure(ITALIAN)).toBe('8/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/8');
  });

  it('ignores pieces, the side to move and the move counters', () => {
    const scotch = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(pawnStructure(scotch)).toBe(pawnStructure(ITALIAN));
  });
});

describe('structureDistance', () => {
  it('counts the pawns two structures do not share', () => {
    const a = pawnStructure(ITALIAN);
    const b = pawnStructure(ITALIAN_C3);
    expect(structureDistance(a, a)).toBe(0);
    expect(structureDistance(a, b)).toBe(2);
    expect(pawnSquares(b)).toContain('Pc3');
    expect(pawnSquares(b)).not.toContain('Pc2');
  });
});
