import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltLine, BuiltOpening } from '../content/build-opening';
import { bookExits, lineEnds, playOnExercise } from './play-on';

const line = (id: string, moves: string[], fields: Partial<BuiltLine> = {}): BuiltLine => ({
  id,
  variation: 'v',
  kind: 'main',
  alternative: false,
  moves,
  sans: [],
  ...fields,
});

const MAIN = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6'];
const PARIS = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'd7d6'];
const after = (moves: string[]) => replay(START_EPD, moves).at(-1)!.epd;

/** An opening whose tree holds the two lines (the book), from the start after 1.e4 e5 2.Nf3 Nc6 3.Bc4. */
function opening(lines: BuiltLine[]): Pick<BuiltOpening, 'side' | 'startPly' | 'lines' | 'positions'> {
  const positions: BuiltOpening['positions'] = {};
  for (const one of lines) {
    replay(START_EPD, one.moves).forEach((move, ply, all) => {
      const before = ply === 0 ? START_EPD : all[ply - 1]!.epd;
      const node = (positions[before] ??= { moves: [] });
      if (!node.moves.some((m) => m.uci === move.uci))
        node.moves.push({ uci: move.uci, san: move.san, to: move.epd, mine: ply % 2 === 0, lines: [one.id] });
    });
  }
  return { side: 'white', startPly: 5, lines, positions };
}

describe('lineEnds', () => {
  it('lists each line’s last position in order, without alternatives or repeats', () => {
    const built = opening([
      line('main', MAIN),
      line('paris', PARIS),
      line('alt', PARIS, { alternative: true }),
      line('again', MAIN),
    ]);
    expect(lineEnds(built)).toEqual([
      { line: 'main', epd: after(MAIN), plies: 8 },
      { line: 'paris', epd: after(PARIS), plies: 6 },
    ]);
    expect(lineEnds(built, ['paris']).map((end) => end.line)).toEqual(['paris']);
  });

  it('leaves out a line that ends the game', () => {
    const mate = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];
    expect(lineEnds(opening([line('mate', mate)]))).toEqual([]);
  });
});

describe('bookExits', () => {
  const built = opening([line('main', MAIN), line('paris', PARIS)]);
  const atBc4 = after(MAIN.slice(0, 5));
  const counts = {
    [atBc4]: {
      games: 100,
      moves: [
        { uci: 'f8c5', san: 'Bc5', games: 40 },
        { uci: 'g8f6', san: 'Nf6', games: 30 },
        { uci: 'd7d6', san: 'd6', games: 20 },
        { uci: 'h7h6', san: 'h6', games: 10 },
      ],
    },
    // White's turn: never an exit, since the learner plays White.
    [after(MAIN.slice(0, 6))]: { games: 50, moves: [{ uci: 'd2d3', san: 'd3', games: 50 }] },
  };

  it('finds the replies players make that the opening does not answer, on the opponent’s turns', () => {
    const exits = bookExits(built, counts, 'main');
    expect(exits.map((exit) => [exit.ply, exit.san, exit.share])).toEqual([
      [5, 'Nf6', 0.3],
      [5, 'h6', 0.1],
    ]);
    expect(exits[0]!.before).toBe(atBc4);
    expect(exits[0]!.after).toBe(replay(atBc4, ['g8f6'])[0]!.epd);
  });

  it('knows nothing of an unknown line', () => {
    expect(bookExits(built, counts, 'nope')).toEqual([]);
  });
});

describe('playOnExercise', () => {
  it('is a tolerant exercise answered by popular replies', () => {
    expect(playOnExercise('play-on:main', after(MAIN), 'white', { learnerMoves: 5, worst: 'mistake' })).toEqual({
      id: 'play-on:main',
      mode: 'play-on',
      start: after(MAIN),
      side: 'white',
      grader: { kind: 'tolerant', worst: 'mistake' },
      responder: { kind: 'popular' },
      learnerMoves: 5,
    });
  });
});
