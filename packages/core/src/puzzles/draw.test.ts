import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';
import { drawPuzzles, outsideRange, type DrawOptions } from './draw';

/** A small seeded generator (Park and Miller), spread so that nearby seeds start far apart. */
const seeded = (start: number) => {
  let seed = (start * 2654435761) % 2147483647 || 1;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
};

const options = (fields: Partial<DrawOptions> = {}): DrawOptions => ({
  count: 3,
  rating: [1000, 1200],
  falloff: siteConfig.puzzles.ratingFalloff,
  levels: siteConfig.puzzles.levels,
  weighting: 'random',
  random: seeded(7),
  ...fields,
});

describe('outsideRange', () => {
  it.each([
    [999, 1],
    [1000, 0],
    [1100, 0],
    [1200, 0],
    [1350, 150],
  ])('%i is %i points outside 1000 to 1200', (rating, points) => {
    expect(outsideRange(rating, [1000, 1200])).toBe(points);
  });
});

describe('drawPuzzles', () => {
  const pool = [
    { id: 'idea1', rating: 1100, level: 'idea' },
    { id: 'fam1', rating: 1100, level: 'family' },
    { id: 'var1', rating: 1150, level: 'variation' },
    { id: 'var2', rating: 1050, level: 'variation' },
    { id: 'far', rating: 1700, level: 'variation' },
    { id: 'near', rating: 1250, level: 'variation' },
  ];

  it('takes the strongest levels first, inside the range', () => {
    const drawn = drawPuzzles(pool, options()).map((p) => p.id);
    expect(drawn.slice(0, 2).sort()).toEqual(['var1', 'var2']);
    expect(drawn[2]).toBe('fam1');
  });

  it('draws each puzzle once and stops at what there is', () => {
    const drawn = drawPuzzles(pool, options({ count: 20 })).map((p) => p.id);
    expect(drawn).toHaveLength(pool.length);
    expect(new Set(drawn).size).toBe(pool.length);
    // Out of range comes last.
    expect(drawn.slice(-2).sort()).toEqual(['far', 'near']);
  });

  it('keeps puzzles already met until the new ones run out', () => {
    const drawn = drawPuzzles(pool, options({ seen: new Set(['var1', 'var2']) })).map((p) => p.id);
    expect(drawn).toEqual(['fam1', 'idea1', expect.stringMatching(/^var[12]$/)]);
  });

  it('prefers a puzzle nearer the range among those outside it', () => {
    let nearFirst = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const drawn = drawPuzzles(
        pool.filter((p) => p.id === 'far' || p.id === 'near'),
        options({ count: 1, random: seeded(seed) }),
      );
      if (drawn[0]!.id === 'near') nearFirst += 1;
    }
    expect(nearFirst).toBeGreaterThan(140);
  });

  it('is the same for the same seed', () => {
    expect(drawPuzzles(pool, options({ count: 6, random: seeded(3) }))).toEqual(
      drawPuzzles(pool, options({ count: 6, random: seeded(3) })),
    );
  });
});
