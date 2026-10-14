import { describe, expect, it } from 'vitest';
import { gradeGuess, guessSummary, guessWeight, lastResults, suggest, type GuessTargets } from './guess';

const targets: GuessTargets = {
  openings: ['Caro-Kann Defence'],
  variations: ['Advance Variation, Short Variation', 'Advance Variation'],
};

describe('gradeGuess', () => {
  it.each([
    ['advance short', 'full'],
    ['Caro-Kann advance variation', 'full'],
    ['caro kann', 'partial'],
    ['Caro-Kann Defense', 'partial'],
    ['sicilian najdorf', 'miss'],
    ['', 'miss'],
    ['defence', 'miss'],
  ])('%s is %s', (answer, result) => {
    expect(gradeGuess(answer, targets).result).toBe(result);
  });

  it('is full credit for the opening when there is no variation to name', () => {
    expect(gradeGuess('scandinavian', { openings: ['Scandinavian Defence'], variations: [] }).result).toBe('full');
  });

  it('accepts any of several openings that reach the position', () => {
    const several: GuessTargets = { openings: ['London System', 'Queen’s Gambit'], variations: [] };
    expect(gradeGuess('london', several).result).toBe('full');
    expect(gradeGuess('queens gambit', several).result).toBe('full');
  });
});

describe('suggest', () => {
  const names = ['Caro-Kann Defence', 'Scotch Game', 'Scandinavian Defence', 'Two Knights Defence'];
  it('matches word beginnings in any order and prefers shorter names', () => {
    expect(suggest(names, 'sc')).toEqual(['Scotch Game', 'Scandinavian Defence']);
    expect(suggest(names, 'def kn')).toEqual(['Two Knights Defence']);
    expect(suggest(names, '')).toEqual([]);
  });
});

describe('gradeGuess with long variation names', () => {
  const alapin: GuessTargets = {
    openings: ['Sicilian Defence'],
    variations: ['Sicilian Alapin', 'Sicilian Defense: Alapin Variation, Smith-Morra Declined'],
  };
  it('accepts any identifying part of the name', () => {
    expect(gradeGuess('alapin', alapin).result).toBe('full');
    expect(gradeGuess('smith morra declined', alapin).result).toBe('full');
    expect(gradeGuess('sicilian', alapin).result).toBe('partial');
  });

  it('does not ask for a name that is only moves', () => {
    const moves: GuessTargets = { openings: ['Elephant Gambit'], variations: ['3.Nxe5 dxe4 4.d4'] };
    expect(gradeGuess('elephant', moves).result).toBe('full');
  });
});

describe('guess history', () => {
  it('summarises points and accuracy', () => {
    const summary = guessSummary([{ result: 'full' }, { result: 'partial' }, { result: 'miss' }, { result: 'full' }]);
    expect(summary).toMatchObject({ total: 4, full: 2, partial: 1, miss: 1, points: 2.5, accuracy: 0.625 });
    expect(guessSummary([]).accuracy).toBeNull();
  });

  it('weights missed positions up and mastered ones down, and keeps the newest result', () => {
    expect(guessWeight('miss')).toBeGreaterThan(guessWeight(undefined));
    expect(guessWeight(undefined)).toBeGreaterThan(guessWeight('full'));
    const last = lastResults([
      { epd: 'a', at: '2026-01-02', result: 'full' },
      { epd: 'a', at: '2026-01-01', result: 'miss' },
      { epd: 'b', at: '2026-01-01', result: 'miss' },
    ]);
    expect(last.get('a')).toBe('full');
    expect(last.get('b')).toBe('miss');
  });
});
