/*
 * The map's layout (docs/v2/components/map-tree.md): one column per move, one lane per line, the first line straight
 * across the top and each branch below the line it leaves, the latest branch nearest, so no lines cross. Moves are keyed
 * by the moves that lead to them, so a move shared by several lines is drawn once, in the lane of the first line that
 * plays it. It follows v1's laneLayout (packages/core/src/navigation/lane-layout.ts) and belongs in core once v2 has
 * one.
 */

import type { Note } from '@knightschool/core/content';
export type MapMove = {
  san: string;
  uci: string;
  before: string;
  after: string;
  /** Its comment, for a move that is not in the opening's tree (a follow-up's). */
  note?: Note;
};
export type MapLine = {
  id: string;
  name: string;
  kind: string;
  moves: MapMove[];
  /** The colour it is drawn in (a slot in the line palette), shared with its dot in the index; its lane by default. */
  colour?: number;
};

export type MapNode = {
  /** The UCIs up to and including this move, joined by spaces. */
  key: string;
  ply: number;
  column: number;
  lane: number;
  /** The line whose lane draws it. */
  line: string;
  move: MapMove;
};

export type MapLane = {
  line: MapLine;
  lane: number;
  /** The line it grows out of, or null for the first line. */
  parent: string | null;
  /** The first ply it plays on its own. */
  startPly: number;
  /** Where it leaves its parent: the node before its first own move, or null when it leaves at the trigger. */
  from: string | null;
  /** Lines folded away under it. */
  folded: number;
};

export type MapLayout = {
  /** The moves every line shares, drawn as the first pill. */
  trigger: MapMove[];
  lanes: MapLane[];
  nodes: MapNode[];
  columns: number;
  /** Every line's parent (before folding and subtrees), for the index. */
  parents: Map<string, string | null>;
  byKey: Map<string, MapNode>;
};

export const keyOf = (moves: readonly MapMove[], plies: number) =>
  moves
    .slice(0, plies)
    .map((move) => move.uci)
    .join(' ');

function sharedPlies(a: readonly MapMove[], b: readonly MapMove[]) {
  let n = 0;
  while (n < a.length && n < b.length && a[n]!.uci === b[n]!.uci) n++;
  return n;
}

/** Every line's parent and first own ply, from the order given (the first line is the main line). */
export function lineParents(lines: readonly MapLine[], trigger: number) {
  const result = new Map<string, { parent: string | null; startPly: number }>();
  lines.forEach((line, i) => {
    let parent: string | null = null;
    let best = -1;
    for (let j = 0; j < i; j++) {
      const shared = sharedPlies(line.moves, lines[j]!.moves);
      if (shared > best) {
        best = shared;
        parent = lines[j]!.id;
      }
    }
    result.set(line.id, { parent, startPly: Math.max(trigger, best) });
  });
  return result;
}

/** What grows from a line: its children, their children, and so on. */
export function descendants(parents: Map<string, string | null>, id: string): string[] {
  const out: string[] = [];
  const walk = (of: string) => {
    for (const [child, parent] of parents) {
      if (parent === of) {
        out.push(child);
        walk(child);
      }
    }
  };
  walk(id);
  return out;
}

export function layoutLines(
  lines: readonly MapLine[],
  options: { trigger?: number; folded?: ReadonlySet<string>; subtree?: string | null } = {},
): MapLayout {
  const common = lines.length
    ? lines.slice(1).reduce((n, line) => Math.min(n, sharedPlies(lines[0]!.moves, line.moves)), lines[0]!.moves.length)
    : 0;
  const trigger = Math.min(options.trigger ?? common, common);
  const info = lineParents(lines, trigger);
  const parents = new Map([...info].map(([id, { parent }]) => [id, parent]));
  const byId = new Map(lines.map((line) => [line.id, line]));
  const folded = options.folded ?? new Set<string>();

  // Lane order: a line, then the lines growing out of it, the latest branch first (nearest), each with its own.
  const order: { id: string; folded: number }[] = [];
  const place = (id: string) => {
    const hidden = folded.has(id) ? descendants(parents, id).length : 0;
    order.push({ id, folded: hidden });
    if (hidden) return;
    const children = lines
      .filter((line) => parents.get(line.id) === id)
      .sort((a, b) => info.get(b.id)!.startPly - info.get(a.id)!.startPly);
    for (const child of children) place(child.id);
  };
  const roots = options.subtree
    ? [options.subtree]
    : lines.filter((line) => parents.get(line.id) === null).map((l) => l.id);
  for (const root of roots) if (byId.has(root)) place(root);

  const lanes: MapLane[] = [];
  const nodes: MapNode[] = [];
  const byKey = new Map<string, MapNode>();
  for (const { id, folded: hidden } of order) {
    const line = byId.get(id)!;
    const { startPly, parent } = info.get(id)!;
    if (startPly >= line.moves.length) continue;
    const lane = lanes.length;
    lanes.push({
      line,
      lane,
      parent: options.subtree === id ? null : parent,
      startPly,
      from: startPly > trigger ? keyOf(line.moves, startPly) : null,
      folded: hidden,
    });
    for (let ply = startPly; ply < line.moves.length; ply++) {
      const key = keyOf(line.moves, ply + 1);
      if (byKey.has(key)) continue;
      const node: MapNode = { key, ply, column: ply - trigger + 1, lane, line: id, move: line.moves[ply]! };
      nodes.push(node);
      byKey.set(key, node);
    }
  }
  const columns = nodes.reduce((n, node) => Math.max(n, node.column + 1), 1);
  return { trigger: lines[0]?.moves.slice(0, trigger) ?? [], lanes, nodes, columns, parents, byKey };
}
