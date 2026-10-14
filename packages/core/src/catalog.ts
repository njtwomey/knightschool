import type { OpeningIndexEntry, Side, Tier } from './schema/content';

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

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (needles: string[], haystack: string) => needles.every((needle) => haystack.includes(needle));

/** Courses in the order to study them, from content/curriculum.yaml. */
export const inStudyOrder = (courses: OpeningIndexEntry[]) => [...courses].sort((a, b) => a.order - b.order);

const courseText = (course: OpeningIndexEntry) =>
  [
    course.name,
    course.eco ?? '',
    course.trigger,
    course.summary,
    ...course.plans,
    ...course.motifs,
    ...course.tags,
    ...course.lines.flatMap((line) => [line.name, line.opponent]),
  ]
    .join(' ')
    .toLowerCase();

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
      const text = [line.name, line.opponent, course.name, course.eco ?? ''].join(' ').toLowerCase();
      if (matchesAll(needles, text)) hits.push({ course, line });
    }
  }
  const exact = (hit: LineHit) => (hit.line.name.toLowerCase().includes(needles.join(' ')) ? 0 : 1);
  return hits.sort((a, b) => exact(a) - exact(b) || a.course.order - b.course.order).slice(0, limit);
}

/** Every line of the given courses, as search hits, in study order. */
export function allLines(courses: OpeningIndexEntry[]): LineHit[] {
  return inStudyOrder(courses).flatMap((course) => course.lines.map((line) => ({ course, line })));
}

/**
 * How well something matches a search, so results can be ordered: a name match is worth a lot (the whole name most, then
 * a name that starts with it, then one that has every word), and a match only in the surrounding text (summary, course
 * and line names) is worth a little. Zero means no match; an empty search matches everything equally.
 */
export function relevance(name: string, content: string, query: string): number {
  const needles = words(query);
  if (needles.length === 0) return 1;
  const typed = needles.join(' ');
  const lower = name.toLowerCase();
  const nameWords = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  if (lower === typed) return 100;
  if (lower.startsWith(typed)) return 80;
  if (needles.every((needle) => nameWords.has(needle))) return 60;
  if (matchesAll(needles, lower)) return 50;
  const text = `${lower} ${content.toLowerCase()}`;
  const found = needles.filter((needle) => text.includes(needle)).length;
  if (found === needles.length) return 20;
  return found > 0 && needles.length > 1 ? 5 * (found / needles.length) : 0;
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
  if (matchesAll(needles, course.name.toLowerCase())) return { kind: 'name' };
  const names = course.lines
    .filter((line) => matchesAll(needles, `${line.name} ${line.opponent}`.toLowerCase()))
    .map((line) => line.name);
  return names.length > 0 ? { kind: 'lines', names: [...new Set(names)] } : { kind: 'text' };
}

/** Progress over a set of courses: how many cards are learned out of how many exist. */
export function courseProgress(
  courses: OpeningIndexEntry[],
  learned: Record<string, number>,
): { learned: number; total: number } {
  return {
    learned: courses.reduce((sum, course) => sum + (learned[course.id] ?? 0), 0),
    total: courses.reduce((sum, course) => sum + course.cards, 0),
  };
}

/** The courses to take next: those whose prerequisites are all started, that you have not started yourself. */
export function nextCourses(
  courses: OpeningIndexEntry[],
  prerequisites: Record<string, string[]>,
  learned: Record<string, number>,
  limit = 3,
): OpeningIndexEntry[] {
  return inStudyOrder(courses)
    .filter((course) => !((learned[course.id] ?? 0) > 0))
    .filter((course) => (prerequisites[course.id] ?? []).every((id) => (learned[id] ?? 0) > 0))
    .slice(0, limit);
}
