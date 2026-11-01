import { describe, expect, it } from 'vitest';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import { exerciseOver, gradeMove, pickWeighted, popularReply, type Exercise } from './exercise';

const line: Exercise = {
  id: 'x',
  mode: 'try',
  start: START_EPD,
  side: 'white',
  grader: { kind: 'exact' },
  responder: { kind: 'scripted', script: ['e2e4', 'e7e5', 'g1f3'] },
};

describe('grading a move', () => {
  it('is right on the script, another when sound but not it, wrong otherwise', () => {
    expect(gradeMove(line, START_EPD, 0, 'e2e4', null)).toBe('right');
    expect(gradeMove(line, START_EPD, 0, 'd2d4', { grade: 'best', offRepertoire: true })).toBe('another');
    expect(gradeMove(line, START_EPD, 0, 'g2g4', { grade: 'blunder' })).toBe('wrong');
  });

  it('expects the opening’s answer in any position when it has a book', () => {
    const drill: Exercise = {
      ...line,
      mode: 'drill',
      grader: { kind: 'exact', book: { [START_EPD]: 'd2d4' } },
      responder: { kind: 'popular' },
    };
    expect(gradeMove(drill, START_EPD, 0, 'd2d4', null)).toBe('right');
    expect(gradeMove(drill, START_EPD, 0, 'e2e4', null)).toBe('wrong');
  });

  it('accepts any mate in a puzzle', () => {
    // Scholar's mate: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6, White to mate on f7.
    const epd = replay(START_EPD, ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']).at(-1)!.epd;
    const puzzle: Exercise = {
      ...line,
      mode: 'puzzle',
      start: epd,
      grader: { kind: 'exact', anyMate: true },
      responder: { kind: 'scripted', script: ['c4f7'] },
    };
    expect(gradeMove(puzzle, epd, 0, 'h5f7', null)).toBe('right');
  });

  it('lets a tolerant grader take any move up to the worst grade allowed', () => {
    const playOn: Exercise = {
      ...line,
      mode: 'play-on',
      grader: { kind: 'tolerant', worst: 'inaccuracy' },
      responder: { kind: 'engine' },
    };
    expect(gradeMove(playOn, START_EPD, 0, 'c2c4', { grade: 'good' })).toBe('right');
    expect(gradeMove(playOn, START_EPD, 0, 'f2f3', { grade: 'mistake' })).toBe('wrong');
  });
});

describe('ending and responding', () => {
  it('ends when the script runs out or enough learner moves are played', () => {
    expect(exerciseOver(line, START_EPD, 3, 2)).toBe(true);
    expect(exerciseOver({ ...line, responder: { kind: 'engine' }, learnerMoves: 5 }, START_EPD, 4, 2)).toBe(false);
  });

  it('picks replies in proportion to games, within the allowed ones', () => {
    const counts = {
      moves: [
        { uci: 'e7e5', games: 75 },
        { uci: 'c7c5', games: 25 },
        { uci: 'a7a6', games: 1 },
      ],
    };
    expect(popularReply(counts, undefined, 0.1)).toBe('e7e5');
    expect(popularReply(counts, undefined, 0.8)).toBe('c7c5');
    expect(popularReply(counts, ['c7c5', 'a7a6'], 0.1)).toBe('c7c5');
    expect(popularReply(undefined, ['e7e5'], 0.5)).toBe('e7e5');
    expect(pickWeighted([], 0.5)).toBeUndefined();
  });
});
