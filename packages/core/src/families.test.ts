import { describe, expect, it } from 'vitest';
import { buildFamilies } from './families';
import { parsePgn } from './pgn';
import type { FamilyMeta, OpeningManifest } from './schema/content';
import { buildOpening } from './tree';

const game = (moves: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "v"]
[ECO "B12"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves}`);

const course = (id: string, side: 'white' | 'black', moves: string, extra: Partial<OpeningManifest> = {}) =>
  buildOpening(
    id,
    { name: 'T', eco: 'B12', side, level: 'beginner', summary: 's', tags: [], lines: ['v'], refutations: [], ...extra },
    [{ id: 'v', kind: 'line', game: game(moves), source: `${id}.pgn` }],
  );

const caro = course('caro', 'black', '1. e4 c6 2. d4 d5 *', { family: 'caro-kann' });
const caroAgainst = course('caro-2k', 'white', '1. e4 c6 2. Nc3 d5 *', {
  family: 'caro-kann',
  against: 'Caro-Kann Defence',
});
const italian = course('italian', 'white', '1. e4 e5 2. Nf3 Nc6 3. Bc4 *');
const meta: FamilyMeta = { id: 'caro-kann', name: 'Caro-Kann Defence', summary: 'Solid.', moves: '1. e4 c6' };

describe('buildFamilies', () => {
  it('groups courses under the opening they name and finds its defining position', () => {
    const [family] = buildFamilies([meta], [caro, caroAgainst]);
    expect(family).toMatchObject({ id: 'caro-kann', name: 'Caro-Kann Defence', courses: ['caro', 'caro-2k'] });
    expect(family!.epd).toBe('rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -');
  });

  it('gives a course nobody grouped a family of its own', () => {
    const families = buildFamilies([meta], [caro, caroAgainst, italian]);
    expect(families.map((f) => f.id)).toEqual(['caro-kann', 'italian']);
    expect(families[1]).toMatchObject({ name: 'T', courses: ['italian'], moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4' });
  });

  it('refuses an against course whose opening is not described', () => {
    expect(() => buildFamilies([], [caroAgainst])).toThrow(/not described in content\/families\.yaml/);
  });

  it('refuses a duplicate family, a family with no courses, and a bad defining line', () => {
    expect(() => buildFamilies([meta, meta], [caro])).toThrow(/duplicate family/);
    expect(() => buildFamilies([meta], [italian])).toThrow(/has no courses/);
    expect(() => buildFamilies([{ ...meta, moves: '1. e4 e5 2. Ke3 Ke6 3. Kxe5' }], [caro])).toThrow(
      /not a legal sequence/,
    );
  });
});
