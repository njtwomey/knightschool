import { loadAuthoredBuild, loadAuthoredRows } from '@/data/authored-content';
import { loadUndoLabels, undoAuthored } from '@/data/authored-edits';
import { reminderToExport } from '@/data/backup';
import { useCatalog } from '@/data/catalog-store';
import { loadShippedIndex } from '@/data/content';
import { whenStorageReady } from '@/data/storage';
import { errorText } from '@/lib/errors';
import { entryId, fullLine } from '../draft';
import { describeUndo } from '../undo-label';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type SessionSlice = Pick<
  AuthorState,
  | 'status'
  | 'error'
  | 'rows'
  | 'build'
  | 'shippedCourses'
  | 'courseId'
  | 'lineId'
  | 'ply'
  | 'branching'
  | 'message'
  | 'reminder'
  | 'undoLabel'
  | 'load'
  | 'selectCourse'
  | 'selectLine'
  | 'open'
  | 'hintNext'
  | 'setPly'
  | 'startBranch'
  | 'cancelBranch'
  | 'undo'
>;

let pendingHint: string | null = null;

/** Loading, what is open (course, line, position), branching and Undo. */
export function sessionSlice({ set, get, courseOf }: SliceContext): SessionSlice {
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

    async undo() {
      try {
        const undone = await undoAuthored();
        await get().load();
        set({ message: { text: undone ? 'Undone.' : 'There is nothing to undo.', undo: false } });
        void useCatalog.getState().reload();
      } catch (error) {
        set({ message: { text: errorText(error), undo: false, error: true } });
      }
    },
  };
}
