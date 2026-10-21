import { courseUnits, playSan, START_EPD, type CourseEntry, type TreeLine } from '@knightschool/core';
import { useMemo, useState } from 'react';
import { useAuthor } from './store';

export const entryId = (entry: CourseEntry) => (typeof entry === 'string' ? entry : entry.id);
export const entrySection = (entry: CourseEntry) => (typeof entry === 'string' ? undefined : entry.section);

/** "4...Nf6": a move with its number. */
export const numbered = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'}${san}`;

/** The UCI of each move of a line, for the board's last-move highlight. */
export function ucisOf(line: TreeLine | undefined): string[] {
  let epd = START_EPD;
  return (line?.game.moves ?? []).map((move) => {
    const played = playSan(epd, move.san);
    epd = played.epd;
    return played.uci;
  });
}

/** The units of a course with their ids, for writing path changes. */
export function useCourseUnits(courseId: string) {
  const build = useAuthor((state) => state.build);
  return useMemo(() => {
    const content = build?.courses.find((candidate) => candidate.opening.id === courseId);
    return content ? courseUnits({ ...content, opening: { ...content.opening, units: undefined } }) : [];
  }, [build, courseId]);
}

/** A field's value that starts from its source and starts again whenever the source changes (after a save or undo). */
export function useDraft<T>(source: T): [T, (value: T) => void] {
  const [draft, setDraft] = useState({ source, value: source });
  if (draft.source !== source) setDraft({ source, value: source }); // React's pattern for state that follows a prop
  return [draft.source === source ? draft.value : source, (value: T) => setDraft({ source, value })];
}
