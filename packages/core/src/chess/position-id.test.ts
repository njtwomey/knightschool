import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from './chess';
import { START_EPD } from './epd';
import { positionId } from './position-id';

describe('positionId', () => {
  it('is short, stable and the same for a transposition', () => {
    const id = positionId(START_EPD);
    expect(id).toMatch(/^[0-9a-z]{6,11}$/);
    expect(positionId(START_EPD)).toBe(id);
    expect(positionId(epdAfterPgn('1. e4 e5 2. Nf3 Nc6'))).toBe(positionId(epdAfterPgn('1. Nf3 Nc6 2. e4 e5')));
  });

  it('tells apart positions that differ only in side to move or castling rights', () => {
    const ids = new Set(
      [START_EPD, START_EPD.replace(' w ', ' b '), START_EPD.replace('KQkq', 'Qkq'), epdAfterPgn('1. e4')].map(
        positionId,
      ),
    );
    expect(ids.size).toBe(4);
  });
});
