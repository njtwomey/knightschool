import { playUci } from '../chess/chess';
import { START_EPD } from '../chess/epd';
import { positionId } from '../chess/position-id';
import type { Side } from '../schema/content';

/**
 * A prefix tree of lines: one node per move sequence from the initial position. Nodes are keyed by the moves that lead
 * there, not by the position, so two move orders that transpose stay two nodes and it is always a tree. It knows
 * nothing about drawing (`laneLayout` lays it out).
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

/** The node ids along one line, root first; empty for a line the tree does not have. */
export function pathOf(tree: MoveTree, line: string): string[] {
  const path = tree.paths.get(line);
  if (!path) return [];
  return [tree.root, ...path.moves.map((_, index) => prefixId(path.moves.slice(0, index + 1)))];
}

/** The moves from the start to a node, as SAN; none for the root or an unknown node. */
export function sansOf(tree: MoveTree, nodeId: string): string[] {
  const sans: string[] = [];
  for (let node = tree.nodes.get(nodeId); node?.san; node = node.parent ? tree.nodes.get(node.parent) : undefined)
    sans.unshift(node.san);
  return sans;
}
