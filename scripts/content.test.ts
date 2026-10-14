import { describe, expect, it } from 'vitest';
import { ourMoveNodes } from '../packages/core/src/index.ts';
import { loadFamilies, loadOpenings } from './content-lib.ts';

// Builds the real files in content/openings, so a bad PGN or tag fails `make test`, not just `pnpm content:build`.
describe('content/openings', () => {
  const openings = loadOpenings();

  it('reads every course folder, with unique ids', () => {
    const ids = openings.map((content) => content.opening.id);
    expect(ids.length).toBeGreaterThanOrEqual(9);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['caro-kann', 'caro-kann-two-knights', 'italian-game']));
  });

  it('groups every course under an opening, with the systems against Caro-Kann beside it', () => {
    const families = loadFamilies(openings);
    const grouped = families.flatMap((family) => family.courses);
    expect(new Set(grouped).size).toBe(grouped.length); // a course belongs to exactly one opening
    expect(grouped.sort()).toEqual(openings.map((content) => content.opening.id).sort());
    expect(families.find((family) => family.id === 'caro-kann')?.courses).toEqual(
      expect.arrayContaining(['caro-kann', 'caro-kann-advance', 'caro-kann-panov', 'caro-kann-two-knights']),
    );
  });

  it.each(openings.map((content) => [content.opening.id, content] as const))(
    '%s has cards and a main line',
    (_id, content) => {
      expect(ourMoveNodes(content).length).toBeGreaterThanOrEqual(5);
      expect(content.opening.variants[0]!.kind).toBe('line');
    },
  );
});
