/**
 * A tidy layout for any tree given by ids, with subtrees that can be closed. Each shown leaf (or closed node) takes the
 * next slot across, and a parent sits halfway between its first and last child, so subtrees never overlap and edges
 * never cross. The other axis is the caller's: the tree drawing puts a node at its ply, so the root is at the top and
 * the plies go down.
 */
export type PlacedNode = {
  id: string;
  parent: string | null;
  /** Levels below the root. */
  depth: number;
  /** Position across, in slots from 0. A leaf's slot is whole; a parent's can be halfway between two. */
  slot: number;
  /** It has children and they are shown. */
  open: boolean;
};

export type TreeLayout = { nodes: PlacedNode[]; slots: number; depth: number };

export function tidyLayout(
  root: string,
  children: (id: string) => readonly string[],
  isOpen: (id: string) => boolean,
): TreeLayout {
  const nodes: PlacedNode[] = [];
  let next = 0;
  let depth = 0;
  const place = (id: string, parent: string | null, level: number): number => {
    const kids = children(id);
    const open = kids.length > 0 && isOpen(id);
    const placed: PlacedNode = { id, parent, depth: level, slot: 0, open };
    nodes.push(placed);
    depth = Math.max(depth, level);
    if (open) {
      const slots = kids.map((kid) => place(kid, id, level + 1));
      placed.slot = (slots[0]! + slots.at(-1)!) / 2;
    } else {
      placed.slot = next++;
    }
    return placed.slot;
  };
  place(root, null, 0);
  return { nodes, slots: next, depth };
}

/** Ids of the nodes less than `depth` levels below the root that have children: the ones to open at first. */
export function openToDepth(root: string, children: (id: string) => readonly string[], depth: number): Set<string> {
  const open = new Set<string>();
  const visit = (id: string, level: number) => {
    const kids = children(id);
    if (level >= depth || kids.length === 0) return;
    open.add(id);
    kids.forEach((kid) => visit(kid, level + 1));
  };
  visit(root, 0);
  return open;
}

/** Ids of every node above the given ones: what must be open for them to show. */
export function ancestorsOf(ids: Iterable<string>, parentOf: (id: string) => string | null | undefined): Set<string> {
  const above = new Set<string>();
  for (const id of ids) {
    for (let parent = parentOf(id); parent && !above.has(parent); parent = parentOf(parent)) above.add(parent);
  }
  return above;
}
