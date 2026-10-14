import { describe, expect, it } from 'vitest';
import { START_EPD, epdToFen, fenToEpd } from './epd';

describe('fenToEpd', () => {
  it.each([
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', START_EPD],
    [
      'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -',
    ],
    [START_EPD, START_EPD],
  ])('%s', (fen, epd) => {
    expect(fenToEpd(fen)).toBe(epd);
  });

  it('rejects text that is not a FEN', () => {
    expect(() => fenToEpd('e4 e5')).toThrow();
  });
});

describe('epdToFen', () => {
  it('adds counters', () => {
    expect(epdToFen(START_EPD)).toBe(`${START_EPD} 0 1`);
  });
});
