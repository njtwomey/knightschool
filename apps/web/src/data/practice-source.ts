import type { OpeningIndexEntry, Weighting } from '@knightschool/core';

/** Where free practice draws from: the courses being learned, every course, or one course by id. */
export type PracticeSource = 'learning' | 'all' | (string & {});

/** The courses a source means. "Learning" is everything when nothing is enrolled yet, so it is never empty. */
export function coursesFor(source: PracticeSource, index: OpeningIndexEntry[], enrolled: string[]) {
  if (source === 'all') return index;
  if (source === 'learning') return enrolled.length ? index.filter((course) => enrolled.includes(course.id)) : index;
  return index.filter((course) => course.id === source);
}

/** A choice kept per device in localStorage, so a page opens the way it was left. */
export function savedChoice(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function saveChoice(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // the choice just will not be remembered
  }
}

/** A saved "random or popular" choice; anything unrecognised means random. */
export const savedWeighting = (key: string): Weighting =>
  savedChoice(key, 'random') === 'popular' ? 'popular' : 'random';
