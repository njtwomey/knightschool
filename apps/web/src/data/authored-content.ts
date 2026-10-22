import type { AuthoredBuild, AuthoredChapter, AuthoredCourse, Chapter } from '@knightschool/core';
import { whenStorageReady } from './storage';

/** How long the lists wait for the database before showing only the shipped courses. */
const STORAGE_WAIT_MS = 3000;

/** The code that builds authored content (`authored-build.ts`), loaded the first time something authored needs it. */
const builder = () => import('./authored-build');

/** The shipped chapters as written (public/content/chapters.json), parsed once, when authored content first needs them. */
export const loadShippedChapters = async (): Promise<Chapter[]> => (await builder()).loadShippedChapters();

export type AuthoredRows = { chapters: AuthoredChapter[]; courses: AuthoredCourse[] };

/** Every authored row, deleted ones too. Empty when the database is not open within a few seconds. */
export async function loadAuthoredRows(): Promise<AuthoredRows> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), STORAGE_WAIT_MS));
  const browser = await Promise.race([whenStorageReady().catch(() => null), timeout]);
  if (!browser) return { chapters: [], courses: [] };
  const [chapters, courses] = await Promise.all([
    browser.storage.authoring.chapters(),
    browser.storage.authoring.courses(),
  ]);
  return { chapters, courses };
}

let built: { key: string; build: Promise<AuthoredBuild | null> } | undefined;

/**
 * The authored chapters and courses merged with the shipped tree (`buildAuthored`), or null when nothing is authored,
 * so the shipped app pays nothing: not even the code that builds it is loaded. Rebuilt when the rows change.
 */
export async function loadAuthoredBuild(shippedCourses: () => Promise<string[]>): Promise<AuthoredBuild | null> {
  const rows = await loadAuthoredRows();
  const live = {
    chapters: rows.chapters.filter((row) => !row.deletedAt).map(({ id, pgn }) => ({ id, pgn })),
    courses: rows.courses.filter((row) => !row.deletedAt).map(({ id, manifest }) => ({ id, manifest })),
  };
  const key = JSON.stringify(live);
  if (built?.key !== key) {
    const build =
      live.chapters.length === 0 && live.courses.length === 0
        ? Promise.resolve(null)
        : Promise.all([builder(), shippedCourses()]).then(([{ buildFromRows }, ids]) => buildFromRows(live, ids));
    built = { key, build };
    build.catch(() => {
      if (built?.build === build) built = undefined;
    });
  }
  return built.build;
}
