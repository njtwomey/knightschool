import {
  appendMove,
  buildAuthored,
  chapterText,
  checkUnitOverrides,
  newChapter,
  opponentMove,
  projectCourse,
  unitOrderFor,
  fittingPlacements,
  courseUnits,
  type UnitOverrides,
  readContribution,
  CourseManifest,
  type Contribution,
  ownOpeningId,
  isOwnOpening,
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
  type AuthoredChange,
  type CourseEntry,
  type LineKind,
  type PgnGame,
  type Side,
  type TrapKind,
  type TreeLine,
} from '@knightschool/core';
import { undoTarget } from '@knightschool/storage';
import { create } from 'zustand';
import { loadAuthoredBuild, loadAuthoredRows, loadShippedChapters, type AuthoredRows } from '@/data/authored';
import { loadUndoLabels, saveAuthored, undoAuthored, type AuthoredChangeInput } from '@/data/authoring';
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
  /** What Undo would take back ("delete line 2...Bc5"), or null when there is nothing to undo. */
  undoLabel: string | null;

  load: () => Promise<void>;
  selectCourse: (id: string | null) => void;
  selectLine: (id: string | null) => void;
  /** Opens a course and a line from the address, keeping the position when it is the line already open. */
  open: (courseId: string, lineId?: string | null) => void;
  /** A message to show when the next page opens (`open`), such as how to branch. */
  hintNext: (text: string) => void;
  setPly: (ply: number) => void;
  startBranch: () => void;
  cancelBranch: () => void;
  /**
   * A new course: of its own ("My courses") unless `opening` names an opening of the app it adds to. `from` is a line of
   * the app to carry on from: the course's first line then starts where that line ends.
   */
  createCourse: (input: {
    name: string;
    side: Side;
    opening?: string;
    eco?: string;
    from?: string;
  }) => Promise<string | null>;
  /** A new line from the start, in the open course. Returns its id. */
  createLine: () => Promise<string | null>;
  renameLine: (id: string, title: string) => Promise<void>;
  /** A copy of a line, listed after it. Returns the copy's id. */
  duplicateLine: (id: string) => Promise<string | null>;
  /** A copy of a course with copies of its lines. Returns the copy's id. */
  duplicateCourse: (id: string) => Promise<string | null>;
  /** A move on the board: the next move of the line, a new move at its end, or the first move of a branch. */
  playMove: (uci: string) => Promise<void>;
  truncate: () => Promise<void>;
  setNote: (comment: string, tags: string[]) => Promise<void>;
  setLineMeta: (meta: { title: string; description: string; kind: LineKind | TrapKind }) => Promise<void>;
  setSnapshot: (ply: number | undefined) => Promise<void>;
  /** Puts a line (the open one by default) in a group, or none. */
  setGroup: (group: string | undefined, lineId?: string) => Promise<void>;
  renameGroup: (from: string, to: string) => Promise<void>;
  deleteGroup: (name: string) => Promise<void>;
  /** Changes the side the course is for, while none of its lines has a move yet. */
  setSide: (side: Side) => Promise<void>;
  /** Deletes a line (the open one by default) with the lines that grow from it. */
  deleteLine: (id?: string) => Promise<void>;
  /** Deletes a course (the open one by default) with its lines that no other course of yours lists. */
  deleteCourse: (id?: string) => Promise<void>;
  setCourseMeta: (
    meta: Partial<Pick<CourseManifest, 'name' | 'summary' | 'opening' | 'about' | 'plans' | 'tier' | 'motifs'>>,
  ) => Promise<void>;
  /**
   * Sets the study order: `path` lists the drilled lines in the order to study them, `bonus` the lines shown but not
   * needed (an alternative, or a trap to spring). Writes `lines:` in that order and a `units.order` that follows it as
   * far as prerequisites allow. Returns the build's problem instead of saving when the order does not fit.
   */
  setPath: (path: string[], bonus: string[]) => Promise<string | null>;
  /**
   * Shows a trap or quiz with a unit (`units.place`), or where it falls by itself when `unitId` is null or that unit.
   * Returns the build's problem instead of saving when it does not fit (a unit before the one that reaches it).
   */
  placeExtra: (item: string, unitId: string | null) => Promise<string | null>;
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

let pendingHint: string | null = null;

