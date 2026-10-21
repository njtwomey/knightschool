import type { CourseUnit, OpeningContent, UnitProgress } from '@knightschool/core';
import type { LucideIcon } from 'lucide-react';
import type { CoursePath } from '@/data/course-path';

/** What a session type picks from: the course and where the learner is on its path. */
type PathContext = { content: OpeningContent; path: CoursePath };

/** A session ready to start (an address, and anything to set before going there), or why there is none now. */
type SessionPick =
  { ready: true; summary: string; href: string; prepare?: () => void } | { ready: false; reason: string };

/**
 * One kind of study session on a course's path. It picks what to study from the path's state and sends the learner to
 * a page that records the answers the usual way: Learn and Drill through `features/play/record.ts` (the review cards),
 * Speed through `speed_attempts`. Adding a type is one file and a line in `index.ts`.
 */
export type SessionType = {
  id: string;
  name: string;
  blurb: string;
  icon: LucideIcon;
  pick: (context: PathContext) => SessionPick;
};

/** The unit to work on now: the first one being learned, else the first one ready to start. */
export function currentUnit(path: CoursePath): { unit: CourseUnit; progress: UnitProgress } | undefined {
  const at = (state: string) => path.units.find((unit) => path.progress.get(unit.id)?.state === state);
  const unit = at('learning') ?? at('unlocked');
  return unit && { unit, progress: path.progress.get(unit.id)! };
}

/** "Unit 3 (Giuoco Piano)": how a session names a unit. */
export function unitLabel(content: OpeningContent, unit: CourseUnit): string {
  const name = content.opening.variants.find((variant) => variant.id === unit.line)?.name ?? unit.line;
  return `Unit ${unit.index + 1} (${name})`;
}

/** Why nothing is left to start: every unit passed, or the rest wait for units still being learned. */
export function nothingLeft(path: CoursePath): string {
  return path.units.every((unit) => {
    const state = path.progress.get(unit.id)?.state;
    return state === 'passed' || state === 'graduated';
  })
    ? 'Every unit is passed. The quiz keeps them fresh.'
    : 'The units left are locked until the ones they grow from are passed.';
}
