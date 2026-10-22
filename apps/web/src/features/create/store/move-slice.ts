import {
  appendMove,
  chapterText,
  type CourseEntry,
  newChapter,
  numberedMove,
  playSan,
  setMoveNote,
  slugify,
  startHeader,
  truncateMoves,
  uniqueId,
} from '@knightschool/core';
import { draftChapter, entryId, entrySection, fullLine, positionsOf, withSection } from '../draft';
import type { SliceContext } from './context';
import type { AuthorState } from './types';

type MoveSlice = Pick<AuthorState, 'playMove' | 'truncate' | 'setNote'>;

/** Moves on the board: playing on, branching, cutting a line short and a move's note. */
export function moveSlice({
  set,
  get,
  save,
  courseOf,
  courseChange,
  takenIds,
  chapterChange,
  titleOf,
  prefixOf,
}: SliceContext): MoveSlice {
  return {
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
        const title = `${line.game.tags.Variation ?? 'Line'}, ${numberedMove(branching, san)}`;
        const id = uniqueId(slugify(`${course.id} ${numberedMove(branching, san)}`), takenIds());
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
        `Played ${numberedMove(ply, san)}.`,
        false,
        `play ${numberedMove(ply, san)} in ${titleOf(lineId)}`,
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
        `delete the moves of ${titleOf(lineId)} after ${ply > 0 ? numberedMove(ply - 1, line.game.moves[ply - 1]!.san) : 'the start'}`,
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
        `note ${numberedMove(ply - 1, line.game.moves[ply - 1]!.san)} in ${titleOf(lineId)}`,
      );
    },
  };
}
