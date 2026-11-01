import { describe, expect, it } from 'vitest';
import { START_EPD, sideToMove } from './epd';
import { gameOver, legalTargets, replay } from './play';

describe('replay', () => {
  it('plays SAN and UCI alike and stops at an illegal move', () => {
    const played = replay(START_EPD, ['e4', 'e7e5', 'Nf3', 'Ke3']);
    expect(played.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(played[1]!.uci).toBe('e7e5');
    expect(sideToMove(played[2]!.epd)).toBe('black');
  });
});

describe('gameOver', () => {
  it('names the winner of a checkmate', () => {
    // The Legal Mate: 1.e4 e5 2.Nf3 Nc6 3.Bc4 d6 4.Nc3 Bg4 5.h3 Bh5 6.Nxe5 Bxd1 7.Bxf7+ Ke7 8.Nd5#
    const moves = 'e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4 h3 Bh5 Nxe5 Bxd1 Bxf7+ Ke7 Nd5#'.split(' ');
    const played = replay(START_EPD, moves);
    expect(played).toHaveLength(15);
    expect(gameOver(played.at(-1)!.epd)).toBe('white');
    expect(gameOver(START_EPD)).toBeNull();
  });
});

describe('legalTargets', () => {
  it('lists where a piece can go, marking captures, once per square', () => {
    const afterE4E5 = replay(START_EPD, ['e4', 'd5']).at(-1)!.epd;
    const pawn = legalTargets(afterE4E5, 'e4');
    expect(pawn).toEqual(
      expect.arrayContaining([
        { to: 'e5', capture: false },
        { to: 'd5', capture: true },
      ]),
    );
    expect(
      legalTargets(START_EPD, 'b1')
        .map((target) => target.to)
        .sort(),
    ).toEqual(['a3', 'c3']);
    expect(legalTargets(START_EPD, 'e7')).toEqual([]);
  });
});
