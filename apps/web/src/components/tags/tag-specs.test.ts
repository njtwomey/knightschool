import type { Variant } from '@knightschool/core';
import { describe, expect, it } from 'vitest';
import { tagsOf } from './tag-specs';

const variant = (tags: Partial<Variant['tags']>, over: Partial<Variant> = {}): Variant => ({
  id: 'v',
  kind: 'line',
  name: 'V',
  eco: 'C50',
  mainLine: [],
  opponent: '',
  alternative: false,
  tags: { character: ['solid'], risk: 'low', earlyMate: 'none', tricks: [], themes: [], ...tags },
  ...over,
});

describe('tagsOf', () => {
  it.each([
    ['low', /safe line/],
    ['medium', /lose a pawn or a piece/],
    ['high', /lose the game quickly/],
  ] as const)('explains %s risk in its own words', (risk, words) => {
    const tag = tagsOf(variant({ risk })).find((spec) => spec.group === 'risk')!;
    expect(tag.label).toBe(`${risk} risk`);
    expect(tag.title).toMatch(words);
  });

  it.each([
    ['white', 'white', 'mate chances: you', /you \(white\)/],
    ['white', 'black', 'mate chances: them', /White can give mate/],
    ['both', 'black', 'mate chances: both', /either side/],
    ['black', undefined, 'mate chances: black', /Black can give mate/],
  ] as const)('says who has early mate (%s, learner %s)', (earlyMate, side, label, words) => {
    const tag = tagsOf(variant({ earlyMate }), side).find((spec) => spec.group === 'mate')!;
    expect(tag.label).toBe(label);
    expect(tag.title).toMatch(words);
  });

  it('gives every tag an explanation, and a trap the one for its kind', () => {
    const trap = variant(
      { character: ['tactical', 'sharp'], tricks: ['fork', 'back-rank'] },
      { kind: 'refutation', whose: 'against-us' },
    );
    const tags = tagsOf(trap);
    expect(tags.map((tag) => tag.label)).toEqual(['trap', 'tactical', 'low risk', 'sharp', 'fork', 'back rank']);
    expect(tags.every((tag) => tag.title.length > 20)).toBe(true);
    expect(tags[0]!.title).toMatch(/to avoid/);
  });
});
