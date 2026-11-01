import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import { beats, cutToDepth, drawRound, learnerMovesIn, speedExercise, speedLines, speedScore } from './speed';

const uci = (sans: string) => replay(START_EPD, sans.split(' ')).map((move) => move.uci);
const after = (sans: string) => replay(START_EPD, sans.split(' ')).at(-1)!.epd;
const main = uci('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6');
const trap = uci('e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4');
const opening = {
  id: 'italian',
  side: 'white',
  startPly: 5,
  startEpd: after('e4 e5 Nf3 Nc6 Bc4'),
  lines: [
    { id: 'main', variation: 'piano', alternative: false, moves: main },
    { id: 'alt', variation: 'piano', alternative: true, moves: main },
    { id: 'trap', variation: 'traps', alternative: false, moves: trap },
  ],
} as unknown as BuiltOpening;

describe('speed', () => {
  it('cuts a line to a depth, ending on the learner move', () => {
    expect(cutToDepth(main, 'white', 3)).toEqual(main.slice(0, 5));
    expect(cutToDepth(main, 'white', 0)).toEqual(main.slice(0, 9));
    expect(cutToDepth(main, 'black', 2)).toEqual(main.slice(0, 4));
    expect(learnerMovesIn(main.slice(0, 5), 'white')).toBe(3);
  });

  it('weighs each line by the games where it parts from the lines before it', () => {
    const counts = {
      [opening.startEpd]: {
        games: 1000,
        moves: [
          { uci: 'f8c5', games: 600 },
          { uci: 'd7d6', games: 40 },
        ],
      },
    };
    const lines = speedLines(opening, counts);
    expect(lines.map((line) => [line.line, line.weight])).toEqual([
      ['main', 1000],
      ['trap', 40],
    ]);
    expect(speedLines(opening, undefined, 'traps').map((line) => [line.line, line.weight])).toEqual([['trap', 1]]);
  });

  it('makes an exercise from the start of the game, scripted', () => {
    const exercise = speedExercise({ opening: 'italian', line: 'main', side: 'white' }, main.slice(0, 5));
    expect(exercise).toMatchObject({
      id: 'speed:italian:main',
      mode: 'speed',
      start: START_EPD,
      grader: { kind: 'exact' },
    });
  });

  it('draws every item once before any twice', () => {
    let seed = 0.37;
    const random = () => (seed = ((seed * 9301 + 49297) % 233280) / 233280);
    const drawn = drawRound(
      [
        { id: 'a', weight: 100 },
        { id: 'b', weight: 1 },
        { id: 'c', weight: 1 },
      ],
      7,
      true,
      random,
    );
    expect(drawn).toHaveLength(7);
    expect(new Set(drawn.slice(0, 3).map((item) => item.id)).size).toBe(3);
    expect(new Set(drawn.slice(3, 6).map((item) => item.id)).size).toBe(3);
    expect(drawRound([], 3, false, random)).toEqual([]);
  });

  it('scores a set by time per move and a timed run by moves', () => {
    const lines = [
      { ms: 6000, moves: 3 },
      { ms: 2000, moves: 1 },
    ];
    expect(speedScore('lines', lines)).toEqual({ value: 2000, better: 'lower' });
    expect(speedScore('time', lines)).toEqual({ value: 4, better: 'higher' });
    expect(beats({ value: 1500, better: 'lower' }, 2000)).toBe(true);
    expect(beats({ value: 3, better: 'higher' }, 4)).toBe(false);
    expect(beats({ value: 3, better: 'higher' }, undefined)).toBe(true);
  });
});
