// The code that merges authored rows with the shipped tree. Loaded (with the PGN reader) only when something is
// authored, through `authored-content.ts`, so the shipped app never pays for it.
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
  ShippedChapters,
  type TreeGraph,
} from '@knightschool/core';
import { fetchContent, onceRetryable } from './fetch-content';

/** The shipped chapters as written (public/content/chapters.json), parsed once, when authored content first needs them. */
export const loadShippedChapters: () => Promise<Chapter[]> = onceRetryable(() =>
  fetchContent('chapters.json').then((json) =>
    // Shipped content is checked when it is built (scripts/content.test.ts), so production trusts it.
    (import.meta.env.DEV ? ShippedChapters.parse(json) : (json as ShippedChapters)).map(({ id, source, pgn }) => ({
      id,
      source,
      game: parsePgn(pgn, source),
    })),
  ),
);

type LiveRows = {
  chapters: Pick<AuthoredChapter, 'id' | 'pgn'>[];
  courses: Pick<AuthoredCourse, 'id' | 'manifest'>[];
};

/** The live authored rows merged with the shipped chapters. */
export async function buildFromRows(live: LiveRows, shippedCourses: string[]): Promise<AuthoredBuild> {
  return buildAuthored(await loadShippedChapters(), live, new Set(shippedCourses));
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
