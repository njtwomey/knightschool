import { describe, expect, it } from 'vitest';
import { START_EPD, sideToMove } from './epd';
import { replay } from './play';

describe('replay', () => {
  it('plays SAN and UCI alike and stops at an illegal move', () => {
    const played = replay(START_EPD, ['e4', 'e7e5', 'Nf3', 'Ke3']);
    expect(played.map((move) => move.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(played[1]!.uci).toBe('e7e5');
    expect(sideToMove(played[2]!.epd)).toBe('black');
  });
});