export const useAuthor = create<AuthorState>((set, get) => {
  /**
   * Saves an action under `label`, which Undo shows ("reorder the path"), reloads, and refreshes the rest of the app
   * (courses, the open course). False when nothing was saved (the message says why): the caller then stops.
   */
  async function save(changes: AuthoredChangeInput[], message: string, undo: boolean, label: string) {
    try {
      await saveAuthored(changes, label);
    } catch (error) {
      set({ message: { text: errorText(error), undo: false, error: true } });
      return false;
    }
    try {
      await get().load();
      set({ message: { text: message, undo } });
      const { useCatalog } = await import('@/data/catalog-store');
      void useCatalog.getState().reload();
    } catch (error) {
      set({ message: { text: errorText(error), undo: false, error: true } });
    }
    return true;
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
  /** A line's title, as its chapter says. */
  const titleOf = (id: string) =>
    fullLine(get().build, id)?.game.tags.Variation ?? draftChapter(get().rows, id)?.tags.Variation ?? id;
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
    undoLabel: null,

    async load() {
      if (get().status === 'idle') set({ status: 'loading' });
      try {
        const shipped = (await loadShippedIndex()).map((entry) => entry.id);
        const rows = await loadAuthoredRows();
        const build = await loadAuthoredBuild(async () => shipped);
        const { storage } = await whenStorageReady();
        const reminder = await reminderToExport(storage);
        const undoLabel = describeUndo(
          await storage.authoring.history(),
          rows,
          await loadUndoLabels(storage),
          await storage.authoring.importedGroups(),
        );
        set({ rows, build, shippedCourses: shipped, reminder, undoLabel, status: 'ready', error: null });
        // The pages choose the course and line from the address; keep the position inside the line.
        const line = fullLine(build, get().lineId);
        set({ ply: Math.min(get().ply, line?.game.moves.length ?? 0) });
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
    open(courseId, lineId = null) {
      if (get().courseId === courseId && get().lineId === lineId) return;
      set({
        courseId,
        lineId,
        ply: fullLine(get().build, lineId)?.game.moves.length ?? 0,
        branching: null,
        message: pendingHint ? { text: pendingHint, undo: false } : null,
      });
      pendingHint = null;
    },
    hintNext(text) {
      pendingHint = text;
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
        const saved = await save(
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
          false,
          `branch ${title}`,
        );
        if (saved) set({ lineId: id, ply: branching + 1, branching: null });
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
      const saved = await save(
        [chapterChange(lineId, appendMove(own, from, san), line.startPly, prefixOf(line), side)],
        `Played ${moveText(ply, san)}.`,
        false,
        `play ${moveText(ply, san)} in ${titleOf(lineId)}`,
      );
      if (saved) set({ ply: ply + 1 });
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
        `delete the moves of ${titleOf(lineId)} after ${ply > 0 ? moveText(ply - 1, line.game.moves[ply - 1]!.san) : 'the start'}`,
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
        false,
        `note ${moveText(ply - 1, line.game.moves[ply - 1]!.san)} in ${titleOf(lineId)}`,
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
          : `picture ${titleOf(lineId)} after ${moveText(ply - 1, line.game.moves[ply - 1]!.san)}`,
      );
    },

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

    async setPath(path, bonus) {
      const course = courseOf(get().courseId);
      const tree = get().build?.tree;
      if (!course || !tree) return 'No course is open.';
      const byId = new Map(course.manifest.lines.map((entry) => [entryId(entry), entry]));
      const content = get().build?.courses.find((candidate) => candidate.opening.id === course.id);
      // A trap we spring is a bonus by its kind already; anything else in the bonus is an alternative.
      const springs = (id: string) => {
        const variant = content?.opening.variants.find((candidate) => candidate.id === id);
        return (variant ? variant.whose : tree.lines.get(id)?.game.tags.Kind) === 'for-us';
      };
      const entry = (id: string, alternative: boolean): CourseEntry => {
        const old = byId.get(id) ?? id;
        const next: Record<string, unknown> = typeof old === 'string' ? { id: old } : { ...old };
        delete next.alternative;
        if (alternative && !springs(id)) next.alternative = true;
        return withSection(next as CourseEntry, entrySection(old));
      };
      const lines = [...path.map((id) => entry(id, false)), ...bonus.map((id) => entry(id, true))];
      // Projected without overrides first: an order that gives one position two answers fails here, as in the build.
      const manifest: DraftCourse['manifest'] = { ...course.manifest, lines };
      delete manifest.units;
      let projected;
      try {
        projected = projectCourse(course.id, CourseManifest.parse(manifest), tree);
      } catch (error) {
        return errorText(error);
      }
      const custom = course.manifest.units;
      const kept = { after: custom?.after ?? {}, drop: custom?.drop ?? {} };
      const order = unitOrderFor(projected, path, kept);
      // Placements of traps and quizzes stay where they still fit the new order.
      const ordered = { ...projected, opening: { ...projected.opening, units: { order: order ?? [], ...kept } } };
      const place = fittingPlacements(ordered, custom?.place ?? {});
      if (order || Object.keys(kept.after).length || Object.keys(kept.drop).length || Object.keys(place).length) {
        manifest.units = { order: order ?? [], ...kept, ...(Object.keys(place).length ? { place } : {}) };
        try {
          checkUnitOverrides({ ...projected, opening: { ...projected.opening, units: manifest.units } });
        } catch (error) {
          return errorText(error);
        }
      }
      // Name the change: a line moved to or from the bonus, else a new order.
      const wasBonus = (id: string) => {
        const old = byId.get(id);
        return springs(id) || (typeof old !== 'string' && Boolean(old?.alternative));
      };
      const toBonus = bonus.find((id) => !wasBonus(id));
      const toPath = path.find((id) => wasBonus(id));
      const label = toBonus
        ? `move ${titleOf(toBonus)} to bonus`
        : toPath
          ? `move ${titleOf(toPath)} to the path`
          : 'reorder the path';
      const saved = await save([courseChange({ ...course, manifest })], 'Saved the order of the path.', false, label);
      return saved ? null : (get().message?.text ?? 'The order was not saved.');
    },

    async placeExtra(item, unitId) {
      const course = courseOf(get().courseId);
      const content = get().build?.courses.find((candidate) => candidate.opening.id === course?.id);
      if (!course || !content) return 'No course is open.';
      const units: UnitOverrides = { order: [], after: {}, drop: {}, ...course.manifest.units };
      const place = { ...units.place };
      // Only a placement that differs from where it would be anyway is written.
      const natural = courseUnits({
        ...content,
        opening: {
          ...content.opening,
          units: { ...units, place: Object.fromEntries(Object.entries(place).filter(([key]) => key !== item)) },
        },
      }).find((unit) => unit.traps.includes(item) || unit.quizzes.includes(item))?.id;
      if (unitId && unitId !== natural) place[item] = unitId;
      else delete place[item];
      const next: UnitOverrides = { ...units, place };
      if (Object.keys(place).length === 0) delete next.place;
      try {
        checkUnitOverrides({ ...content, opening: { ...content.opening, units: next } });
      } catch (error) {
        return errorText(error);
      }
      const manifest = { ...course.manifest };
      const empty =
        !next.order.length && !Object.keys(next.after).length && !Object.keys(next.drop).length && !next.place;
      if (empty) delete manifest.units;
      else manifest.units = next;
      const quiz = content.quizzes.find((candidate) => candidate.id === item);
      const name = quiz ? `the question ${item}` : titleOf(item);
      const unit = courseUnits({ ...content, opening: { ...content.opening, units: next } }).find(
        (candidate) => candidate.traps.includes(item) || candidate.quizzes.includes(item),
      );
      const saved = await save(
        [courseChange({ ...course, manifest })],
        'Saved where it is shown.',
        false,
        unit ? `show ${name} with ${titleOf(unit.line)} ${unit.n}` : `move ${name}`,
      );
      return saved ? null : (get().message?.text ?? 'It was not saved.');
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

    async undo() {
      try {
        const undone = await undoAuthored();
        await get().load();
        set({ message: { text: undone ? 'Undone.' : 'There is nothing to undo.', undo: false } });
        const { useCatalog } = await import('@/data/catalog-store');
        void useCatalog.getState().reload();
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

/**
 * What Undo would take back, in a few words ("delete line 2...Bc5", "change to course My Scotch"), from the newest
 * action not yet undone. Null when there is nothing to undo.
 */
export function describeUndo(
  history: AuthoredChange[],
  rows: AuthoredRows,
  labels: Record<string, string> = {},
  imported: ReadonlySet<string> = new Set(),
): string | null {
  const target = undoTarget(history, imported);
  if (!target) return null;
  // The name the action was saved with; older actions are described from what they changed.
  const named = labels[target];
  if (named) return named;
  const group = history.filter((row) => row.group === target);
  const now = (row: AuthoredChange) =>
    (row.kind === 'chapter' ? rows.chapters : rows.courses).find((item) => item.id === row.itemId);
  const what = (row: AuthoredChange) => (row.kind === 'chapter' ? 'line' : 'course');
  const name = (row: AuthoredChange) => {
    const item = now(row);
    if (!item) return row.itemId;
    if ('pgn' in item)
      return /\[Variation "((?:[^"\\]|\\.)*)"\]/.exec(item.pgn)?.[1]?.replace(/\\"/g, '"') ?? row.itemId;
    try {
      return (JSON.parse(item.manifest) as { name?: string }).name ?? row.itemId;
    } catch {
      return row.itemId;
    }
  };
  const isDeleted = (row: AuthoredChange) => Boolean(now(row)?.deletedAt && !row.beforeDeletedAt);
  // A deleted course names the action, not the lines that went with it.
  const deleted = group.find((row) => isDeleted(row) && row.kind === 'course') ?? group.find(isDeleted);
  if (deleted) return `delete ${what(deleted)} ${name(deleted)}`;
  const created =
    group.find((row) => row.before === null && row.kind === 'course') ?? group.find((row) => row.before === null);
  if (created) return `make ${what(created)} ${name(created)}`;
  const changed = group.find((row) => row.kind === 'chapter') ?? group[0]!;
  return `change to ${what(changed)} ${name(changed)}`;
}
