import { buildMoveTree, chapterTitle, type MoveTree, type TreeGraph } from '@knightschool/core';
import { loadTreeGraph } from '@/data/content';
import { onceRetryable } from '@/data/fetch-content';
import { useAsync } from '@/hooks/use-async';

type TreeChapter = TreeGraph['chapters'][number];

/** Every line of the theory tree as one prefix tree, with each line's chapter (name, opening, side, courses). */
type LoadedTree = { tree: MoveTree; chapters: Map<string, TreeChapter> };

/** tree.json is fetched and built into a move tree once per page load, and shared by every tree on the site. */
const loadMoveTree = onceRetryable((): Promise<LoadedTree> =>
  loadTreeGraph().then((graph) => ({
    tree: buildMoveTree(
      graph.chapters.map((chapter) => ({
        line: chapter.id,
        moves: chapter.moves,
        courses: chapter.courses,
        side: chapter.side,
        name: chapterTitle(chapter),
      })),
    ),
    chapters: new Map(graph.chapters.map((chapter) => [chapter.id, chapter])),
  })),
);

/** The whole tree once it has loaded, or the reason it could not. */
export function useMoveTree(): { loaded: LoadedTree | null; error: string | null } {
  const { data, error } = useAsync(loadMoveTree, []);
  return { loaded: data ?? null, error };
}
