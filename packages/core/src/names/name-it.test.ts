import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { nameItAttempt, nameItCredit, nameItPositions, nameItRef } from './name-it';

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

describe('a Name it answer in the attempts log', () => {
  it('keeps full, half and no credit in the result and the try, and reads them back', () => {
    const full = nameItAttempt('Giuoco Piano', 'full', 3000);
    expect(full).toEqual({ result: 'right', tries: [{ uci: 'Giuoco Piano', ms: 3000, outcome: 'right' }] });
    const half = nameItAttempt(' Italian Game ', 'half', 2000);
    expect(half).toEqual({ result: 'wrong', tries: [{ uci: 'Italian Game', ms: 2000, outcome: 'another' }] });
    expect(nameItCredit(full)).toBe('full');
    expect(nameItCredit(half)).toBe('half');
    expect(nameItCredit(nameItAttempt('Sicilian', 'none', 1000))).toBe('none');
  });
  it('logs giving up as shown, with no try', () => {
    expect(nameItAttempt('', 'none', 500)).toEqual({ result: 'shown', tries: [] });
    expect(nameItCredit({ result: 'shown', tries: [] })).toBe('none');
  });
});
