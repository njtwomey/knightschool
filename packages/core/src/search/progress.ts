import type { OpeningIndexEntry } from '../schema/content';
import { inStudyOrder } from './filter';

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
