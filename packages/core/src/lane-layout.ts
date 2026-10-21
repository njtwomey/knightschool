import { pathOf, type MoveTree } from './move-tree';

/** Where one move sits: its row (plies after the first row's) and its lane, and the line that owns its lane. */
export type LanePlace = { id: string; row: number; lane: number; line: string };

export type LaneLayout = {
  /** The node shown in the first row: the last move every line shares (it stands for the moves before it too). */
  top: string;
  /** The ply of the top node; a node's ply is `firstPly + row`. */
  firstPly: number;
  rows: number;
  lanes: number;
  places: Map<string, LanePlace>;
  /** Parent to child, both placed. */
  edges: { from: string; to: string }[];
  /** The lane each line ends in (a line that adds no moves of its own ends in another line's lane). */
  laneOf: Map<string, number>;
  /** The nodes along each line from the top, for highlighting. */
  pathOf: Map<string, string[]>;
  /**
   * The line each line grows out of (null for the first) and the node it branches after: the course's lines as a
   * hierarchy, for an index shaped like the tree. A line that adds no moves of its own hangs off the line it copies.
   */
  parentOf: Map<string, string | null>;
  branchAt: Map<string, string>;
};

/** A line and every line that grows out of it, at any depth, in layout order. */
export function subtreeOf(layout: LaneLayout, line: string): string[] {
  const out = [line];
  for (const candidate of layout.parentOf.keys())
    if (out.includes(layout.parentOf.get(candidate) ?? '') && !out.includes(candidate)) out.push(candidate);
  return out;
}

/**
 * A git-history layout of some lines of a move tree, for reading rather than for admiring: one row per ply (drawn as a
 * column, left to right), so the same move number lines up across every line, and one lane per line. The first line
 * in `order` (the main line) runs straight along lane 0. Under each line come the lines that grow out of it, the one
 * that branches latest nearest and the earliest furthest away, each followed by its own branches, so no line crosses
 * another. Moves shared by several lines belong to the first of them in `order`. Rows start at the last move every
 * line shares, so a course does not spend rows on its trigger.
 */
export function laneLayout(
  tree: MoveTree,
  order: readonly string[],
  /**
   * `maxPly`: start no deeper than this ply, so a few lines drawn on their own (one line alone shares every move with
   * itself) still show their moves rather than one pill for all of them.
   */
  options: { maxPly?: number } = {},
): LaneLayout {
  const lines = order.filter((line) => tree.paths.has(line));
  const paths = new Map(lines.map((line) => [line, pathOf(tree, line)]));
  // The top: the deepest node every line passes through.
  let topIndex = 0;
  const first = paths.get(lines[0] ?? '') ?? [tree.root];
  while (
    topIndex + 1 < first.length &&
    lines.every((line) => paths.get(line)![topIndex + 1] === first[topIndex + 1]) &&
    lines.every((line) => paths.get(line)!.length > topIndex + 2) &&
    (options.maxPly === undefined || topIndex + 1 <= options.maxPly)
  )
    topIndex++;
  const top = first[topIndex] ?? tree.root;
  const firstPly = tree.nodes.get(top)?.ply ?? 0;

  // First pass: which line owns each move (the first to reach it), and where each line branches off which.
  const owner = new Map<string, string>([[top, lines[0] ?? '']]);
  const own = new Map<string, string[]>(); // a line's own moves
  const parentOf = new Map<string, string | null>();
  const branchAt = new Map<string, string>();
  const pathFromTop = new Map<string, string[]>();
  for (const [index, line] of lines.entries()) {
    const path = paths.get(line)!.slice(topIndex);
    pathFromTop.set(line, path);
    const fresh = path.findIndex((id) => !owner.has(id));
    const after = fresh === -1 ? path.at(-1)! : (path[fresh - 1] ?? top);
    parentOf.set(line, index === 0 ? null : owner.get(after)!);
    branchAt.set(line, after);
    const mine = fresh === -1 ? [] : path.slice(fresh);
    for (const id of mine) owner.set(id, line);
    own.set(line, mine);
  }

  // Second pass: lanes in tree order. Under each line come the lines that grow out of it, the latest branch first and
  // the earliest last, each followed by its own branches. A branch then only passes lanes that start later than it
  // does, so no line crosses another.
  const rowOf = (id: string) => pathFromTop.get(owner.get(id)!)!.indexOf(id);
  const laneOf = new Map<string, number>();
  let lanes = 0;
  const visit = (line: string) => {
    if (own.get(line)!.length > 0 || line === lines[0]) laneOf.set(line, lanes++);
    const children = lines
      .filter((candidate) => parentOf.get(candidate) === line)
      .map((candidate, order) => ({ candidate, order, row: rowOf(branchAt.get(candidate)!) }))
      .sort((x, y) => y.row - x.row || x.order - y.order);
    for (const { candidate } of children) visit(candidate);
  };
  if (lines[0]) visit(lines[0]);
  // A line with no moves of its own sits in the lane of the line it copies.
  for (const line of lines)
    if (!laneOf.has(line)) laneOf.set(line, laneOf.get(owner.get(pathFromTop.get(line)!.at(-1)!)!)!);

  const places = new Map<string, LanePlace>();
  let rows = 1;
  places.set(top, { id: top, row: 0, lane: 0, line: lines[0] ?? '' });
  for (const line of lines) {
    const path = pathFromTop.get(line)!;
    for (const id of own.get(line)!) {
      const row = path.indexOf(id);
      places.set(id, { id, row, lane: laneOf.get(line)!, line });
      rows = Math.max(rows, row + 1);
    }
  }

  const edges: { from: string; to: string }[] = [];
  for (const id of places.keys()) {
    const parent = tree.nodes.get(id)?.parent;
    if (id !== top && parent && places.has(parent)) edges.push({ from: parent, to: id });
  }
  return {
    top,
    firstPly,
    rows,
    lanes: Math.max(lanes, 1),
    places,
    edges,
    laneOf,
    pathOf: pathFromTop,
    parentOf,
    branchAt,
  };
}
