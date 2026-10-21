import { describe, expect, it } from 'vitest';
import { decidingIndex, pickWeighted, popularityWeight, practiceWeight, shuffle } from './sampling';

/** A repeatable stream of "random" numbers. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('pickWeighted', () => {
  it('returns the number asked for, without repeats', () => {
    const picked = pickWeighted([1, 2, 3, 4, 5], () => 1, 3, seeded(1));
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it('returns everything when asked for more than there is', () => {
    expect(pickWeighted([1, 2], () => 1, 10).sort()).toEqual([1, 2]);
  });

  it('favours heavy items over many draws, but still picks light ones', () => {
    const random = seeded(7);
    const wins = { heavy: 0, light: 0 };
    for (let i = 0; i < 2000; i++) {
      const [first] = pickWeighted(['heavy', 'light'], (name) => (name === 'heavy' ? 0.9 : 0.1), 1, random);
      wins[first as 'heavy' | 'light']++;
    }
    expect(wins.heavy).toBeGreaterThan(wins.light * 4);
    expect(wins.light).toBeGreaterThan(50);
  });

  it('is an even draw when every weight is the same', () => {
    const random = seeded(3);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[pickWeighted([0, 1, 2, 3], () => 1, 1, random)[0]!]! += 1;
    for (const count of counts) expect(Math.abs(count - 1000)).toBeLessThan(150);
  });
});

describe('popularityWeight', () => {
  it('uses the popularity, treats unknown as rare, and is never zero', () => {
    expect(popularityWeight(0.4)).toBe(0.4);
    expect(popularityWeight(undefined)).toBeGreaterThan(0);
    expect(popularityWeight(undefined)).toBeLessThan(0.05);
    expect(popularityWeight(0)).toBeGreaterThan(0);
  });
});

describe('shuffle', () => {
  it('keeps every item once and leaves the input alone', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = shuffle(items, seeded(5));
    expect([...shuffled].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(shuffle([], seeded(1))).toEqual([]);
  });

  it('puts each item first about equally often', () => {
    const random = seeded(11);
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[shuffle([0, 1, 2, 3], random)[0]!]! += 1;
    for (const count of counts) expect(Math.abs(count - 1000)).toBeLessThan(150);
  });
});

describe('practiceWeight', () => {
  it.each([
    ['random ignores popularity', 'random', 0.4, 1],
    ['random with nothing known', 'random', undefined, 1],
    ['popular uses the share of games', 'popular', 0.4, 0.4],
    ['popular treats unknown as rare', 'popular', undefined, popularityWeight(undefined)],
    ['popular never gives nothing', 'popular', 0, popularityWeight(0)],
  ] as const)('%s', (_, weighting, popularity, weight) => {
    expect(practiceWeight(weighting, popularity)).toBe(weight);
  });
});

describe('decidingIndex', () => {
  const along = ['start', 'a', 'b', 'c', 'd'];
  it.each([
    ['nothing else known: the first position from `from`', {}, 0],
    ['from where its own moves begin', { from: 2 }, 2],
    ['the first position no other line reaches', { seen: new Set(['start', 'a', 'b']) }, 3],
    ['skips shared positions after `from` too', { from: 1, seen: new Set(['a', 'b']) }, 3],
    ['never past where play stops', { seen: new Set(['start', 'a', 'b']), to: 2 }, 2],
    ['every position shared: the last one played', { seen: new Set(along) }, 4],
    ['`from` past the end: the last position', { from: 9 }, 4],
  ] as const)('%s', (_, options, index) => {
    expect(decidingIndex(along, options)).toBe(index);
  });
});
