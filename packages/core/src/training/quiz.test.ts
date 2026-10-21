import { describe, expect, it } from 'vitest';
import { entryMatches, matchAnswer, normalise } from './quiz';
import type { Quiz } from '../schema/content';

const entry = (keywords: string[][], all = true) => ({ keywords, all, feedback: 'ok', partial: false });

describe('normalise', () => {
  it.each([
    ['It DROPS the rook!', ' it lose the rook '],
    ['Rook on h8 hangs.', ' rook on h8 lose '],
    ['loses the exchange on h8', ' lose the exchange on h8 '],
    ['the knight attacks two pieces', ' the knight fork piece '],
    ['en prise', ' lose '],
    ['two rooks and some pawns', ' two rook and some pawn '],
  ])('%s', (text, expected) => {
    // Plural s is dropped from long words; synonyms become one word each.
    expect(normalise(text)).toBe(expected);
  });
});

describe('matching', () => {
  // The three phrasings from the plan all pass one entry.
  const dropsTheRook = entry([
    ['rook', 'rh8', 'exchange'],
    ['lose', 'drop', 'hang'],
  ]);

  it.each([
    'it drops the rook',
    'rook on h8 hangs',
    'loses the exchange on h8',
    'The ROOK is en prise!',
    'it leaves rh8 hanging',
  ])('accepts "%s"', (answer) => {
    expect(entryMatches(answer, dropsTheRook)).toBe(true);
  });

  it.each(['it develops a knight', 'the rook is great', 'it loses', '', '   ', 'brook hangs'])(
    'rejects "%s"',
    (answer) => {
      expect(entryMatches(answer, dropsTheRook)).toBe(false);
    },
  );

  it('matches whole words, not parts of words', () => {
    expect(entryMatches('a brooklyn queen', entry([['rook']]))).toBe(false);
    expect(entryMatches('the rook', entry([['rook']]))).toBe(true);
  });

  it('can require any group instead of every group', () => {
    const either = entry([['fork'], ['pin']], false);
    expect(entryMatches('it pins the knight', either)).toBe(true);
    expect(entryMatches('it forks two pieces', either)).toBe(true);
    expect(entryMatches('it develops', either)).toBe(false);
    expect(entryMatches('it pins and forks', entry([['fork'], ['pin']], true))).toBe(true);
    expect(entryMatches('it pins', entry([['fork'], ['pin']], true))).toBe(false);
  });

  it('understands multi-word keywords written in natural language', () => {
    expect(entryMatches('both pieces are attacked at once', entry([['attacks two', 'double attack']], false))).toBe(
      false,
    );
    expect(entryMatches('it is a double attack', entry([['attacks two']], false))).toBe(true);
    expect(entryMatches('Attacks two pieces', entry([['forks']], false))).toBe(true);
  });

  it('takes the first entry that matches and returns its feedback', () => {
    const quiz: Pick<Quiz, 'accept'> = {
      accept: [
        {
          keywords: [['queen'], ['fork', 'attack']],
          all: true,
          feedback: 'The queen attacks two things.',
          partial: false,
        },
        { keywords: [['knight']], all: false, feedback: 'A knight is involved.', partial: false },
      ],
    };
    expect(matchAnswer(quiz, 'the queen forks the knight')).toEqual({
      matched: true,
      feedback: 'The queen attacks two things.',
      entry: 0,
    });
    expect(matchAnswer(quiz, 'a knight')).toEqual({ matched: true, feedback: 'A knight is involved.', entry: 1 });
    expect(matchAnswer(quiz, 'no idea')).toEqual({ matched: false });
  });

  it('never matches an entry with no keywords', () => {
    expect(entryMatches('anything', entry([]))).toBe(false);
  });

  it('treats a partial entry as a miss that still gets its feedback', () => {
    const quiz: Pick<Quiz, 'accept'> = {
      accept: [
        { keywords: [['bb4'], ['queen']], all: true, feedback: 'Yes.', partial: false },
        { keywords: [['knight']], all: false, feedback: 'Close: taking the knight is only the start.', partial: true },
      ],
    };
    expect(matchAnswer(quiz, 'Bb4 wins the queen')).toMatchObject({ matched: true });
    expect(matchAnswer(quiz, 'it takes the knight')).toEqual({
      matched: false,
      close: 'Close: taking the knight is only the start.',
    });
  });
});
