import {
  appendMove,
  buildAuthored,
  chapterText,
  checkUnitOverrides,
  newChapter,
  opponentMove,
  overridesFromYaml,
  readContribution,
  CourseManifest,
  type Contribution,
  ownOpeningId,
  playSan,
  readChapter,
  setHeader,
  setMoveNote,
  slugify,
  startHeader,
  START_EPD,
  truncateMoves,
  uniqueId,
  type AuthoredBuild,
  type CourseEntry,
  type LineKind,
  type PgnGame,
  type Side,
  type TrapKind,
  type TreeLine,
} from '@knightschool/core';
import { create } from 'zustand';
import { loadAuthoredBuild, loadAuthoredRows, loadShippedChapters, type AuthoredRows } from '@/data/authored';
import { saveAuthored, undoAuthored, type AuthoredChangeInput } from '@/data/authoring';
import { reminderToExport } from '@/data/backup';
import { loadShippedIndex } from '@/data/content';
import { whenStorageReady } from '@/data/storage';

/** A course as the editor holds it: its id and its course.yaml, lines as entries. */
export type DraftCourse = { id: string; manifest: CourseManifest & { lines: CourseEntry[] } };

export type AuthorState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  rows: AuthoredRows;
  build: AuthoredBuild | null;
  /** Shipped course ids, so an authored id never takes one. */
  shippedCourses: string[];
  courseId: string | null;
  lineId: string | null;
  /** The position looked at in the line: how many of its moves (from the start) are played. */
  ply: number;
  /** Set after "Branch": the next move played starts a new line from this ply. */
  branching: number | null;
  /** What just happened, with an undo offer after a change that removed something. */
  message: { text: string; undo: boolean; error?: boolean } | null;
  reminder: { edits: number; days: number } | null;

  load: () => Promise<void>;
  selectCourse: (id: string | null) => void;
  selectLine: (id: string | null) => void;
  setPly: (ply: number) => void;
  startBranch: () => void;
  cancelBranch: () => void;
  /**
   * A new course: of its own ("My courses") unless `opening` names an opening of the app it adds to. `from` is a line of
   * the app to carry on from: the course's first line then starts where that line ends.
   */
  createCourse: (input: { name: string; side: Side; opening?: string; eco?: string; from?: string }) => Promise<void>;
  createLine: () => Promise<void>;
  /** A move on the board: the next move of the line, a new move at its end, or the first move of a branch. */
  playMove: (uci: string) => Promise<void>;
  truncate: () => Promise<void>;
  setNote: (comment: string, tags: string[]) => Promise<void>;
  setLineMeta: (meta: { title: string; description: string; kind: LineKind | TrapKind }) => Promise<void>;
  setSnapshot: (ply: number | undefined) => Promise<void>;
  setGroup: (group: string | undefined) => Promise<void>;
  renameGroup: (from: string, to: string) => Promise<void>;
  deleteGroup: (name: string) => Promise<void>;
  deleteLine: () => Promise<void>;
  deleteCourse: () => Promise<void>;
  setCourseMeta: (
    meta: Partial<Pick<CourseManifest, 'name' | 'summary' | 'opening' | 'about' | 'plans'>>,
  ) => Promise<void>;
  /** Returns an error message, or null when the overrides were saved. */
  setOverrides: (yaml: string) => Promise<string | null>;
  undo: () => Promise<void>;
  /** The contribution for a course: its course.yaml and the authored chapters it needs. Throws when it is not valid. */
  contribution: (courseId: string) => Contribution;
  /** Saves a contribution's chapters and course (replacing any of yours with the same ids; Undo restores them). */
  importContribution: (text: string) => Promise<string | null>;
};

const entryId = (entry: CourseEntry) => (typeof entry === 'string' ? entry : entry.id);
const entrySection = (entry: CourseEntry) => (typeof entry === 'string' ? undefined : entry.section);
const withSection = (entry: CourseEntry, section: string | undefined): CourseEntry => {
  const next: Record<string, unknown> = typeof entry === 'string' ? { id: entry } : { ...entry };
  delete next.section;
  if (section) next.section = section;
  // A plain id when nothing else is said of the line.
  const said = Object.keys(next).filter((key) => key !== 'id' && !(key === 'alternative' && next[key] === false));
  return said.length === 0 ? (next.id as string) : (next as CourseEntry);
};
const moveText = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'}${san}`;

/** The live authored courses, parsed loosely: one that does not parse is shown as a problem by the build instead. */
export function draftCourses(rows: AuthoredRows): DraftCourse[] {
  return rows.courses
    .filter((row) => !row.deletedAt)
    .flatMap((row) => {
      try {
        const manifest = JSON.parse(row.manifest) as DraftCourse['manifest'];
        return [{ id: row.id, manifest: { ...manifest, lines: manifest.lines ?? [] } }];
      } catch {
        return [];
      }
    });
}

