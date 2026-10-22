import { START_EPD } from '../chess/epd';
import type { OpeningGroup, Side } from '../schema/content';

/** "Giuoco Piano, Main Line!" -> "giuoco-piano-main-line": an id for a line or course from its name. */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'line';
}

/** `base`, or `base-2`, `base-3`... whichever is not taken. */
export function uniqueId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** When to remind the learner to export: after this many authored changes, or this many days, since the last export. */
export const EXPORT_REMINDER = { edits: 20, days: 7 } as const;

/**
 * Whether to remind the learner to export their data, which now holds work that cannot be rebuilt from the repository:
 * after `EXPORT_REMINDER.edits` authored changes since the last export, or `EXPORT_REMINDER.days` days after it with
 * something changed. `since` is the last export, or when there was none the first authored change. Null when no
 * reminder is due.
 */
export function exportReminder(
  editsSince: number,
  since: string | undefined,
  now: Date,
): { edits: number; days: number } | null {
  if (editsSince === 0 || !since) return null;
  const days = Math.floor((now.getTime() - Date.parse(since)) / 86_400_000);
  return editsSince >= EXPORT_REMINDER.edits || days >= EXPORT_REMINDER.days ? { edits: editsSince, days } : null;
}

/**
 * The opening an authored course belongs to when it is a course of its own rather than part of an opening the app
 * has: "My courses", one per side (an opening's side decides "playing it" or "playing against it"). Its group is made
 * by the app (`ownOpeningGroups`), so content/openings.yaml does not need it; a contribution that uses it is a new
 * opening for whoever accepts it.
 */
export const ownOpeningId = (side: Side) => `my-${side}-courses`;
export const isOwnOpening = (id: string) => id === ownOpeningId('white') || id === ownOpeningId('black');

/** The "My courses" groups for the authored courses that are courses of their own. */
export function ownOpeningGroups(courses: { id: string; side: Side; opening: string }[]): OpeningGroup[] {
  return (['white', 'black'] as const).flatMap((side) => {
    const own = courses.filter((course) => course.opening === ownOpeningId(side)).map((course) => course.id);
    return own.length
      ? [
          {
            id: ownOpeningId(side),
            name: 'My courses',
            side,
            summary: `Courses you wrote, playing ${side}.`,
            moves: '',
            epd: START_EPD,
            courses: own,
          },
        ]
      : [];
  });
}
