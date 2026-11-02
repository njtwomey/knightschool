import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore } from 'react';

/**
 * The page's main board: the one the arrow keys (and F to flip) belong to, and the one a move anywhere on the page
 * lights and goes to (docs/v2/navigation/shortcuts.md, docs/v2/hooks/use-move-interaction.md).
 *
 * Every board that can step or flip claims it; a board that asks (`keys`) wins over the rest, and otherwise the first
 * board on the page has it, so the keys and the move chips work at once on any page with a board, without clicking it
 * first. A board can opt out (`keys={false}`). A board's own caption and panels reach that board through context
 * before the page's main board.
 */

/** What a move elsewhere on the page can ask of a board. */
export type BoardTarget = {
  /** Go to the position after a move: the board's cursor if it holds it, else shown until the learner steps back. */
  show: (epd: string, lastMove?: { from: string; to: string }) => void;
  /** Draw a move as a faint arrow while it is hovered; null clears it. */
  light: (move: { from: string; to: string } | null) => void;
};

type Claim = { priority: number; order: number; target: { current: BoardTarget | null } };

const claims = new Map<string, Claim>();
const listeners = new Set<() => void>();
let counter = 0;
let owner: string | undefined;

function recompute() {
  let best: [string, Claim] | undefined;
  for (const entry of claims) {
    const [, claim] = entry;
    if (
      !best ||
      claim.priority > best[1].priority ||
      (claim.priority === best[1].priority && claim.order < best[1].order)
    )
      best = entry;
  }
  const next = best?.[0];
  if (next === owner) return;
  owner = next;
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const current = () => owner;

/**
 * Registers a board for the page: whether it has the page's keys (`want` true asks, undefined claims them if no one
 * asks, false never), with the target that moves elsewhere on the page use when it is the main board.
 */
export function usePageBoard(want: boolean | undefined, can: boolean, target: BoardTarget): boolean {
  const id = useId();
  const ref = useRef<BoardTarget | null>(target);
  useEffect(() => {
    ref.current = target;
  });
  const priority = !can || want === false ? 0 : want ? 2 : 1;
  useEffect(() => {
    if (!priority) return;
    claims.set(id, { priority, order: counter++, target: ref });
    recompute();
    return () => {
      claims.delete(id);
      recompute();
    };
  }, [id, priority]);
  return useSyncExternalStore(subscribe, current, current) === id && priority > 0;
}

/** A board's own children (its caption, panels a page wraps) reach it before the page's main board. */
export const BoardTargetContext = createContext<BoardTarget | null>(null);

/** The board a move here should light and go to: the nearest board, else the page's main board, else none. */
export function useBoardTarget(): BoardTarget | null {
  const near = useContext(BoardTargetContext);
  const main = useSyncExternalStore(subscribe, current, current);
  if (near) return near;
  const claim = main ? claims.get(main) : undefined;
  return claim
    ? { show: (...args) => claim.target.current?.show(...args), light: (move) => claim.target.current?.light(move) }
    : null;
}
