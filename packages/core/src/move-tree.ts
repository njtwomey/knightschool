import { playUci } from './chess';
import { START_EPD } from './epd';
import { positionId } from './position-id';
import type { Side } from './schema/content';

/**
 * A prefix tree of lines: one node per move sequence from the initial position. Nodes are keyed by the moves that lead
 * there, not by the position, so two move orders that transpose stay two nodes and it is always a tree. It knows
 * nothing about drawing; `compress` gives the shape worth drawing (branch points and ends only).
 */
export type MovePath = {
  line: string;
  /** UCI moves from the initial position. */
  moves: string[];
  /** The courses that list the line. */
  courses: string[];
  side: Side;
  name: string;
};

export type MoveNode = {
  id: string;
  parent: string | null;
  /** In the order lines first reached them. */
  children: string[];
  /** Plies from the initial position: 0 at the root. */
  ply: number;
  /** The move that leads here; null at the root. */
  uci: string | null;
  san: string | null;
  epd: string;
  /** Lines that pass through (or end at) this node, and the courses that list them. */
  lines: string[];
  courses: string[];
  /** Lines whose last move this is. */
  ends: string[];
};

export type MoveTree = { root: string; nodes: Map<string, MoveNode>; paths: Map<string, MovePath> };

/** The id of the node a move sequence leads to: a short hash of the UCI moves. The root is `prefixId([])`. */
export const prefixId = (moves: readonly string[]) => positionId(moves.join(' '));

const addAll = (into: string[], items: readonly string[]) => {
  for (const item of items) if (!into.includes(item)) into.push(item);
};

/** Builds the prefix tree of some lines. Throws on an illegal move, naming the line. */
export function buildMoveTree(paths: readonly MovePath[], startEpd = START_EPD): MoveTree {
  const root = prefixId([]);
  const nodes = new Map<string, MoveNode>([
    [
      root,
      {
        id: root,
        parent: null,
        children: [],
        ply: 0,
        uci: null,
        san: null,
        epd: startEpd,
        lines: [],
        courses: [],
        ends: [],
      },
    ],
  ]);
  const byLine = new Map<string, MovePath>();
  for (const path of paths) {
    byLine.set(path.line, path);
    let node = nodes.get(root)!;
    addAll(node.lines, [path.line]);
    addAll(node.courses, path.courses);
    path.moves.forEach((uci, index) => {
      const id = prefixId(path.moves.slice(0, index + 1));
      let next = nodes.get(id);
      if (!next) {
        let played: ReturnType<typeof playUci>;
        try {
          played = playUci(node.epd, uci);
        } catch {
          throw new Error(`${path.line}: illegal move ${uci} at ply ${index + 1}`);
        }
        next = {
          id,
          parent: node.id,
          children: [],
          ply: index + 1,
          uci,
          san: played.san,
          epd: played.epd,
          lines: [],
          courses: [],
          ends: [],
        };
        nodes.set(id, next);
        node.children.push(id);
      }
      addAll(next.lines, [path.line]);
      addAll(next.courses, path.courses);
      node = next;
    });
    addAll(node.ends, [path.line]);
  }
  return { root, nodes, paths: byLine };
}

/**
 * Keeps only what some lines pass through: the lines named, and the lines any of the courses list. With neither, the
 * tree is returned as it is. A node keeps only the kept lines, and the courses of those lines that are in scope.
 */
export function scopeTree(tree: MoveTree, scope: { courses?: readonly string[]; lines?: readonly string[] }): MoveTree {
  if (!scope.courses && !scope.lines) return tree;
  const keep = new Set(
    [...tree.paths.values()]
      .filter(
        (path) =>
          scope.lines?.includes(path.line) || path.courses.some((course) => scope.courses?.includes(course) ?? false),
      )
      .map((path) => path.line),
  );
  const inScope = (course: string) => !scope.courses || scope.courses.includes(course);
  const nodes = new Map<string, MoveNode>();
  for (const node of tree.nodes.values()) {
    const lines = node.lines.filter((line) => keep.has(line));
    if (lines.length === 0 && node.id !== tree.root) continue;
    const courses: string[] = [];
    for (const line of lines) addAll(courses, tree.paths.get(line)!.courses.filter(inScope));
    nodes.set(node.id, { ...node, lines, courses, ends: node.ends.filter((line) => keep.has(line)), children: [] });
  }
  for (const node of nodes.values()) {
    node.children = tree.nodes.get(node.id)!.children.filter((child) => nodes.has(child));
  }
  const paths = new Map([...tree.paths].filter(([line]) => keep.has(line)));
  return { root: tree.root, nodes, paths };
}

