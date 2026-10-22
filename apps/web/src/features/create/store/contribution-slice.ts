import { type Contribution, CourseManifest, readContribution } from '@knightschool/core';
import type { AuthoredChangeInput } from '@/data/authored-edits';
import { errorText } from '@/lib/errors';
import { draftChapter, entryId, fullLine } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type ContributionSlice = Pick<AuthorState, 'contribution' | 'importContribution'>;

/** A course as a contribution (Publish) and a contribution read back into your courses (Import). */
export function contributionSlice({ get, save, courseOf }: SliceContext): ContributionSlice {
  return {
    contribution(courseId) {
      const course = courseOf(courseId);
      if (!course) throw new Error('There is no such course of yours.');
      const manifest = CourseManifest.safeParse(course.manifest);
      if (!manifest.success)
        throw new Error(
          `The course is not complete yet: ${manifest.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
        );
      // The authored chapters it lists, with the authored chapters they grow from, parents first.
      const { rows, build } = get();
      const ids: string[] = [];
      for (const entry of course.manifest.lines) {
        const id = entryId(entry);
        for (const chapter of [...(fullLine(build, id)?.parents ?? []), id])
          if (!ids.includes(chapter) && draftChapter(rows, chapter)) ids.push(chapter);
      }
      const chapters = ids.map((id) => ({
        id,
        pgn: rows.chapters.find((row) => row.id === id && !row.deletedAt)!.pgn,
      }));
      return { courseId, manifest: manifest.data, chapters };
    },

    async importContribution(text) {
      let read: Contribution;
      try {
        read = readContribution(text);
      } catch (error) {
        return errorText(error);
      }
      if (get().shippedCourses.includes(read.courseId))
        return `The course id "${read.courseId}" is already a course of the app.`;
      const saved = await save(
        [
          ...read.chapters.map((chapter): AuthoredChangeInput => ({
            kind: 'chapter',
            itemId: chapter.id,
            body: chapter.pgn,
          })),
          { kind: 'course', itemId: read.courseId, body: JSON.stringify(read.manifest) },
        ],
        `Imported ${read.manifest.name}, with ${read.chapters.length} ${read.chapters.length === 1 ? 'line' : 'lines'}.`,
        true,
        `import ${read.manifest.name}`,
      );
      if (!saved) return get().message?.text ?? 'The contribution was not saved.';
      get().selectCourse(read.courseId);
      return null;
    },
  };
}