/** A live authored chapter as a game, or undefined. */
export function draftChapter(rows: AuthoredRows, id: string): PgnGame | undefined {
  const row = rows.chapters.find((candidate) => candidate.id === id && !candidate.deletedAt);
  if (!row) return undefined;
  try {
    return readChapter(row.pgn, id);
  } catch {
    return undefined;
  }
}

/** The line as the tree holds it: every move from the start, where the chapter's own moves begin, and its ancestors. */
export function fullLine(build: AuthoredBuild | null, id: string | null): TreeLine | undefined {
  return id ? build?.tree.lines.get(id) : undefined;
}

/** The positions along a line: the start, then after each move. */
export function positionsOf(line: TreeLine | undefined): string[] {
  const positions = [START_EPD];
  for (const move of line?.game.moves ?? []) positions.push(playSan(positions.at(-1)!, move.san).epd);
  return positions;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const useAuthor = create<AuthorState>((set, get) => {
  /** Saves an action, reloads, and refreshes the rest of the app (courses, the open course). */
  async function save(changes: AuthoredChangeInput[], message: string, undo = false) {
    try {
      await saveAuthored(changes);
      await get().load();
      set({ message: { text: message, undo } });
      const { useBrowse } = await import('@/features/browse/store');
      void useBrowse.getState().reload();
    } catch (error) {
      set({ message: { text: errorText(error), undo: false, error: true } });
    }
  }
  const courseOf = (id: string | null) => draftCourses(get().rows).find((course) => course.id === id);
  const courseChange = (course: DraftCourse): AuthoredChangeInput => ({
    kind: 'course',
    itemId: course.id,
    body: JSON.stringify(course.manifest),
  });
  const takenIds = () =>
    new Set([
      ...get().shippedCourses,
      ...get().rows.courses.map((row) => row.id),
      ...get().rows.chapters.map((row) => row.id),
      ...(get().build ? [...get().build!.tree.lines.keys()] : []),
    ]);
  /** The chapter change that writes a game, with its [Opponent] worked out from its moves. */
  function chapterChange(
    id: string,
    game: PgnGame,
    startPly: number,
    prefix: string[],
    side: Side,
  ): AuthoredChangeInput {
    const sans = [...prefix, ...game.moves.map((move) => move.san)];
    const written = setHeader(game, 'Opponent', opponentMove(sans, startPly, side));
    return { kind: 'chapter', itemId: id, body: chapterText(written, startPly) };
  }
  const prefixOf = (line: TreeLine) => line.game.moves.slice(0, line.startPly).map((move) => move.san);

  return {
    status: 'idle',
    error: null,
    rows: { chapters: [], courses: [] },
    build: null,
    shippedCourses: [],
    courseId: null,
    lineId: null,
    ply: 0,
    branching: null,
    message: null,
    reminder: null,

    async load() {
      if (get().status === 'idle') set({ status: 'loading' });
      try {
        const shipped = (await loadShippedIndex()).map((entry) => entry.id);
        const rows = await loadAuthoredRows();
        const build = await loadAuthoredBuild(async () => shipped);
        const { storage } = await whenStorageReady();
        const reminder = await reminderToExport(storage);
        set({ rows, build, shippedCourses: shipped, reminder, status: 'ready', error: null });
        // Keep the selection valid after an undo or a delete.
        const courses = draftCourses(rows);
        const course = courses.find((candidate) => candidate.id === get().courseId) ?? courses[0];
        const lines = course?.manifest.lines.map(entryId) ?? [];
        const lineId = lines.includes(get().lineId ?? '') ? get().lineId : (lines[0] ?? null);
        const line = fullLine(build, lineId);
        set({
          courseId: course?.id ?? null,
          lineId,
          ply: Math.min(get().ply, line?.game.moves.length ?? 0),
        });
      } catch (error) {
        set({ status: 'error', error: errorText(error) });
      }
    },

    selectCourse(id) {
      const course = courseOf(id);
      const lineId = course?.manifest.lines.map(entryId)[0] ?? null;
      set({ courseId: id, lineId, ply: fullLine(get().build, lineId)?.game.moves.length ?? 0, branching: null });
    },
    selectLine(id) {
      set({ lineId: id, ply: fullLine(get().build, id)?.game.moves.length ?? 0, branching: null });
    },
    setPly(ply) {
      const length = fullLine(get().build, get().lineId)?.game.moves.length ?? 0;
      set({ ply: Math.max(0, Math.min(ply, length)) });
    },
    startBranch: () => set({ branching: get().ply, message: null }),
    cancelBranch: () => set({ branching: null }),

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
      await save(
        [
          { kind: 'chapter', itemId: lineId, body: chapterText(setHeader(chapter, 'Opponent', 'any move'), startPly) },
          { kind: 'course', itemId: id, body: JSON.stringify(manifest) },
        ],
        `Made the course ${manifest.name}. Play its main line on the board.`,
      );
      set({ courseId: id, lineId, ply: startPly });
    },

    async createLine() {
      const course = courseOf(get().courseId);
      if (!course) return;
      const lineId = uniqueId(`${course.id}-line`, takenIds());
      const title = `Line ${course.manifest.lines.length + 1}`;
      const chapter = newChapter({
        title,
        opening: course.manifest.name,
        eco: course.manifest.eco ?? '',
        side: course.manifest.side,
        kind: 'sideline',
      });
      await save(
        [
          { kind: 'chapter', itemId: lineId, body: chapterText(setHeader(chapter, 'Opponent', 'any move'), 0) },
          courseChange({ ...course, manifest: { ...course.manifest, lines: [...course.manifest.lines, lineId] } }),
        ],
        `Made ${title}, from the start.`,
      );
      set({ lineId, ply: 0 });
    },

    async playMove(uci) {
      const { build, lineId, ply, branching } = get();
      const line = fullLine(build, lineId);
      const course = courseOf(get().courseId);
      if (!line || !course || !lineId) return;
      const positions = positionsOf(line);
      const from = positions[branching ?? ply]!;
      let san: string;
      try {
        san = playSan(from, uci).move.san;
      } catch {
        return;
      }
      const side = course.manifest.side;

      if (branching !== null) {
        // A new line from here: its [Start] names the chapter that writes the move before (none at the start).
        const chain = [...line.parents, line.id];
        const owner =
          branching === 0
            ? undefined
            : [...chain].reverse().find((id) => (build!.tree.lines.get(id)?.startPly ?? Infinity) <= branching - 1);
        const ownerLine = owner ? build!.tree.lines.get(owner)! : undefined;
        const start = ownerLine
          ? startHeader(
              { tags: ownerLine.game.tags, moves: ownerLine.game.moves.slice(ownerLine.startPly) },
              ownerLine.id,
              ownerLine.startPly,
              branching - 1,
            )
          : undefined;
        const title = `${line.game.tags.Variation ?? 'Line'}, ${moveText(branching, san)}`;
        const id = uniqueId(slugify(`${course.id} ${moveText(branching, san)}`), takenIds());
        const chapter = appendMove(
          newChapter({
            title,
            opening: course.manifest.name,
            eco: line.game.tags.ECO ?? '',
            side,
            kind: 'sideline',
            start,
          }),
          from,
          san,
        );
        const prefix = line.game.moves.slice(0, branching).map((move) => move.san);
        const lines = course.manifest.lines;
        const at = lines.findIndex((entry) => entryId(entry) === lineId);
        // A second answer at a position where you move is shown and playable but not drilled, as in shipped courses:
        // a course holds one answer per position.
        const second = branching % 2 === (side === 'white' ? 0 : 1);
        const listed = withSection(id, entrySection(lines[at]!));
        const entry: CourseEntry = second
          ? { ...(typeof listed === 'string' ? { id: listed } : listed), alternative: true }
          : listed;
        await save(
          [
            chapterChange(id, chapter, branching, prefix, side),
            courseChange({
              ...course,
              manifest: { ...course.manifest, lines: [...lines.slice(0, at + 1), entry, ...lines.slice(at + 1)] },
            }),
          ],
          second
            ? `Made a new line, ${title}: a second answer to a position, so it is shown but not drilled. Carry on playing it.`
            : `Made a new line, ${title}. Carry on playing it.`,
        );
        set({ lineId: id, ply: branching + 1, branching: null });
        return;
      }

      const moves = line.game.moves;
      if (ply < moves.length) {
        // Playing the line's own next move steps along it; another move needs a branch.
        if (playSan(from, moves[ply]!.san).uci === playSan(from, san).uci) set({ ply: ply + 1 });
        else set({ message: { text: 'That leaves the line. To play it, choose Branch here first.', undo: false } });
        return;
      }
      const own = draftChapter(get().rows, lineId);
      if (!own) {
        set({ message: { text: 'This line is not yours to change.', undo: false, error: true } });
        return;
      }
      await save(
        [chapterChange(lineId, appendMove(own, from, san), line.startPly, prefixOf(line), side)],
        `Played ${moveText(ply, san)}.`,
      );
      set({ ply: ply + 1 });
    },

    async truncate() {
      const { build, lineId, ply } = get();
      const line = fullLine(build, lineId);
      const own = lineId ? draftChapter(get().rows, lineId) : undefined;
      const course = courseOf(get().courseId);
      if (!line || !own || !lineId || !course) return;
      const keep = Math.max(0, ply - line.startPly);
      await save(
        [chapterChange(lineId, truncateMoves(own, keep), line.startPly, prefixOf(line), course.manifest.side)],
        `Deleted the moves after this position.`,
        true,
      );
    },

    async setNote(comment, tags) {
      const { build, lineId, ply } = get();
      const line = fullLine(build, lineId);
      const own = lineId ? draftChapter(get().rows, lineId) : undefined;
      if (!line || !own || !lineId || ply === 0) return;
      const index = ply - 1 - line.startPly;
      if (index < 0) return;
      await save(
        [
          {
            kind: 'chapter',
            itemId: lineId,
            body: chapterText(setMoveNote(own, index, { comment, tags }), line.startPly),
          },
        ],
        'Saved the note.',
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
      await save([{ kind: 'chapter', itemId: lineId, body: chapterText(game, line.startPly) }], 'Saved the line.');
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
      );
    },

    async setGroup(group) {
      const course = courseOf(get().courseId);
      const { lineId } = get();
      if (!course || !lineId) return;
      const name = group?.trim() || undefined;
      const lines = course.manifest.lines.map((entry) =>
        entryId(entry) === lineId ? withSection(entry, name) : entry,
      );
      await save(
        [courseChange({ ...course, manifest: { ...course.manifest, lines } })],
        name ? `Put the line in ${name}.` : 'Took the line out of its group.',
      );
    },

    async renameGroup(from, to) {
      const course = courseOf(get().courseId);
      const name = to.trim();
      if (!course || !name || name === from) return;
      const lines = course.manifest.lines.map((entry) =>
        entrySection(entry) === from ? withSection(entry, name) : entry,
      );
      await save([courseChange({ ...course, manifest: { ...course.manifest, lines } })], `Renamed ${from} to ${name}.`);
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
      );
    },

    async deleteLine() {
      const course = courseOf(get().courseId);
      const { lineId, build } = get();
      if (!course || !lineId) return;
      // The lines that grow from it go too, or they would have nothing to grow from.
      const doomed = new Set([lineId, ...descendants(build, lineId)].filter((id) => draftChapter(get().rows, id)));
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
      );
    },

    async deleteCourse() {
      const course = courseOf(get().courseId);
      if (!course) return;
      // Its chapters go too, unless another course of yours lists them.
      const listedElsewhere = new Set(
        draftCourses(get().rows)
          .filter((other) => other.id !== course.id)
          .flatMap((other) => other.manifest.lines.map(entryId)),
      );
      const chapters = course.manifest.lines
        .map(entryId)
        .filter((id) => !listedElsewhere.has(id) && draftChapter(get().rows, id));
      await save(
        [
          { kind: 'course', itemId: course.id, body: null },
          ...chapters.map((id): AuthoredChangeInput => ({ kind: 'chapter', itemId: id, body: null })),
        ],
        `Deleted the course ${course.manifest.name}.`,
        true,
      );
    },

    async setCourseMeta(meta) {
      const course = courseOf(get().courseId);
      if (!course) return;
      await save([courseChange({ ...course, manifest: { ...course.manifest, ...meta } })], 'Saved the course.');
    },

    async setOverrides(yaml) {
      const course = courseOf(get().courseId);
      if (!course) return 'No course is open.';
      let units;
      try {
        units = overridesFromYaml(yaml);
        const content = get().build?.courses.find((candidate) => candidate.opening.id === course.id);
        if (units && content) checkUnitOverrides({ ...content, opening: { ...content.opening, units } });
      } catch (error) {
        return errorText(error);
      }
      const manifest = { ...course.manifest };
      delete manifest.units;
      if (units) manifest.units = units;
      await save([courseChange({ ...course, manifest })], 'Saved the path changes.');
      return null;
    },

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
      await save(
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
      );
      get().selectCourse(read.courseId);
      return null;
    },

    async undo() {
      try {
        const undone = await undoAuthored();
        await get().load();
        set({ message: { text: undone ? 'Undone.' : 'There is nothing to undo.', undo: false } });
        const { useBrowse } = await import('@/features/browse/store');
        void useBrowse.getState().reload();
      } catch (error) {
        set({ message: { text: errorText(error), undo: false, error: true } });
      }
    },
  };
});

/** Every line that grows from a line, however deep. */
function descendants(build: AuthoredBuild | null, id: string): string[] {
  if (!build) return [];
  return [...build.tree.lines.values()].filter((line) => line.parents.includes(id)).map((line) => line.id);
}
