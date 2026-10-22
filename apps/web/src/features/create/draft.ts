import {
  type AuthoredBuild,
  type CourseEntry,
  type CourseManifest,
  type PgnGame,
  playSan,
  readChapter,
  START_EPD,
  type TreeLine,
} from '@knightschool/core';
import type { AuthoredRows } from '@/data/authored-content';

/** A course as the editor holds it: its id and its course.yaml, lines as entries. */
export type DraftCourse = { id: string; manifest: CourseManifest & { lines: CourseEntry[] } };

export const entryId = (entry: CourseEntry) => (typeof entry === 'string' ? entry : entry.id);
export const entrySection = (entry: CourseEntry) => (typeof entry === 'string' ? undefined : entry.section);

/** The entry with its group set (or cleared); a plain id when nothing else is said of the line. */
export const withSection = (entry: CourseEntry, section: string | undefined): CourseEntry => {
  const next: Record<string, unknown> = typeof entry === 'string' ? { id: entry } : { ...entry };
  delete next.section;
  if (section) next.section = section;
  const said = Object.keys(next).filter((key) => key !== 'id' && !(key === 'alternative' && next[key] === false));
  return said.length === 0 ? (next.id as string) : (next as CourseEntry);
};

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

/** Every line that grows from a line, however deep. */
export function descendants(build: AuthoredBuild | null, id: string): string[] {
  if (!build) return [];
  return [...build.tree.lines.values()].filter((line) => line.parents.includes(id)).map((line) => line.id);
}
