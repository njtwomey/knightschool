import { manifestOf } from '../testing/manifest';
import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from '../chess/chess';
import { START_EPD } from '../chess/epd';
import { parsePgn } from '../chess/pgn';
import { buildSearchIndex, searchAt } from './position-search';
import type { OpeningManifest } from '../schema/content';
import { buildOpening } from '../content/course-build';

const game = (name: string, moves: string, refutes = '') =>
  parsePgn(`[Event "x"]
[Opening "${name}"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]
${refutes ? `[Refutes "${refutes}"]` : ''}

${moves}`);

type Spec = { lines: string[]; refutations?: { moves: string; refutes: string }[] };

const course = (id: string, name: string, side: OpeningManifest['side'], spec: Spec) => {
  const refs = spec.refutations ?? [];
  return buildOpening(
    id,
    manifestOf({
      name,
      side,
      lines: spec.lines.map((_, i) => `line-${i}`),
      traps: refs.map((_, i) => `trap-${i}`),
    }),
    [
      ...spec.lines.map((text, i) => ({
        id: `line-${i}`,
        kind: 'line' as const,
        game: game(name, text),
        source: `${id}.pgn`,
      })),
      ...refs.map((ref, i) => ({
        id: `trap-${i}`,
        kind: 'refutation' as const,
        game: game(name, ref.moves, ref.refutes),
        source: `${id}.pgn`,
      })),
    ],
  );
};

const italian = course('italian', 'Italian', 'white', {
  lines: ['1. e4 e5 2. Nf3 Nc6 3. Bc4 *'],
  refutations: [{ moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4 *', refutes: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4' }],
});
const scotch = course('scotch', 'Scotch', 'white', { lines: ['1. e4 e5 2. Nf3 Nc6 3. d4 *'] });
const caro = course('caro', 'Caro', 'black', { lines: ['1. e4 c6 2. d4 d5 *'] });
const london = course('london', 'London', 'white', { lines: ['1. d4 d5 2. Bf4 *'] });
const reti = course('reti', 'Reti', 'white', { lines: ['1. Nf3 Nc6 2. e4 e5 *'] });
const index = buildSearchIndex([italian, scotch, caro, london, reti]);

describe('board search index', () => {
  it('lists the first moves with how many courses play each', () => {
    const start = searchAt(index, START_EPD)!;
    expect(start.courses).toEqual(['caro', 'italian', 'london', 'reti', 'scotch']);
    expect(start.moves.map((move) => [move.san, move.courses])).toEqual([
      ['e4', ['caro', 'italian', 'scotch']],
      ['d4', ['london']],
      ['Nf3', ['reti']],
    ]);
  });

  it('narrows as moves are played', () => {
    const afterE4 = searchAt(index, epdAfterPgn('1. e4'))!;
    expect(afterE4.courses).toEqual(['caro', 'italian', 'scotch']);
    expect(afterE4.moves.map((move) => move.san)).toEqual(['e5', 'c6']);
    const deeper = searchAt(index, epdAfterPgn('1. e4 e5 2. Nf3 Nc6'))!;
    expect(deeper.courses).toEqual(['italian', 'reti', 'scotch']); // the Reti reaches it by transposition
    expect(deeper.moves.map((move) => move.san)).toEqual(['Bc4', 'd4']);
  });

  it('finds a position reached by a different move order', () => {
    const viaE4 = searchAt(index, epdAfterPgn('1. e4 e5 2. Nf3 Nc6'))!;
    const viaNf3 = searchAt(index, epdAfterPgn('1. Nf3 Nc6 2. e4 e5'))!;
    expect(viaNf3).toEqual(viaE4);
    expect(viaNf3.courses).toEqual(['italian', 'reti', 'scotch']);
  });

  it('keeps lines and refutations apart so either, or both, can be asked for', () => {
    const position = epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4');
    expect(searchAt(index, position, 'refutations')!.lines.map((line) => line.kind)).toEqual(['refutation']);
    expect(searchAt(index, position, 'lines')!.lines.map((line) => line.kind)).toEqual(['line']);
    expect(searchAt(index, position, 'both')!.lines).toHaveLength(2);
    // The Nd4 trap only exists as a refutation: it is not a next move when asking for lines.
    expect(searchAt(index, position, 'refutations')!.moves.map((move) => move.san)).toEqual(['Nd4']);
    expect(searchAt(index, position, 'lines')!.moves).toEqual([]);
  });

  it('returns nothing when no line of the chosen kind reaches the position', () => {
    expect(searchAt(index, epdAfterPgn('1. d4 d5'), 'refutations')).toBeUndefined();
    expect(searchAt(index, epdAfterPgn('1. a4'))).toBeUndefined();
  });

  it('counts lines and records where a line ends', () => {
    const end = searchAt(index, epdAfterPgn('1. e4 c6 2. d4 d5'))!;
    expect(end.lines).toEqual([{ course: 'caro', line: 'line-0', kind: 'line', next: null }]);
    expect(end.moves).toEqual([]);
    const fork = searchAt(index, epdAfterPgn('1. e4 e5 2. Nf3 Nc6'))!;
    expect(fork.moves.find((move) => move.san === 'Bc4')!.lines).toBe(2); // the Italian line and its trap both play it
  });

  it('names each position after its own opening name, or the nearest named position before it', () => {
    const c = course('italian', 'Italian', 'white', { lines: ['1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3'] });
    const named = epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4');
    c.nodes[named]!.name = 'Italian Game';
    const index = buildSearchIndex([c]);
    expect(index[named]!.name).toBe('Italian Game');
    expect(index[epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3')]!.name).toBe('Italian Game');
    expect(index[epdAfterPgn('1. e4 e5')]!.name).toBeUndefined();
  });
});
