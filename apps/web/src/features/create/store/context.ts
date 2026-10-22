import { chapterText, opponentMove, type PgnGame, setHeader, type Side, type TreeLine } from '@knightschool/core';
import type { StoreApi } from 'zustand';
import { saveAuthored, type AuthoredChangeInput } from '@/data/authored-edits';
import { useCatalog } from '@/data/catalog-store';
import { errorText } from '@/lib/errors';
import { draftChapter, draftCourses, fullLine, type DraftCourse } from '../draft';
import type { AuthorState } from './types';

type Set = StoreApi<AuthorState>['setState'];
type Get = StoreApi<AuthorState>['getState'];

/** What every slice of the editor's store shares: the store itself and the helpers that save and look things up. */
export type SliceContext = ReturnType<typeof sliceContext>;

export function sliceContext(set: Set, get: Get) {
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

  return { set, get, save, courseOf, courseChange, takenIds, chapterChange, titleOf, prefixOf };
}
