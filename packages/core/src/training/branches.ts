import type { LineEdge, LineNode } from '../schema/content';

/** A random number in [0, 1). Injected so a session can be replayed in tests. */
export type Rng = () => number;

/** The main line is three times as likely as any other known reply, so common branches come up most. */
export const MAIN_LINE_WEIGHT = 3;

/** The opponent's move in a branch drill: one of the replies the course knows, favouring the main line. */
export function chooseReply(node: LineNode, rng: Rng): LineEdge | undefined {
  const weights = node.moves.map((edge) => (edge.isMainLine ? MAIN_LINE_WEIGHT : 1));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let pick = rng() * total;
  for (const [index, edge] of node.moves.entries()) {
    pick -= weights[index]!;
    if (pick < 0) return edge;
  }
  return node.moves.at(-1);
}

/** The move the learner is expected to play at a position of theirs. */
export const expectedMove = (node: LineNode): LineEdge | undefined => node.moves.find((edge) => edge.isRepertoire);

/**
 * The next move of a branch drill from a position: the learner's repertoire move on their turn, a weighted-random known
 * reply on the opponent's. Undefined when the course ends here (or the learner has no repertoire move).
 */
export function nextBranchMove(node: LineNode, rng: Rng): { edge: LineEdge; ours: boolean } | undefined {
  if (node.moves.length === 0) return undefined;
  if (node.isOurTurn) {
    const edge = expectedMove(node);
    return edge ? { edge, ours: true } : undefined;
  }
  const edge = chooseReply(node, rng);
  return edge ? { edge, ours: false } : undefined;
}
