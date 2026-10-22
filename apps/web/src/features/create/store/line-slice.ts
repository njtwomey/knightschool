import { chapterText, type CourseEntry, newChapter, numberedMove, setHeader, uniqueId } from '@knightschool/core';
import type { AuthoredChangeInput } from '@/data/authored-edits';
import { descendants, draftChapter, draftCourses, entryId, fullLine } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type LineSlice = Pick<
  AuthorState,
  'createLine' | 'renameLine' | 'duplicateLine' | 'deleteLine' | 'setLineMeta' | 'setSnapshot'
>;

/** Making, copying, deleting and describing a line of the open course. */
export function lineSlice({ set, get, save, courseOf, courseChange, takenIds, titleOf }: SliceContext): LineSlice {
  return {
    async createLine() {
      const course = courseOf(get().courseId);
      if (!course) return null;
      const lineId = uniqueId(`${course.id}-line`, takenIds());
      const title = `Line ${course.manifest.lines.length + 1}`;
      const chapter = newChapter({
        title,
        opening: course.manifest.name,
        eco: course.manifest.eco ?? '',
        side: course.manifest.side,
        kind: 'sideline',
      });
      const saved = await save(
        [
          { kind: 'chapter', itemId: lineId, body: chapterText(setHeader(chapter, 'Opponent', 'any move'), 0) },
          courseChange({ ...course, manifest: { ...course.manifest, lines: [...course.manifest.lines, lineId] } }),
        ],
        `Made ${title}, from the start.`,
        false,
        `make line ${title}`,
      );
      if (!saved) return null;
      set({ lineId, ply: 0 });
      return lineId;
    },

    async renameLine(id, title) {
      const line = fullLine(get().build, id);
      const own = draftChapter(get().rows, id);
      const name = title.trim();
      if (!line || !own || !name) return;
      await save(
        [{ kind: 'chapter', itemId: id, body: chapterText(setHeader(own, 'Variation', name), line.startPly) }],
        `Renamed the line ${name}.`,
        false,
        `rename line ${own.tags.Variation ?? id} to ${name}`,
      );
    },

    async duplicateLine(id) {
      const course = courseOf(get().courseId);
      const line = fullLine(get().build, id);
      const own = draftChapter(get().rows, id);
      if (!course || !line || !own) return null;
      const copy = uniqueId(`${id}-copy`, takenIds());
      const title = `${own.tags.Variation ?? id} (copy)`;
      const lines = course.manifest.lines;
      const at = lines.findIndex((entry) => entryId(entry) === id);
      const original = lines[at]!;
      const entry: CourseEntry = typeof original === 'string' ? copy : { ...original, id: copy };
      const saved = await save(
        [
          { kind: 'chapter', itemId: copy, body: chapterText(setHeader(own, 'Variation', title), line.startPly) },
          courseChange({
            ...course,
            manifest: { ...course.manifest, lines: [...lines.slice(0, at + 1), entry, ...lines.slice(at + 1)] },
          }),
        ],
        `Made a copy of the line, ${title}.`,
        false,
        `copy line ${own.tags.Variation ?? id}`,
      );
      return saved ? copy : null;
    },

    async deleteLine(id) {
      const course = courseOf(get().courseId);
      const { build } = get();
      const lineId = id ?? get().lineId;
      if (!course || !lineId) return;
      // The lines that grow from it go too, or they would have nothing to grow from.
      const doomed = new Set(
        [lineId, ...descendants(build, lineId)].filter((candidate) => draftChapter(get().rows, candidate)),
      );
      const lines = course.manifest.lines.filter((entry) => !doomed.has(entryId(entry)));
      const others = draftCourses(get().rows)
        .filter((other) => other.id !== course.id && other.manifest.lines.some((entry) => doomed.has(entryId(entry))))
        .map((other) =>
          courseChange({
            ...other,
            manifest: { ...other.manifest, lines: other.manifest.lines.filter((entry) => !doomed.has(entryId(entry))) },
          }),
        );
      await save(
        [
          ...[...doomed].map((id): AuthoredChangeInput => ({ kind: 'chapter', itemId: id, body: null })),
          courseChange({ ...course, manifest: { ...course.manifest, lines } }),
          ...others,
        ],
        doomed.size > 1 ? `Deleted the line and ${doomed.size - 1} that grew from it.` : 'Deleted the line.',
        true,
        doomed.size > 1
          ? `delete line ${titleOf(lineId)} and ${doomed.size - 1} that grew from it`
          : `delete line ${titleOf(lineId)}`,
      );
    },

    async setLineMeta({ title, description, kind }) {
      const { build, lineId } = get();
      const line = fullLine(build, lineId);
      const own = lineId ? draftChapter(get().rows, lineId) : undefined;
      if (!line || !own || !lineId) return;
      let game = setHeader(own, 'Variation', title || 'Line');
      game = setHeader(game, 'Description', description);
      game = setHeader(game, 'Kind', kind);
      await save(
        [{ kind: 'chapter', itemId: lineId, body: chapterText(game, line.startPly) }],
        'Saved the line.',
        false,
        `edit the details of ${titleOf(lineId)}`,
      );
    },

    async setSnapshot(ply) {
      const { build, lineId } = get();
      const line = fullLine(build, lineId);
      const own = lineId ? draftChapter(get().rows, lineId) : undefined;
      if (!line || !own || !lineId) return;
      const game = setHeader(own, 'Snapshot', ply === undefined ? undefined : String(ply));
      await save(
        [{ kind: 'chapter', itemId: lineId, body: chapterText(game, line.startPly) }],
        ply === undefined ? 'The line is pictured at its end again.' : 'This position now pictures the line.',
        false,
        ply === undefined || ply === 0
          ? `picture ${titleOf(lineId)} at its end`
          : `picture ${titleOf(lineId)} after ${numberedMove(ply - 1, line.game.moves[ply - 1]!.san)}`,
      );
    },
  };
}
