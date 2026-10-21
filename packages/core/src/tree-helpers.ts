import type { LineEdge, LineNode, OpeningContent } from './schema/content';

export function nodeAt(content: OpeningContent, epd: string): LineNode {
  const node = content.nodes[epd];
  if (!node) throw new Error(`No position ${epd} in ${content.opening.id}`);
  return node;
}

/** The main line of the first line, from the start position. */
export function mainLine(content: OpeningContent): LineEdge[] {
  const path: LineEdge[] = [];
  let node = nodeAt(content, content.opening.rootEpd);
  for (;;) {
    const next = node.moves.find((edge) => edge.isMainLine);
    if (!next || path.length > 400) return path;
    path.push(next);
    node = nodeAt(content, next.to);
  }
}

/** Positions where it is the learner's turn and the repertoire has a move: one card each. */
export function ourMoveNodes(content: OpeningContent): LineNode[] {
  return Object.values(content.nodes)
    .filter((node) => node.isOurTurn && node.moves.some((edge) => edge.isRepertoire))
    .sort((a, b) => a.ply - b.ply);
}

/** The shortest sequence of moves from the start to a position. */
export function pathTo(content: OpeningContent, epd: string): LineEdge[] {
  const root = content.opening.rootEpd;
  const previous = new Map<string, { from: string; edge: LineEdge }>();
  const queue = [root];
  const seen = new Set(queue);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === epd) break;
    for (const edge of nodeAt(content, current).moves) {
      if (seen.has(edge.to)) continue;
      seen.add(edge.to);
      previous.set(edge.to, { from: current, edge });
      queue.push(edge.to);
    }
  }
  const path: LineEdge[] = [];
  for (let at = epd; at !== root;) {
    const step = previous.get(at);
    if (!step) throw new Error(`Position ${epd} is not reachable from the start of ${content.opening.id}`);
    path.unshift(step.edge);
    at = step.from;
  }
  return path;
}

/** Positions reached by more than one move: the transpositions. Keyed by EPD, value is how many moves lead in. */
export function transpositions(content: OpeningContent): Map<string, number> {
  const inbound = new Map<string, number>();
  for (const node of Object.values(content.nodes)) {
    for (const edge of node.moves) inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }
  return new Map([...inbound].filter(([, count]) => count > 1));
}

/** The move to follow when stepping forward: the main line, else the repertoire move, else the first one. */
export function preferredMove(node: LineNode): LineEdge | undefined {
  return node.moves.find((edge) => edge.isMainLine) ?? node.moves.find((edge) => edge.isRepertoire) ?? node.moves[0];
}

/** Moves out of a position in display order: main line, then the repertoire move, then the rest as authored. */
export function orderedMoves(node: LineNode): LineEdge[] {
  const rank = (edge: LineEdge) => (edge.isMainLine ? 0 : edge.isRepertoire ? 1 : 2);
  return node.moves
    .map((edge, index) => ({ edge, index }))
    .sort((a, b) => rank(a.edge) - rank(b.edge) || a.index - b.index)
    .map(({ edge }) => edge);
}

/** The path to the end of a variant's own main line. */
export function variantPath(content: OpeningContent, variantId: string): LineEdge[] {
  const variant = content.opening.variants.find((candidate) => candidate.id === variantId);
  if (!variant) throw new Error(`No variant ${variantId} in ${content.opening.id}`);
  const path: LineEdge[] = [];
  let node = nodeAt(content, content.opening.rootEpd);
  for (const uci of variant.mainLine) {
    const edge = node.moves.find((candidate) => candidate.uci === uci);
    if (!edge) throw new Error(`Variant ${variantId}: no move ${uci} at ${node.epd}`);
    path.push(edge);
    node = nodeAt(content, edge.to);
  }
  return path;
}

/** One move of a line, with whose it is. */
export type LineStep = {
  fromEpd: string;
  edge: LineEdge;
  /** True when it is the learner's side to move here, so the learner is asked for it. */
  ours: boolean;
};

/** A run of moves (UCI) from the start position as steps, as far as the course knows them. */
export function pathSteps(content: OpeningContent, ucis: string[]): LineStep[] {
  const edges = pathFromUcis(content, ucis);
  return edges.map((edge, i) => {
    const fromEpd = i === 0 ? content.opening.rootEpd : edges[i - 1]!.to;
    return { fromEpd, edge, ours: nodeAt(content, fromEpd).isOurTurn };
  });
}

/** A variant's main line as steps from the start position. */
export function lineSteps(content: OpeningContent, variantId: string): LineStep[] {
  return variantPath(content, variantId).map((edge, index, path) => {
    const fromEpd = index === 0 ? content.opening.rootEpd : path[index - 1]!.to;
    return { fromEpd, edge, ours: nodeAt(content, fromEpd).isOurTurn };
  });
}

/** A path carried on to the end of its line, preferring the main line at each branch. */
export function continueLine(content: OpeningContent, path: LineEdge[]): LineEdge[] {
  const line = [...path];
  let node = nodeAt(content, path.at(-1)?.to ?? content.opening.rootEpd);
  for (;;) {
    const next = preferredMove(node);
    if (!next || line.length > 400) return line;
    line.push(next);
    node = nodeAt(content, next.to);
  }
}

/** The other moves available after a path, in display order, leaving out the one the shown line takes. */
export function alternativesAfter(content: OpeningContent, path: LineEdge[], taken?: LineEdge): LineEdge[] {
  const node = nodeAt(content, path.at(-1)?.to ?? content.opening.rootEpd);
  return orderedMoves(node).filter((edge) => edge.uci !== taken?.uci);
}

/** Which variant a run of moves belongs to: the first one that all of them appear in, or undefined if they diverge. */
export function lineName(content: OpeningContent, edges: LineEdge[]): string | undefined {
  const shared = content.opening.variants.find(
    (variant) => edges.length > 0 && edges.every((edge) => edge.variants.includes(variant.id)),
  );
  return shared?.name;
}

/**
 * Walks a list of UCI moves through the tree from the start, as far as the course knows them: a saved view or a shared
 * link carries moves like this. Stops at the first move the course does not have, so a stale link degrades to a prefix.
 */
export function pathFromUcis(content: OpeningContent, ucis: string[]): LineEdge[] {
  const path: LineEdge[] = [];
  let node = nodeAt(content, content.opening.rootEpd);
  for (const uci of ucis) {
    const edge = node.moves.find((candidate) => candidate.uci === uci);
    if (!edge) break;
    path.push(edge);
    node = nodeAt(content, edge.to);
  }
  return path;
}

/**
 * The ply where a line becomes itself: the deepest position along it that has an opening name, so a picture of the
 * line shows the variation rather than move 12. Without names, a position partway along (ply 8, or the end).
 */
export function namedPly(content: OpeningContent, variantId: string): number {
  const path = variantPath(content, variantId);
  for (let ply = path.length; ply > 0; ply--) if (content.nodes[path[ply - 1]!.to]?.name) return ply;
  return Math.min(8, path.length);
}
