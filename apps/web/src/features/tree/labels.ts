import { chapterTitle, matchesText } from '@knightschool/core';
import type { TreeChapter } from './use-move-tree';

/** The opening a chapter belongs to, without its subvariation: "Caro-Kann Defence". */
export const familyOf = (chapter: Pick<TreeChapter, 'opening' | 'name'>) =>
  chapter.opening.split(':')[0]!.trim() || chapter.name;

/**
 * A name for a folded branch: the opening most of its lines belong to ("Caro-Kann Defence"), with "and more" when
 * some belong to another. Empty when none of the lines is known.
 */
export function branchName(lines: readonly string[], chapters: ReadonlyMap<string, TreeChapter>): string {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const chapter = chapters.get(line);
    if (chapter) counts.set(familyOf(chapter), (counts.get(familyOf(chapter)) ?? 0) + 1);
  }
  const [top] = [...counts].sort((a, b) => b[1] - a[1]);
  if (!top) return '';
  return counts.size > 1 ? `${top[0]} and more` : top[0];
}

/** The course to open a line in: the one asked for if it lists the line, otherwise the first that does. */
export const homeCourse = (chapter: Pick<TreeChapter, 'courses'>, prefer?: string): string | null =>
  prefer && chapter.courses.includes(prefer) ? prefer : (chapter.courses[0] ?? null);

/** Lines whose name, opening, id or courses (by name) contain every word of the search. */
export function matchingLines(
  query: string,
  chapters: Iterable<TreeChapter>,
  courseName: (id: string) => string = (id) => id,
): string[] {
  if (!query.trim()) return [];
  return [...chapters]
    .filter((chapter) =>
      matchesText(
        query,
        [chapterTitle(chapter), chapter.opening, chapter.id, ...chapter.courses.map(courseName)].join(' '),
      ),
    )
    .map((chapter) => chapter.id);
}
