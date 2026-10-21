import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { parsePgn } from '../chess/pgn';
import { START_EPD } from '../chess/epd';
import { CourseManifest, UnitOverrides, type OpeningContent, type OpeningGroup, type Side } from '../schema/content';
import { projectCourse, resolveTree, type Chapter, type TheoryTree } from '../content/theory-tree';

/**
 * Content written in the app (docs/STUDY-PLAN.md, "Authoring"): chapters as the PGN text of a content/tree file, and
 * courses as course.yaml in JSON. They are merged with the shipped tree exactly as the build merges files, so an
 * authored course is an ordinary course everywhere in the app.
 */
export type AuthoredInput = {
  chapters: { id: string; pgn: string }[];
  courses: { id: string; manifest: string }[];
};

/** Something authored that could not be used, and why: shown in the editor, never a crash. */
export type AuthoredProblem = { kind: 'chapter' | 'course'; id: string; message: string };

export type AuthoredBuild = {
  tree: TheoryTree;
  courses: OpeningContent[];
  /** The ids of the authored chapters that made it into the tree. */
  chapters: string[];
  problems: AuthoredProblem[];
};

/** Where an authored chapter says it comes from in messages, as a file would. */
export const authoredSource = (id: string) => `authored/${id}.pgn`;

/**
 * Merges authored chapters with the shipped ones and projects the authored courses. A chapter that does not parse or
 * does not fit the tree (an id already used, a [Start] that names nothing, a clash with a shipped comment) is left out
 * with a problem, and so are the chapters that grow from it; a course that cannot be projected is left out the same way.
 * Shipped content is never affected. A line authored without a [Snapshot] is pictured at its end.
 */
export function buildAuthored(
  shipped: Chapter[],
  input: AuthoredInput,
  shippedCourses: ReadonlySet<string> = new Set(),
): AuthoredBuild {
  const problems: AuthoredProblem[] = [];
  let authored: Chapter[] = [];
  for (const { id, pgn } of input.chapters) {
    try {
      authored.push({ id, source: authoredSource(id), game: parsePgn(pgn, authoredSource(id)) });
    } catch (error) {
      problems.push({ kind: 'chapter', id, message: messageOf(error) });
    }
  }

  // Resolve, leaving out an authored chapter each time one is named in the error; give up on all of them if the error
  // names a shipped file (it cannot be pinned on one chapter).
  let tree: TheoryTree | undefined;
  while (!tree) {
    try {
      tree = resolveTree([...shipped, ...authored]);
    } catch (error) {
      const message = messageOf(error);
      const culprit = authored.find((chapter) => message.startsWith(`${chapter.source}:`));
      const dropped = culprit ? [culprit] : authored;
      for (const chapter of dropped) problems.push({ kind: 'chapter', id: chapter.id, message });
      authored = authored.filter((chapter) => !dropped.includes(chapter));
      if (!culprit && dropped.length === 0) throw error; // the shipped tree itself is broken
    }
  }
  const chapters = new Set(authored.map((chapter) => chapter.id));

  const courses: OpeningContent[] = [];
  for (const { id, manifest } of input.courses) {
    try {
      if (shippedCourses.has(id)) throw new Error(`the course id "${id}" is already a course of the app`);
      const parsed = CourseManifest.safeParse(JSON.parse(manifest));
      if (!parsed.success)
        throw new Error(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
      const content = projectCourse(id, parsed.data, tree);
      courses.push({
        ...content,
        opening: {
          ...content.opening,
          variants: content.opening.variants.map((variant) =>
            chapters.has(variant.id) && variant.snapshot === undefined
              ? { ...variant, snapshot: variant.mainLine.length }
              : variant,
          ),
        },
      });
    } catch (error) {
      problems.push({ kind: 'course', id, message: messageOf(error) });
    }
  }
  return { tree, courses, chapters: [...chapters], problems };
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

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

/** A course's `units:` block as YAML, for editing as text: empty when there are no overrides. */
export function overridesToYaml(overrides: UnitOverrides | undefined): string {
  if (!overrides) return '';
  const trimmed = Object.fromEntries(
    Object.entries(overrides).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0,
    ),
  );
  return Object.keys(trimmed).length ? stringifyYaml(trimmed) : '';
}

/** Reads a `units:` block written as YAML; blank text means none. Throws with a plain message when it does not fit. */
export function overridesFromYaml(text: string): UnitOverrides | undefined {
  if (!text.trim()) return undefined;
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    throw new Error(`Not YAML: ${messageOf(error)}`);
  }
  const parsed = UnitOverrides.safeParse(raw ?? {});
  if (!parsed.success)
    throw new Error(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || 'units'}: ${issue.message}`).join('; '),
    );
  return parsed.data;
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
