import { entryId, entrySection, withSection } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type GroupSlice = Pick<AuthorState, 'setGroup' | 'renameGroup' | 'deleteGroup'>;

/** The groups a course's lines are listed in (course.yaml `section`). */
export function groupSlice({ get, save, courseOf, courseChange, titleOf }: SliceContext): GroupSlice {
  return {
    async setGroup(group, id) {
      const course = courseOf(get().courseId);
      const lineId = id ?? get().lineId;
      if (!course || !lineId) return;
      const name = group?.trim() || undefined;
      const lines = course.manifest.lines.map((entry) =>
        entryId(entry) === lineId ? withSection(entry, name) : entry,
      );
      await save(
        [courseChange({ ...course, manifest: { ...course.manifest, lines } })],
        name ? `Put the line in ${name}.` : 'Took the line out of its group.',
        false,
        name ? `put ${titleOf(lineId)} in group ${name}` : `take ${titleOf(lineId)} out of its group`,
      );
    },

    async renameGroup(from, to) {
      const course = courseOf(get().courseId);
      const name = to.trim();
      if (!course || !name || name === from) return;
      const lines = course.manifest.lines.map((entry) =>
        entrySection(entry) === from ? withSection(entry, name) : entry,
      );
      await save(
        [courseChange({ ...course, manifest: { ...course.manifest, lines } })],
        `Renamed ${from} to ${name}.`,
        false,
        `rename group ${from} to ${name}`,
      );
    },

    async deleteGroup(name) {
      const course = courseOf(get().courseId);
      if (!course) return;
      const lines = course.manifest.lines.map((entry) =>
        entrySection(entry) === name ? withSection(entry, undefined) : entry,
      );
      await save(
        [courseChange({ ...course, manifest: { ...course.manifest, lines } })],
        `Deleted the group ${name}; its lines are kept.`,
        true,
        `delete group ${name}`,
      );
    },
  };
}
