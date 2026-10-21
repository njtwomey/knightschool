import { describe, expect, it } from 'vitest';
import { cardDefinitions, courseUnits, type CardOptions, type OpeningContent } from '../packages/core/src/index.ts';
import { loadCourses, loadCurriculum, loadGlossary, loadOpeningGroups } from './content-lib.ts';

/** How many positions ask the learner for a move: their turn, with a repertoire move. */
const ourMoves = (content: OpeningContent) =>
  Object.values(content.nodes).filter((node) => node.isOurTurn && node.moves.some((edge) => edge.isRepertoire)).length;

// Builds the real files under content/, so a bad PGN, tag or course.yaml fails `make test`, not just `pnpm content:build`.
describe('content', () => {
  const courses = loadCourses();

  it('reads every course folder, with unique ids and the side of its folder', () => {
    const ids = courses.map((content) => content.opening.id);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists every course once in the study order, after what it depends on', () => {
    expect(
      loadCurriculum(courses)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(courses.map((content) => content.opening.id).sort());
  });

  it('groups every course under an opening, and names only motifs that exist', () => {
    const groups = loadOpeningGroups(courses);
    const grouped = groups.flatMap((group) => group.courses);
    expect(new Set(grouped).size).toBe(grouped.length); // a course belongs to exactly one opening
    expect(grouped.sort()).toEqual(courses.map((content) => content.opening.id).sort());
    loadGlossary(courses);
  });

  it.each(courses.map((content) => [content.opening.id, content] as const))(
    '%s has cards and a main line',
    (_id, content) => {
      // A course made only of lines borrowed from other courses (`from:`) is for reading: they drill them.
      const borrowedOnly = content.opening.variants.every((variant) => variant.alternative);
      if (borrowedOnly) expect(cardDefinitions(content)).toHaveLength(0);
      else expect(ourMoves(content)).toBeGreaterThanOrEqual(3);
      expect(content.opening.variants[0]!.kind).toBe('line');
    },
  );

  // The study path introduces cards unit by unit: a card in no unit would never be introduced, one in two would be
  // counted twice. Checked under each card setting the app offers.
  const settings: [string, CardOptions][] = [
    ['default settings', {}],
    ['rare lines included', { includeRare: true }],
    ['no popularity cut', { minPopularity: 0 }],
  ];
  it.each(
    courses.flatMap((content) =>
      settings.map(([name, options]) => [content.opening.id, name, content, options] as const),
    ),
  )('%s puts every card in exactly one unit (%s)', (_id, _name, content, options) => {
    const ids = courseUnits(content, options).flatMap((unit) => unit.cards.map((card) => card.id));
    expect(ids.length).toBe(new Set(ids).size);
    expect(new Set(ids)).toEqual(new Set(cardDefinitions(content, options).map((card) => card.id)));
  });
});
