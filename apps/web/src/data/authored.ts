import {
  buildAuthored,
  courseIndexEntry,
  parsePgn,
  treeGraph,
  type AuthoredBuild,
  type AuthoredChapter,
  type AuthoredCourse,
  type Chapter,
  type OpeningIndexEntry,
  type TreeGraph,
} from '@knightschool/core';
import { z } from 'zod';
import { fetchContent } from './fetch-content';
import { whenStorageReady } from './storage';

/** How long the lists wait for the database before showing only the shipped courses. */
const STORAGE_WAIT_MS = 3000;

const ChapterText = z.array(z.object({ id: z.string(), source: z.string(), pgn: z.string() }));
let shippedChapters: Promise<Chapter[]> | undefined;

/** The shipped chapters as written (public/content/chapters.json), parsed once, when authored content first needs them. */
export function loadShippedChapters(): Promise<Chapter[]> {
  shippedChapters ??= fetchContent('chapters.json').then((json) =>
    ChapterText.parse(json).map(({ id, source, pgn }) => ({ id, source, game: parsePgn(pgn, source) })),
  );
  shippedChapters.catch(() => {
    shippedChapters = undefined;
  });
  return shippedChapters;
}

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
 * so the shipped app pays nothing. Rebuilt when the rows change.
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
        : Promise.all([loadShippedChapters(), shippedCourses()]).then(([chapters, ids]) =>
            buildAuthored(chapters, live, new Set(ids)),
          );
    built = { key, build };
    build.catch(() => {
      if (built?.build === build) built = undefined;
    });
  }
  return built.build;
}

/** Index rows for the authored courses, after the shipped ones in study order. */
export function authoredIndexEntries(build: AuthoredBuild, shipped: OpeningIndexEntry[]): OpeningIndexEntry[] {
  const listedBy = linesListedBy(build, shipped);
  const graph = treeGraph(build.tree);
  const branches = new Map(
    graph.chapters.flatMap((chapter) =>
      chapter.parent && chapter.after ? [[chapter.id, { parent: chapter.parent, after: chapter.after }] as const] : [],
    ),
  );
  const after = Math.max(0, ...shipped.map((entry) => entry.order)) + 1;
  return build.courses.map((content, i) => ({
    ...courseIndexEntry(content, {
      order: after + i,
      alsoIn: (line) => listedBy.get(line) ?? [],
      branch: (line) => branches.get(line),
    }),
    authored: true,
  }));
}

/** The whole tree to draw, authored chapters included. */
export function authoredTreeGraph(build: AuthoredBuild, shipped: OpeningIndexEntry[]): TreeGraph {
  const listedBy = linesListedBy(build, shipped);
  return treeGraph(build.tree, (line) => listedBy.get(line) ?? []);
}

/** Which courses list each line, shipped and authored. */
function linesListedBy(build: AuthoredBuild, shipped: OpeningIndexEntry[]): Map<string, string[]> {
  const listedBy = new Map<string, string[]>();
  const add = (line: string, course: string) => listedBy.set(line, [...(listedBy.get(line) ?? []), course]);
  for (const entry of shipped) for (const line of entry.lines) add(line.id, entry.id);
  for (const content of build.courses)
    for (const variant of content.opening.variants) add(variant.id, content.opening.id);
  return listedBy;
}
