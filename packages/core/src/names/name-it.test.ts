import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { nameItPositions, nameItRef } from './name-it';

const played = replay(START_EPD, 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3'.split(' '));
const opening = {
  id: 'italian',
  startPly: 5,
  lines: [{ id: 'main', moves: played.map((m) => m.uci) }],
} as unknown as BuiltOpening;

describe('nameItPositions', () => {
  it('lists the named positions from the start on, with their moves and weight', () => {
    const italian = { eco: 'C50', name: 'Italian Game' };
    const piano = { eco: 'C50', name: 'Italian Game: Giuoco Piano' };
    const names = {
      positions: { [played[2]!.epd]: [italian], [played[4]!.epd]: [italian], [played[6]!.epd]: [piano] },
      variations: {},
    };
    const positions = nameItPositions(opening, names, { [played[4]!.epd]: { games: 500 } });
    expect(positions.map((p) => [p.sans.length, p.names[0]!.name, p.weight])).toEqual([
      [5, 'Italian Game', 500],
      [7, 'Italian Game: Giuoco Piano', 1],
    ]);
    expect(nameItRef('italian', played[4]!.epd)).toBe(`name-it:italian:${played[4]!.epd}`);
  });
});
