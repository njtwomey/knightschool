import { describe, expect, it } from 'vitest';
import { parseVariantHeader } from './tags';

const valid = {
  Opening: 'Italian Game',
  Variation: 'Giuoco Pianissimo',
  ECO: 'C50',
  Character: 'solid,positional',
  Risk: 'low',
  EarlyMate: 'none',
  Tricks: 'none',
};

describe('parseVariantHeader', () => {
  it('parses a valid header', () => {
    expect(parseVariantHeader({ ...valid, Tricks: 'trap,fork', Themes: 'd4-break' }, 'x.pgn')).toEqual({
      name: 'Giuoco Pianissimo',
      eco: 'C50',
      opening: 'Italian Game',
      tags: {
        character: ['solid', 'positional'],
        risk: 'low',
        earlyMate: 'none',
        tricks: ['trap', 'fork'],
        themes: ['d4-break'],
        refutes: undefined,
        refutedBy: undefined,
      },
    });
  });

  it('treats Tricks "none" as an empty list', () => {
    expect(parseVariantHeader(valid, 'x.pgn').tags.tricks).toEqual([]);
  });

  it.each([
    ['unknown tag', { Colour: 'red' }, /unknown tag \[Colour\]/],
    ['missing tag', { Risk: '' }, /missing tag \[Risk\]/],
    ['bad risk', { Risk: 'scary' }, /risk/],
    ['bad character', { Character: 'solid,wild' }, /character/],
    ['bad trick', { Tricks: 'trap,zugzwang' }, /tricks/],
    ['bad ECO', { ECO: 'Z99' }, /ECO/],
    ['illegal Refutes line', { Refutes: '1. e4 e5 2. Ke3 Ke6 3. Kxe5' }, /refutes is not a legal line/],
  ])('rejects %s and names the file', (_name, change, message) => {
    expect(() => parseVariantHeader({ ...valid, ...change }, 'content/a/lines/b.pgn')).toThrow(message);
    expect(() => parseVariantHeader({ ...valid, ...change }, 'content/a/lines/b.pgn')).toThrow(
      /content\/a\/lines\/b\.pgn/,
    );
  });
});
