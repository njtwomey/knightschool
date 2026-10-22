import type { OpeningIndexEntry } from '../schema/content';
import type { SearchIndex } from '../schema/search';

export type RelatedCourse = { course: OpeningIndexEntry; shared: number };

/**
 * Other courses that reach the same positions as this one, most shared first: the way to see an opening from the other
 * side (the Italian as White, and the Open Games as Black, meet on the same moves). `epds` are this course's positions,
 * and positions that every course starts with (the first move or two) do not count because `min` skips thin overlaps.
 */
export function relatedCourses(
  selfId: string,
  epds: string[],
  index: SearchIndex,
  courses: OpeningIndexEntry[],
  min = 4,
): RelatedCourse[] {
  const counts = new Map<string, number>();
  for (const epd of epds) {
    const seen = new Set<string>();
    for (const line of index[epd]?.lines ?? []) {
      if (line.course !== selfId && !seen.has(line.course)) {
        seen.add(line.course);
        counts.set(line.course, (counts.get(line.course) ?? 0) + 1);
      }
    }
  }
  return [...counts]
    .filter(([, shared]) => shared >= min)
    .flatMap(([id, shared]) => {
      const course = courses.find((candidate) => candidate.id === id);
      return course ? [{ course, shared }] : [];
    })
    .sort((a, b) => b.shared - a.shared || a.course.order - b.course.order);
}
