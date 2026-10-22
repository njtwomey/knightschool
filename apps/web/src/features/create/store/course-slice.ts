import {
  buildAuthored,
  chapterText,
  type CourseEntry,
  isOwnOpening,
  newChapter,
  ownOpeningId,
  setHeader,
  slugify,
  startHeader,
  uniqueId,
} from '@knightschool/core';
import { loadShippedChapters } from '@/data/authored-content';
import type { AuthoredChangeInput } from '@/data/authored-edits';
import { draftChapter, draftCourses, entryId, fullLine, type DraftCourse } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type CourseSlice = Pick<AuthorState, 'createCourse' | 'duplicateCourse' | 'deleteCourse' | 'setSide' | 'setCourseMeta'>;

/** Making, copying, deleting and describing a course. */
export function courseSlice({ set, get, save, courseOf, courseChange, takenIds }: SliceContext): CourseSlice {
  return {
    async createCourse({ name, side, opening, eco, from }) {
      const id = uniqueId(slugify(name), takenIds());
      const lineId = uniqueId(`${id}-main`, new Set([...takenIds(), id]));
      const manifest: DraftCourse['manifest'] = {
        name: name.trim() || 'My course',
        side,
        opening: opening ?? ownOpeningId(side),
        tier: 1,
        trigger: '',
        summary: `${name.trim() || 'My course'}: lines written in Knight School.`,
        about: { idea: 'Not written yet.', risks: 'Not written yet.', suits: 'Not written yet.' },
        plans: [],
        motifs: [],
        tags: [],
        lines: [lineId],
      };
      // Carrying on from a line of the app: the first line's [Start] is that line's last move.
      let start: string | undefined;
      let startPly = 0;
      let title = 'Main line';
      if (from) {
        const tree =
          get().build?.tree ?? buildAuthored(await loadShippedChapters(), { chapters: [], courses: [] }).tree;
        const line = tree.lines.get(from);
        if (line && line.game.moves.length > line.startPly) {
          startPly = line.game.moves.length;
          start = startHeader(
            { tags: line.game.tags, moves: line.game.moves.slice(line.startPly) },
            line.id,
            line.startPly,
            startPly - 1,
          );
          title = `${line.game.tags.Variation ?? from}, continued`;
        }
      }
      const chapter = newChapter({ title, opening: name, eco: eco ?? '', side, kind: 'main', start });
      const saved = await save(
        [
          { kind: 'chapter', itemId: lineId, body: chapterText(setHeader(chapter, 'Opponent', 'any move'), startPly) },
          { kind: 'course', itemId: id, body: JSON.stringify(manifest) },
        ],
        `Made the course ${manifest.name}. Play its main line on the board.`,
        false,
        `make course ${manifest.name}`,
      );
      if (!saved) return null;
      set({ courseId: id, lineId, ply: startPly });
      return id;
    },

    async duplicateCourse(id) {
      const course = courseOf(id);
      if (!course) return null;
      const taken = takenIds();
      const copyId = uniqueId(`${id}-copy`, taken);
      taken.add(copyId);
      // Each line of yours gets a copy, and a copied branch grows from the copy of its parent.
      const renamed = new Map<string, string>();
      for (const line of course.manifest.lines.map(entryId))
        if (draftChapter(get().rows, line)) {
          const next = uniqueId(`${line}-copy`, taken);
          taken.add(next);
          renamed.set(line, next);
        }
      const chapters = [...renamed].map(([from, to]): AuthoredChangeInput => {
        const line = fullLine(get().build, from);
        let game = draftChapter(get().rows, from)!;
        const start = game.tags.Start;
        const parent = start?.split(' ')[0];
        if (start && parent && renamed.has(parent))
          game = setHeader(game, 'Start', `${renamed.get(parent)}${start.slice(parent.length)}`);
        return { kind: 'chapter', itemId: to, body: chapterText(game, line?.startPly ?? 0) };
      });
      const lines = course.manifest.lines.map((entry): CourseEntry => {
        const to = renamed.get(entryId(entry));
        if (!to) return entry;
        return typeof entry === 'string' ? to : { ...entry, id: to };
      });
      const manifest = { ...course.manifest, name: `${course.manifest.name} (copy)`, lines };
      if (manifest.units) {
        const unit = (unitId: string) => {
          const [line, n] = [unitId.slice(0, unitId.lastIndexOf(':')), unitId.slice(unitId.lastIndexOf(':'))];
          return `${renamed.get(line) ?? line}${n}`;
        };
        const map = (record: Record<string, string[]>) =>
          Object.fromEntries(Object.entries(record).map(([key, ids]) => [unit(key), ids.map(unit)]));
        manifest.units = {
          order: manifest.units.order.map(unit),
          after: map(manifest.units.after),
          drop: map(manifest.units.drop),
        };
      }
      const saved = await save(
        [...chapters, { kind: 'course', itemId: copyId, body: JSON.stringify(manifest) }],
        `Made a copy of the course, ${manifest.name}.`,
        false,
        `copy course ${course.manifest.name}`,
      );
      return saved ? copyId : null;
    },

    async deleteCourse(id) {
      const course = courseOf(id ?? get().courseId);
      if (!course) return;
      // Its chapters go too, unless another course of yours lists them or a line it lists grows from them.
      const neededElsewhere = new Set(
        draftCourses(get().rows)
          .filter((other) => other.id !== course.id)
          .flatMap((other) => other.manifest.lines.map(entryId))
          .flatMap((line) => [line, ...(fullLine(get().build, line)?.parents ?? [])]),
      );
      const chapters = course.manifest.lines
        .map(entryId)
        .filter((id) => !neededElsewhere.has(id) && draftChapter(get().rows, id));
      await save(
        [
          { kind: 'course', itemId: course.id, body: null },
          ...chapters.map((id): AuthoredChangeInput => ({ kind: 'chapter', itemId: id, body: null })),
        ],
        `Deleted the course ${course.manifest.name}.`,
        true,
        `delete course ${course.manifest.name}`,
      );
    },

    async setSide(side) {
      const course = courseOf(get().courseId);
      if (!course || course.manifest.side === side) return;
      const ids = course.manifest.lines.map(entryId);
      const played = ids.some((id) => {
        const line = fullLine(get().build, id);
        return line && line.game.moves.length > line.startPly;
      });
      if (played) {
        set({ message: { text: 'The side is fixed once a line has moves.', undo: false, error: true } });
        return;
      }
      const opening = isOwnOpening(course.manifest.opening) ? ownOpeningId(side) : course.manifest.opening;
      const chapters = ids.flatMap((id): AuthoredChangeInput[] => {
        const own = draftChapter(get().rows, id);
        const line = fullLine(get().build, id);
        return own
          ? [{ kind: 'chapter', itemId: id, body: chapterText(setHeader(own, 'For', side), line?.startPly ?? 0) }]
          : [];
      });
      await save(
        [...chapters, courseChange({ ...course, manifest: { ...course.manifest, side, opening } })],
        `You now play ${side} in this course.`,
        false,
        `play ${side} in the course`,
      );
    },

    async setCourseMeta(meta) {
      const course = courseOf(get().courseId);
      if (!course) return;
      // Name what changed: a rename alone says so.
      const changed = Object.entries(meta).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(course.manifest[key as keyof typeof course.manifest]),
      );
      const label =
        changed.length === 1 && changed[0]![0] === 'name'
          ? `rename course ${course.manifest.name} to ${meta.name}`
          : `edit the details of course ${course.manifest.name}`;
      await save(
        [courseChange({ ...course, manifest: { ...course.manifest, ...meta } })],
        'Saved the course.',
        false,
        label,
      );
    },
  };
}
