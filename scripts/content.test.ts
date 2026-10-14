import { describe, expect, it } from 'vitest';
import { ourMoveNodes } from '../packages/core/src/index.ts';
import { loadCourses, loadCurriculum, loadGlossary, loadOpeningGroups } from './content-lib.ts';

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
      expect(ourMoveNodes(content).length).toBeGreaterThanOrEqual(3);
      expect(content.opening.variants[0]!.kind).toBe('line');
    },
  );
});
