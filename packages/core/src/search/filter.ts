import { plainText } from '../content/rich-text';
import type { OpeningIndexEntry, Side, Tier } from '../schema/content';
import { fold, matchesAll, matchesExactly, words } from './text-match';

/** What a search looks in: everything, or only courses or lines. */
export type SearchScope = 'all' | 'courses' | 'lines';
/** Whether a course plays an opening (it is on the side that plays it) or meets it from the other side. */
export type Role = 'play' | 'against';
export type CatalogFilter = {
  query: string;
  side: Side | 'all';
  tier: Tier | 'all';
  role: Role | 'all';
  scope: SearchScope;
};

/** Courses in the order to study them, from content/curriculum.yaml. */
export const inStudyOrder = (courses: OpeningIndexEntry[]) => [...courses].sort((a, b) => a.order - b.order);

const courseText = (course: OpeningIndexEntry) =>
  [
    course.name,
    course.eco ?? '',
    course.trigger,
    plainText(course.summary),
    ...course.plans.map(plainText),
    ...course.motifs,
    ...course.tags,
    ...course.lines.flatMap((line) => [line.name, line.opponent]),
  ]
    .map(fold)
    .join(' ');

/** Who plays each opening, so a course can be told apart as playing it or playing against it. */
export type OwnerOf = { id: string; side: Side };
export const roleOf = (course: Pick<OpeningIndexEntry, 'side' | 'opening'>, openings: OwnerOf[]): Role =>
  openings.find((opening) => opening.id === course.opening)?.side === course.side ? 'play' : 'against';

/** The courses that pass the side, tier and role filters and whose text contains every search word, in study order. */
export function filterCourses(
  courses: OpeningIndexEntry[],
  filter: CatalogFilter,
  openings: OwnerOf[] = [],
): OpeningIndexEntry[] {
  const needles = words(filter.query);
  return inStudyOrder(courses).filter(
    (course) =>
      (filter.side === 'all' || course.side === filter.side) &&
      (filter.tier === 'all' || course.tier === filter.tier) &&
      (filter.role === 'all' || roleOf(course, openings) === filter.role) &&
      matchesAll(needles, courseText(course)),
  );
}

export type LineHit = { course: OpeningIndexEntry; line: OpeningIndexEntry['lines'][number] };

/**
 * Lines that match a search, found in their own right: every word must appear in the line's name, what the opponent
 * does to reach it, or its course. Nothing for an empty search.
 */
export function searchLines(courses: OpeningIndexEntry[], query: string, limit = 12): LineHit[] {
  const needles = words(query);
  if (needles.length === 0) return [];
  const hits: LineHit[] = [];
  for (const course of courses) {
    for (const line of course.lines) {
      const text = fold([line.name, line.opponent, course.name, course.eco ?? ''].join(' '));
      if (matchesAll(needles, text)) hits.push({ course, line });
    }
  }
  const exact = (hit: LineHit) =>
    fold(hit.line.name).includes(needles.join(' '))
      ? 0
      : matchesExactly(needles, fold([hit.line.name, hit.line.opponent, hit.course.name].join(' ')))
        ? 1
        : 2;
  return hits.sort((a, b) => exact(a) - exact(b) || a.course.order - b.course.order).slice(0, limit);
}

/** Every line of the given courses, as search hits, in study order. */
export function allLines(courses: OpeningIndexEntry[]): LineHit[] {
  return inStudyOrder(courses).flatMap((course) => course.lines.map((line) => ({ course, line })));
}

export type MatchReason =
  /** The course's own name matches, so nothing more needs saying. */
  | { kind: 'name' }
  /** Lines inside it match by name. */
  | { kind: 'lines'; names: string[] }
  /** Only the description or the other text around it matches. */
  | { kind: 'text' };

/** Why a course came up for a search: its name, lines inside it, or just its description. Undefined for no search. */
export function matchReason(course: OpeningIndexEntry, query: string): MatchReason | undefined {
  const needles = words(query);
  if (needles.length === 0) return undefined;
  if (matchesAll(needles, fold(course.name))) return { kind: 'name' };
  const names = course.lines
    .filter((line) => matchesAll(needles, fold(`${line.name} ${line.opponent}`)))
    .map((line) => line.name);
  return names.length > 0 ? { kind: 'lines', names: [...new Set(names)] } : { kind: 'text' };
}