/** The node ids along one line, root first; empty for a line the tree does not have. */
export function pathOf(tree: MoveTree, line: string): string[] {
  const path = tree.paths.get(line);
  if (!path) return [];
  return [tree.root, ...path.moves.map((_, index) => prefixId(path.moves.slice(0, index + 1)))];
}

/** A stretch of single moves drawn as one edge, ending at a branch point, the end of a line, or both. */
export type MoveRun = {
  /** The id of its last move node. */
  id: string;
  /** The run it continues from; null for the root. */
  parent: string | null;
  children: string[];
  /** Its move nodes, first to last; empty for the root. */
  moves: MoveNode[];
  /** At the last move: the ply, position, lines through it, their courses, and lines that end there. */
  ply: number;
  epd: string;
  lines: string[];
  courses: string[];
  ends: string[];
};

export type CompressedTree = { root: string; runs: Map<string, MoveRun> };

/** The last node of the moves every line shares (the root when the first moves already differ). */
export function trunkEnd(tree: MoveTree): MoveNode {
  let node = tree.nodes.get(tree.root)!;
  while (node.children.length === 1 && node.ends.length === 0) node = tree.nodes.get(node.children[0]!)!;
  return node;
}

/**
 * Every move its own node, except the moves all lines share, which are one: what a course's tree draws. Lines that
 * start "1.e4 e5 2.Nf3 Nc6 3.Bc4" then begin under one node that says so.
 */
export function everyMove(tree: MoveTree): CompressedTree {
  const trunk = trunkEnd(tree).ply;
  return compress(tree, (node) => node.ply >= trunk);
}

/**
 * Joins every run of moves with no choice in it into one edge: the nodes left are the root, branch points and the ends
 * of lines. A line that ends where others carry on stops the run there too, so every end can be marked. `keep` keeps
 * more nodes of their own (`keep: () => true` keeps every move).
 */
export function compress(tree: MoveTree, keep?: (node: MoveNode) => boolean): CompressedTree {
  const runs = new Map<string, MoveRun>();
  const stops = (node: MoveNode) => node.children.length !== 1 || node.ends.length > 0 || (keep?.(node) ?? false);
  const runFrom = (node: MoveNode, parent: string | null, moves: MoveNode[]): string => {
    const run: MoveRun = {
      id: node.id,
      parent,
      children: [],
      moves,
      ply: node.ply,
      epd: node.epd,
      lines: node.lines,
      courses: node.courses,
      ends: node.ends,
    };
    runs.set(node.id, run);
    for (const childId of node.children) {
      const stretch: MoveNode[] = [];
      let next = tree.nodes.get(childId)!;
      stretch.push(next);
      while (!stops(next)) {
        next = tree.nodes.get(next.children[0]!)!;
        stretch.push(next);
      }
      run.children.push(runFrom(next, node.id, stretch));
    }
    return node.id;
  };
  runFrom(tree.nodes.get(tree.root)!, null, []);
  return { root: tree.root, runs };
}

/** "1.e4", "1...e5": a move with its number, from the plies before it. */
export const numberedMove = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'}${san}`;

/** Moves as numbered text, "4.b4 Bxb4 5.c3", where the first is played after `from` plies. */
export function numberedLine(sans: readonly string[], from = 0): string {
  return sans
    .map((san, index) => (index === 0 || (from + index) % 2 === 0 ? numberedMove(from + index, san) : san))
    .join(' ');
}

/** A run's moves as numbered text. */
export const runText = (run: Pick<MoveRun, 'moves'>) =>
  run.moves.length
    ? numberedLine(
        run.moves.map((move) => move.san!),
        run.moves[0]!.ply - 1,
      )
    : '';
