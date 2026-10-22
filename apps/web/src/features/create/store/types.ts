import type { AuthoredBuild, Contribution, CourseManifest, LineKind, Side, TrapKind } from '@knightschool/core';
import type { AuthoredRows } from '@/data/authored-content';

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
