import type { Family, OpeningIndexEntry, Side } from './schema/content';

/** Whether a course teaches an opening, how to meet it, or is a motif: a named position that belongs to no opening. */
export type Role = 'play' | 'against' | 'motif';
export const roleOf = (course: OpeningIndexEntry): Role =>
  course.motif ? 'motif' : course.against ? 'against' : 'play';
const ROLE_ORDER: Role[] = ['play', 'against', 'motif'];

/** A family made only of motifs: shown on the Motifs page, not in the list of openings. */
export const isMotifFamily = (courses: OpeningIndexEntry[]) =>
  courses.length > 0 && courses.every((course) => course.motif);
const roleRank = (course: OpeningIndexEntry) => ROLE_ORDER.indexOf(roleOf(course));

/** What a search looks in: everything, or only openings, lines or motifs. */
export type SearchScope = 'all' | 'openings' | 'lines' | 'motifs';
export type CatalogFilter = { query: string; role: Role | 'all'; side: Side | 'all'; scope: SearchScope };

/** An opening with the courses under it that pass the current filters. */
export type FamilyView = { family: Family; courses: OpeningIndexEntry[] };

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (needles: string[], haystack: string) => needles.every((needle) => haystack.includes(needle));

const courseText = (course: OpeningIndexEntry) =>
  [
    course.name,
    course.eco,
    course.summary,
    course.against ?? '',
    ...course.tags,
    ...course.lines.map((line) => line.name),
  ]
    .join(' ')
    .toLowerCase();

const familyText = (family: Family, courses: OpeningIndexEntry[]) =>
  [family.name, family.eco ?? '', family.summary, ...courses.map(courseText)].join(' ').toLowerCase();

/** Every family with its courses, playing it first and then the systems against it, in the order families are listed. */
export function groupFamilies(courses: OpeningIndexEntry[], families: Family[]): FamilyView[] {
  const byId = new Map(courses.map((course) => [course.id, course]));
  return families.map((family) => ({
    family,
    courses: family.courses
      .flatMap((id) => byId.get(id) ?? [])
      .sort((a, b) => roleRank(a) - roleRank(b) || a.name.localeCompare(b.name)),
  }));
}

/**
 * Families to show: only courses that pass the role and side filters count, and a family stays if it still has one and
 * its text (its own, or any of those courses') contains every search word.
 */
export function filterFamilies(views: FamilyView[], filter: CatalogFilter): FamilyView[] {
  const needles = words(filter.query);
  return views.flatMap(({ family, courses }) => {
    const kept = courses.filter(
      (course) =>
        // A motif is about a position, not about playing or facing an opening, so it passes either way.
        (filter.role === 'all' || roleOf(course) === 'motif' || roleOf(course) === filter.role) &&
        (filter.side === 'all' || course.side === filter.side),
    );
    if (kept.length === 0 || !matchesAll(needles, familyText(family, kept))) return [];
    return [{ family, courses: kept }];
  });
}

export type LineHit = { family: Family; course: OpeningIndexEntry; line: OpeningIndexEntry['lines'][number] };

/**
 * Variations that match a search, found in their own right: every word must appear in the variation's name, its course
 * or its opening. Nothing for an empty search. Plays-it lines come before lines against an opening.
 */
export function searchLines(views: FamilyView[], query: string, limit = 12): LineHit[] {
  const needles = words(query);
  if (needles.length === 0) return [];
  const hits: LineHit[] = [];
  for (const { family, courses } of views) {
    for (const course of courses) {
      for (const line of course.lines) {
        const text = [line.name, course.name, course.against ?? '', family.name, course.eco].join(' ').toLowerCase();
        if (matchesAll(needles, text)) hits.push({ family, course, line });
      }
    }
  }
  const exact = (hit: LineHit) => (hit.line.name.toLowerCase().includes(needles.join(' ')) ? 0 : 1);
  return hits.sort((a, b) => exact(a) - exact(b) || roleRank(a.course) - roleRank(b.course)).slice(0, limit);
}

/** Every variation of the given openings, as search hits, in listing order. */
export function allLines(views: FamilyView[]): LineHit[] {
  return views.flatMap(({ family, courses }) =>
    courses.flatMap((course) => course.lines.map((line) => ({ family, course, line }))),
  );
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
  /** The opening's own name matches, so nothing more needs saying. */
  | { kind: 'name' }
  /** Lines (or courses) inside it match by name. */
  | { kind: 'lines'; names: string[] }
  /** Only the description or the other text around it matches. */
  | { kind: 'text' };

/** Why an opening came up for a search: its name, lines inside it, or just its description. Undefined for no search. */
export function matchReason(view: FamilyView, query: string): MatchReason | undefined {
  const needles = words(query);
  if (needles.length === 0) return undefined;
  if (matchesAll(needles, view.family.name.toLowerCase())) return { kind: 'name' };
  const names = view.courses.flatMap((course) =>
    course.lines
      .filter((line) => matchesAll(needles, `${line.name} ${course.name}`.toLowerCase()))
      .map((line) => line.name),
  );
  return names.length > 0 ? { kind: 'lines', names: [...new Set(names)] } : { kind: 'text' };
}

/** Progress over a set of courses: how many cards are learned out of how many exist. */
export function familyProgress(
  courses: OpeningIndexEntry[],
  learned: Record<string, number>,
): { learned: number; total: number } {
  return {
    learned: courses.reduce((sum, course) => sum + (learned[course.id] ?? 0), 0),
    total: courses.reduce((sum, course) => sum + course.cards, 0),
  };
}
