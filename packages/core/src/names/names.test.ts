import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { gradeGuess, namedPositions, openingNames, parseOpeningNames, splitName } from './names';

const TSV = [
  'eco\tname\tpgn',
  'C50\tItalian Game\t1. e4 e5 2. Nf3 Nc6 3. Bc4',
  'C50\tItalian Game: Giuoco Piano\t1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
  'C53\tItalian Game: Classical Variation\t1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3',
  'C54\tItalian Game: Classical Variation, Giuoco Pianissimo\t1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3',
  'C50\tItalian Game: Paris Defense\t1. e4 e5 2. Nf3 Nc6 3. Bc4 d6',
  'C00\tBroken\t1. e4 e5 2. Ke3',
].join('\n');

const uci = (sans: string[]) => replay(START_EPD, sans).map((move) => move.uci);
const opening = {
  id: 'italian',
  name: 'Italian Game',
  startPly: 5,
  lines: [
    { id: 'main', moves: uci(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6']) },
    { id: 'trap', moves: uci(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3']) },
  ],
  variations: [
    { id: 'piano', name: 'Giuoco Piano', lines: ['main'] },
    { id: 'traps', name: 'Traps to know', lines: ['trap'] },
  ],
} as unknown as BuiltOpening;

describe('opening names', () => {
  const named = namedPositions(parseOpeningNames(TSV));

  it('reads the names file, skipping lines that do not replay', () => {
    expect(named.size).toBe(5);
  });

  it('gives each position the deepest name on the way, and its variation name', () => {
    const names = openingNames(opening, named);
    const at = (sans: string[]) => names.positions[replay(START_EPD, sans).at(-1)!.epd]?.map((n) => n.name);
    expect(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'])).toEqual(['Italian Game']);
    expect(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'])).toEqual([
      'Italian Game: Classical Variation',
      'Italian Game: Giuoco Piano',
    ]);
    expect(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'])).toEqual([
      'Italian Game: Classical Variation, Giuoco Pianissimo',
      'Italian Game: Giuoco Piano',
    ]);
    expect(at(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3'])).toEqual(['Italian Game: Paris Defense']);
    expect(names.variations).toEqual({
      piano: { eco: 'C50', name: 'Italian Game: Giuoco Piano' },
      traps: { eco: 'C50', name: 'Italian Game: Paris Defense' },
    });
  });

  it('splits a name into the opening and its segments', () => {
    expect(splitName('Italian Game: Classical Variation, Giuoco Pianissimo')).toEqual({
      opening: 'Italian Game',
      segments: ['Classical Variation', 'Giuoco Pianissimo'],
    });
  });
});

describe('gradeGuess', () => {
  const pianissimo = [
    { eco: 'C54', name: 'Italian Game: Classical Variation, Giuoco Pianissimo' },
    { eco: 'C50', name: 'Italian Game: Giuoco Piano' },
  ];
  it.each([
    ['Giuoco Pianissimo', 'full'],
    ['giuoco pianisimo', 'full'],
    ['Italian Game: Giuoco Pianissimo', 'full'],
    ['Giuoco Piano', 'full'],
    ['Italian', 'half'],
    ['italian game', 'half'],
    ['Classical', 'half'],
    ['Ruy Lopez', 'none'],
    ['', 'none'],
  ] as const)('%s is %s credit', (text, credit) => expect(gradeGuess(text, pianissimo).credit).toBe(credit));

  it('gives full credit for an opening with no variation', () => {
    expect(gradeGuess('Italian', [{ eco: 'C50', name: 'Italian Game' }]).credit).toBe('full');
    expect(gradeGuess('Petrovs', [{ eco: 'C42', name: "Petrov's Defense" }]).credit).toBe('full');
  });

  it('says which name earned the credit', () => {
    expect(gradeGuess('Giuoco Piano', pianissimo).name?.name).toBe('Italian Game: Giuoco Piano');
  });

  it('ignores a generic last segment', () => {
    const main = [{ eco: 'C54', name: 'Italian Game: Classical Variation, Giuoco Pianissimo, Main Line' }];
    expect(gradeGuess('main line', main).credit).toBe('none');
    expect(gradeGuess('Giuoco Pianissimo', main).credit).toBe('full');
  });
});
