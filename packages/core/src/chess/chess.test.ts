import { describe, expect, it } from 'vitest';
import { epdAfterPgn, legalMovesFrom, playSan, playUci, pvToSan, replayUcis, sideToMove, withPromotion } from './chess';
import { START_EPD } from './epd';

describe('chess wrappers', () => {
  it('converts between SAN and UCI both ways', () => {
    const { uci, epd } = playSan(START_EPD, 'Nf3');
    expect(uci).toBe('g1f3');
    expect(playUci(START_EPD, 'g1f3')).toMatchObject({ san: 'Nf3', epd });
  });

  it.each([
    ['castling', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5', 'O-O', 'e1g1'],
    ['promotion', '', 'e8=Q', 'e7e8q'],
  ])('writes %s as UCI', (_name, pgn, san, uci) => {
    if (!pgn) {
      const epd = '7k/4P3/8/8/8/8/8/K7 w - -';
      expect(playSan(epd, san).uci).toBe(uci);
    } else {
      expect(playSan(epdAfterPgn(pgn), san).uci).toBe(uci);
    }
  });

  it('lists legal moves from a square', () => {
    expect(
      legalMovesFrom(START_EPD, 'g1')
        .map((move) => move.san)
        .sort(),
    ).toEqual(['Nf3', 'Nh3']);
    expect(legalMovesFrom(START_EPD, 'e4')).toEqual([]);
  });

  it('gives the same EPD for transposed move orders', () => {
    expect(epdAfterPgn('1. e4 e5 2. Nf3 Nc6')).toBe(epdAfterPgn('1. Nf3 Nc6 2. e4 e5'));
  });

  it('drops an en passant square nobody can use', () => {
    expect(epdAfterPgn('1. e4')).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -');
  });

  it('knows whose turn it is', () => {
    expect(sideToMove(START_EPD)).toBe('white');
    expect(sideToMove(epdAfterPgn('1. e4'))).toBe('black');
  });

  it('rejects an illegal move', () => {
    expect(() => playSan(START_EPD, 'Ke2')).toThrow();
  });
});

describe('replayUcis', () => {
  it('replays moves with their SAN and the position after each', () => {
    const played = replayUcis(START_EPD, ['e2e4', 'e7e5']);
    expect(played.map((move) => move.san)).toEqual(['e4', 'e5']);
    expect(played[1]).toEqual({ uci: 'e7e5', san: 'e5', epd: epdAfterPgn('1. e4 e5') });
  });

  it('stops at the first move that is not legal', () => {
    expect(replayUcis(START_EPD, ['e2e4', 'e2e4', 'e7e5']).map((move) => move.uci)).toEqual(['e2e4']);
    expect(replayUcis(START_EPD, [])).toEqual([]);
  });
});

describe('pvToSan', () => {
  it('numbers moves from the start', () => {
    expect(pvToSan(START_EPD, ['e2e4', 'e7e5', 'g1f3'])).toBe('1. e4 e5 2. Nf3');
  });

  it('starts with an ellipsis when Black is to move', () => {
    expect(pvToSan(epdAfterPgn('1. e4'), ['e7e5', 'g1f3', 'b8c6'])).toBe('1... e5 2. Nf3 Nc6');
  });

  it('stops at an illegal move and at the limit', () => {
    expect(pvToSan(START_EPD, ['e2e4', 'e2e4', 'e7e5'])).toBe('1. e4');
    expect(pvToSan(START_EPD, ['e2e4', 'e7e5', 'g1f3', 'b8c6'], 2)).toBe('1. e4 e5');
    expect(pvToSan(START_EPD, [])).toBe('');
  });

  it('writes castling and promotion', () => {
    expect(pvToSan('7k/4P3/8/8/8/8/8/K7 w - -', ['e7e8q'])).toBe('1. e8=Q+');
  });
});

describe('withPromotion', () => {
  it('leaves a legal move alone, adds a queen when needed, and rejects the illegal', () => {
    expect(withPromotion(START_EPD, 'e2e4')).toBe('e2e4');
    expect(withPromotion('7k/4P3/8/8/8/8/8/K7 w - -', 'e7e8')).toBe('e7e8q');
    expect(withPromotion(START_EPD, 'e2e5')).toBeNull();
  });
});
