import { buildMoveTree, chapterTitle, type MoveTree, type TreeGraph } from '@knightschool/core';
import { useEffect, useState } from 'react';
import { loadTreeGraph } from '@/data/content';

type TreeChapter = TreeGraph['chapters'][number];

/** Every line of the theory tree as one prefix tree, with each line's chapter (name, opening, side, courses). */
type LoadedTree = { tree: MoveTree; chapters: Map<string, TreeChapter> };

let cached: Promise<LoadedTree> | undefined;

/** tree.json is fetched and built into a move tree once per page load, and shared by every tree on the site. */
function loadMoveTree(): Promise<LoadedTree> {
  cached ??= loadTreeGraph()
    .then((graph) => ({
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
    }))
    .catch((error: unknown) => {
      cached = undefined; // let a later visit try again
      throw error;
    });
  return cached;
}

/** The whole tree once it has loaded, or the reason it could not. */
export function useMoveTree(): { loaded: LoadedTree | null; error: string | null } {
  const [state, setState] = useState<{ loaded: LoadedTree | null; error: string | null }>({
    loaded: null,
    error: null,
  });
  useEffect(() => {
    let live = true;
    loadMoveTree()
      .then((loaded) => live && setState({ loaded, error: null }))
      .catch(
        (error: unknown) =>
          live && setState({ loaded: null, error: error instanceof Error ? error.message : String(error) }),
      );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
