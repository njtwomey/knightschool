import { describe, expect, it } from 'vitest';
import { ancestorsOf, openToDepth, tidyLayout } from './tree-layout';

//        r
//     /  |  \
//    a   b   c
//   / \      |
//  a1 a2     c1
//            / \
//          c11 c12
const tree: Record<string, string[]> = { r: ['a', 'b', 'c'], a: ['a1', 'a2'], c: ['c1'], c1: ['c11', 'c12'] };
const children = (id: string) => tree[id] ?? [];
const parents = new Map(Object.entries(tree).flatMap(([parent, kids]) => kids.map((kid) => [kid, parent] as const)));
const parentOf = (id: string) => parents.get(id) ?? null;

describe('tidyLayout', () => {
  it('gives each leaf its own slot and puts a parent halfway between its first and last child', () => {
    const layout = tidyLayout('r', children, () => true);
    expect(Object.fromEntries(layout.nodes.map((node) => [node.id, [node.depth, node.slot]]))).toEqual({
      r: [0, 2],
      a: [1, 0.5],
      a1: [2, 0],
      a2: [2, 1],
      b: [1, 2],
      c: [1, 3.5],
      c1: [2, 3.5],
      c11: [3, 3],
      c12: [3, 4],
    });
    expect(layout.slots).toBe(5);
    expect(layout.depth).toBe(3);
  });

  it('gives a closed node one slot and shows nothing below it', () => {
    const layout = tidyLayout('r', children, (id) => id !== 'c');
    expect(layout.nodes.map((node) => [node.id, node.slot, node.open])).toEqual([
      ['r', 1.75, true],
      ['a', 0.5, true],
      ['a1', 0, false],
      ['a2', 1, false],
      ['b', 2, false],
      ['c', 3, false],
    ]);
  });

  it('lists nodes depth first with their parents, and never puts two at one depth in one slot', () => {
    const layout = tidyLayout('r', children, () => true);
    expect(layout.nodes.map((node) => node.parent)).toEqual([null, 'r', 'a', 'a', 'r', 'r', 'c', 'c1', 'c1']);
    const keys = layout.nodes.map((node) => `${node.depth}:${node.slot}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('draws a lone root', () => {
    expect(
      tidyLayout(
        'x',
        () => [],
        () => true,
      ),
    ).toEqual({
      nodes: [{ id: 'x', parent: null, depth: 0, slot: 0, open: false }],
      slots: 1,
      depth: 0,
    });
  });
});

describe('openToDepth and ancestorsOf', () => {
  it('opens the top levels that have children', () => {
    expect([...openToDepth('r', children, 1)]).toEqual(['r']);
    expect([...openToDepth('r', children, 2)]).toEqual(['r', 'a', 'c']);
    expect([...openToDepth('r', children, 0)]).toEqual([]);
  });

  it('finds every node above the given ones', () => {
    expect([...ancestorsOf(['c11', 'a2'], parentOf)]).toEqual(['c1', 'c', 'r', 'a']);
    expect([...ancestorsOf(['r'], parentOf)]).toEqual([]);
  });
});
