import {
  playSan,
  START_EPD,
  type AuthoredBuild,
  type AuthoredProblem,
  type CourseEntry,
  type CourseUnit,
  type TreeLine,
} from '@knightschool/core';
import { useEffect, useState } from 'react';
import type { AuthoredRows } from '@/data/authored-content';
import { useStorage } from '@/data/storage';
import { useAuthor, type DraftCourse } from './store';

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

/** "12 units: Main line (1–4), Two Knights (1–2), …": the path, unit by unit, run together by line. */
export function unitSummary(units: CourseUnit[], title: (line: string) => string): string {
  const runs: { line: string; from: number; to: number }[] = [];
  for (const unit of units) {
    const last = runs.at(-1);
    if (last?.line === unit.line && unit.n === last.to + 1) last.to = unit.n;
    else runs.push({ line: unit.line, from: unit.n, to: unit.n });
  }
  const parts = runs.map((run) => `${title(run.line)} (${run.from === run.to ? run.from : `${run.from}–${run.to}`})`);
  return `${units.length} ${units.length === 1 ? 'unit' : 'units'}: ${parts.join(', ')}`;
}

/** A field's value that starts from its source and starts again whenever the source changes (after a save or undo). */
export function useDraft<T>(source: T): [T, (value: T) => void] {
  const [draft, setDraft] = useState({ source, value: source });
  if (draft.source !== source) setDraft({ source, value: source }); // React's pattern for state that follows a prop
  return [draft.source === source ? draft.value : source, (value: T) => setDraft({ source, value })];
}

/** Loads your authored work once the database is open, and says where it is. */
export function useAuthorLoaded() {
  const storageStatus = useStorage((state) => state.status);
  const status = useAuthor((state) => state.status);
  const error = useAuthor((state) => state.error);
  useEffect(() => {
    if (storageStatus === 'ready') void useAuthor.getState().load();
  }, [storageStatus]);
  return { storageStatus, status, error };
}

/** The build's problems about these courses and lines. */
export const problemsFor = (build: AuthoredBuild | null, ids: string[]): AuthoredProblem[] =>
  (build?.problems ?? []).filter((problem) => ids.includes(problem.id));

/** When a course or any of its lines last changed. */
export function lastEdited(rows: AuthoredRows, course: DraftCourse): string {
  const lines = new Set(course.manifest.lines.map(entryId));
  const times = [
    ...rows.courses.filter((row) => row.id === course.id).map((row) => row.at),
    ...rows.chapters.filter((row) => lines.has(row.id)).map((row) => row.at),
  ];
  return times.sort().at(-1) ?? '';
}

/** "21 Oct, 18:06": a time in the learner's own words. */
export const shortTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
