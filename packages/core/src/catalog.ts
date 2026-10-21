import { plainText } from './rich-text';
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

/**
 * Lowercase, accents and apostrophes dropped ("Queen's" and "Queens" read alike), and hyphens and other punctuation
 * turned into spaces ("Caro-Kann" and "caro kann" read alike). Dots stay so a move such as "3.e5" can be searched.
 */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019`]/g, '')
    .replace(/[-_,:;()/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (text: string) => fold(text).split(' ').filter(Boolean);
/** A search word is found as typed, or without a plural s ("queens" still finds "queen"). */
const exactly = (needle: string, haystack: string) =>
  haystack.includes(needle) || (needle.length > 3 && needle.endsWith('s') && haystack.includes(needle.slice(0, -1)));

/** Edit distance counting a swap of two neighbouring letters as one edit; gives up (returns max + 1) past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2]! + 1);
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    before = previous;
    previous = row;
  }
  return previous[b.length]!;
}

/** How many typing slips a search word may have: none for short words, one from five letters, two from eight. */
const slips = (needle: string) => (needle.length >= 8 ? 2 : needle.length >= 5 ? 1 : 0);

/**
 * A search word found with some forgiveness, for when it is not there as typed: run together ("carokann" finds
 * "Caro-Kann"), or within a slip or two of a word, the start of a word, or two or three words joined ("scandanavian",
 * "evens gambit", "carokan").
 */
function nearly(needle: string, haystack: string): boolean {
  if (needle.length >= 4 && haystack.replace(/ /g, '').includes(needle)) return true;
  const max = slips(needle);
  if (max === 0) return false;
  const parts = haystack.split(' ');
  for (let i = 0; i < parts.length; i++) {
    let joined = '';
    for (let k = i; k < Math.min(i + 3, parts.length); k++) {
      joined += parts[k];
      if (joined.length < needle.length - max) continue;
      for (let length = needle.length - max; length <= needle.length + max; length++) {
        if (length > joined.length) break;
        if (editDistance(needle, joined.slice(0, length), max) <= max) return true;
      }
    }
  }
  return false;
}

const found = (needle: string, haystack: string) => exactly(needle, haystack) || nearly(needle, haystack);
/**
 * Every word found, or the words run together found with forgiveness: "karo kann" reads as "karokann", one slip from
 * "Caro-Kann", although each half is too short to forgive on its own.
 */
const matchesAll = (needles: string[], haystack: string) =>
  needles.every((needle) => found(needle, haystack)) || (needles.length > 1 && nearly(needles.join(''), haystack));
const matchesExactly = (needles: string[], haystack: string) => needles.every((needle) => exactly(needle, haystack));

/** Whether every word of a search is found in some text, with the same forgiveness as the course search. */
export const matchesText = (query: string, text: string) => matchesAll(words(query), fold(text));

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

/**
 * How well something matches a search, so results can be ordered: a name match is worth a lot (the whole name most, then
 * a name that starts with it, then one that has every word), and a match only in the surrounding text (summary, course
 * and line names) is worth a little. Zero means no match; an empty search matches everything equally.
 */
export function relevance(name: string, content: string, query: string): number {
  const needles = words(query);
  if (needles.length === 0) return 1;
  const typed = needles.join(' ');
  const lower = fold(name);
  const nameWords = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const isNameWord = (needle: string) =>
    nameWords.has(needle) || (needle.length > 3 && needle.endsWith('s') && nameWords.has(needle.slice(0, -1)));
  if (lower === typed) return 100;
  if (lower.startsWith(typed)) return 80;
  if (needles.every(isNameWord)) return 60;
  if (matchesExactly(needles, lower)) return 50;
  if (matchesAll(needles, lower)) return 40; // the name, allowing for slips and words run together
  const text = `${lower} ${fold(content)}`;
  if (matchesExactly(needles, text)) return 20;
  const hits = needles.filter((needle) => found(needle, text)).length;
  if (hits === needles.length) return 15;
  return hits > 0 && needles.length > 1 ? 5 * (hits / needles.length) : 0;
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
