import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';
import { choosePuzzles, compareCandidates, passesFilter, type PuzzleCandidate, type PuzzleLevel } from './select';

const filter = siteConfig.puzzles.select;
const levels = siteConfig.puzzles.levels;

let next = 0;
const candidate = (fields: Partial<PuzzleCandidate> & { level: PuzzleLevel }): PuzzleCandidate => {
  next += 1;
  return {
    id: `p${String(next).padStart(4, '0')}`,
    gameId: `g${String(next).padStart(7, '0')}`,
    rating: 1200,
    deviation: 75,
    popularity: 95,
    plays: 5000,
    ...fields,
  };
};

describe('passesFilter', () => {
  const base = candidate({ level: 'family' });
  it.each([
    ['inside', {}, true],
    ['lowest rating', { rating: filter.minRating }, true],
    ['below the band', { rating: filter.minRating - 1 }, false],
    ['highest rating', { rating: filter.maxRating }, true],
    ['above the band', { rating: filter.maxRating + 1 }, false],
    ['too unpopular', { popularity: filter.minPopularity - 1 }, false],
    ['too few plays', { plays: filter.minPlays - 1 }, false],
  ])('%s', (_name, change, expected) => expect(passesFilter({ ...base, ...change }, filter)).toBe(expected));

  it('caps the deviation only when asked', () => {
    expect(passesFilter({ ...base, deviation: 120 }, filter)).toBe(true);
    expect(passesFilter({ ...base, deviation: 120 }, { ...filter, maxDeviation: 100 })).toBe(false);
  });
});

describe('compareCandidates', () => {
  it('puts soon before late, unknown last, then reach, popularity and plays', () => {
    const soon = candidate({ level: 'through', plies: 2 });
    const late = candidate({ level: 'through', plies: 9 });
    const unknown = candidate({ level: 'through', plies: null, popularity: 100 });
    const reached = candidate({ level: 'family', reach: 1000, popularity: 80 });
    const popular = candidate({ level: 'family', reach: 10, popularity: 99 });
    const played = candidate({ level: 'family', reach: 10, popularity: 99, plays: 9000 });
    expect([unknown, late, soon].sort(compareCandidates)).toEqual([soon, late, unknown]);
    expect([popular, played, reached].sort(compareCandidates)).toEqual([reached, played, popular]);
  });
});

describe('choosePuzzles', () => {
  it('keeps the strongest level per puzzle and one puzzle per game', () => {
    const strong = candidate({ level: 'through', plies: 4 });
    const weak = { ...strong, level: 'family' as const, plies: null };
    const sameGame = candidate({ level: 'variation', gameId: strong.gameId });
    const other = candidate({ level: 'family' });
    const chosen = choosePuzzles([weak, other, sameGame, strong], { levels, perOpening: 10, filter });
    expect(chosen).toEqual([strong, other]);
  });

  it('drops what fails the filter', () => {
    const tooHard = candidate({ level: 'through', rating: 2500 });
    expect(choosePuzzles([tooHard], { levels, perOpening: 10, filter })).toEqual([]);
  });

  it('caps the total and passes unused shares down the levels', () => {
    const many = (level: PuzzleLevel, count: number) => Array.from({ length: count }, () => candidate({ level }));
    const pool = [...many('through', 2), ...many('variation', 50), ...many('family', 50), ...many('idea', 50)];
    const chosen = choosePuzzles(pool, { levels, perOpening: 30, filter });
    expect(chosen).toHaveLength(30);
    const count = (level: PuzzleLevel) => chosen.filter((c) => c.level === level).length;
    // Six levels: through takes 2 of its 5, after none of 6, variation 7 of ceil(28/4), family 7 of ceil(21/3),
    // structure none, and idea the 14 left.
    expect([count('through'), count('variation'), count('family'), count('idea')]).toEqual([2, 7, 7, 14]);
  });

  it('is stable: the same input gives the same output', () => {
    const pool = Array.from({ length: 20 }, () => candidate({ level: 'family' }));
    const once = choosePuzzles(pool, { levels, perOpening: 5, filter }).map((c) => c.id);
    const twice = choosePuzzles([...pool].reverse(), { levels, perOpening: 5, filter }).map((c) => c.id);
    expect(twice).toEqual(once);
  });
});

describe('choosePuzzles groups', () => {
  it('lets each group take its turn within a level', () => {
    const busy = Array.from({ length: 4 }, () => candidate({ level: 'variation', group: 'A', reach: 1000 }));
    const quiet = Array.from({ length: 2 }, () => candidate({ level: 'variation', group: 'B', reach: 10 }));
    const chosen = choosePuzzles([...busy, ...quiet], { levels: ['variation'], perOpening: 6, filter });
    expect(chosen.map((c) => c.group)).toEqual(['A', 'B', 'A', 'B', 'A', 'A']);
  });
});
