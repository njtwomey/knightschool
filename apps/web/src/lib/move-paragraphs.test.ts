import { describe, expect, it } from 'vitest';
import { moveParagraphs } from './move-paragraphs';

const moves = (...comments: (string | undefined)[]) => comments.map((comment, ply) => ({ ply, comment }));
const plies = (paragraphs: { ply: number }[][]) => paragraphs.map((paragraph) => paragraph.map((move) => move.ply));

describe('moveParagraphs', () => {
  it('ends a paragraph at each commented move', () => {
    expect(plies(moveParagraphs(moves(undefined, 'a', undefined, undefined, 'b', undefined)))).toEqual([
      [0, 1],
      [2, 3, 4],
      [5],
    ]);
  });

  it('leaves no empty paragraph after a comment on the last move', () => {
    expect(plies(moveParagraphs(moves('a', 'b')))).toEqual([[0], [1]]);
  });

  it('is empty without moves', () => {
    expect(moveParagraphs([])).toEqual([]);
  });
});
