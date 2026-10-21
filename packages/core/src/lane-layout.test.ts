import { describe, expect, it } from 'vitest';
import { laneLayout, subtreeOf } from './lane-layout';
import { buildMoveTree, pathOf, prefixId } from './move-tree';

const ITALIAN = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4'];
const line = (name: string, moves: string[]) => ({ line: name, moves, courses: ['c'], side: 'white' as const, name });
const tree = buildMoveTree([
  line('main', [...ITALIAN, 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'a7a6', 'h2h3']),
  line('evans', [...ITALIAN, 'f8c5', 'b2b4']),
  line('two-knights', [...ITALIAN, 'g8f6', 'f3g5']),
  line('late', [...ITALIAN, 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d5']),
  line('copy', [...ITALIAN, 'f8c5', 'b2b4']),
]);
const order = ['main', 'evans', 'two-knights', 'late', 'copy'];

describe('laneLayout', () => {
  const layout = laneLayout(tree, order);
  const at = (moves: string[]) => layout.places.get(prefixId(moves))!;

  it('starts at the last move every line shares, one row per ply', () => {
    expect(layout.top).toBe(prefixId(ITALIAN));
    expect(layout.firstPly).toBe(5);
    expect(layout.rows).toBe(7); // 3.Bc4 down to 6.h3
    expect(at([...ITALIAN, 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'a7a6', 'h2h3']).row).toBe(6);
  });

  it('runs the main line along lane 0 and puts the latest branch nearest it, the earliest furthest', () => {
    expect(
      pathOf(tree, 'main')
        .slice(5)
        .every((id) => layout.places.get(id)!.lane === 0),
    ).toBe(true);
    expect(layout.laneOf.get('late')).toBe(1); // branches after 5.d3
    expect(at([...ITALIAN, 'f8c5', 'b2b4'])).toMatchObject({ row: 2, lane: 2, line: 'evans' }); // after 3...Bc5
    expect(at([...ITALIAN, 'g8f6'])).toMatchObject({ row: 1, lane: 3, line: 'two-knights' }); // after 3.Bc4
    expect(layout.lanes).toBe(4);
  });

  it('never crosses lines: a branch only passes lanes that start where it does or later', () => {
    for (const { from, to } of layout.edges) {
      const a = layout.places.get(from)!;
      const b = layout.places.get(to)!;
      const [low, high] = [Math.min(a.lane, b.lane), Math.max(a.lane, b.lane)];
      for (const other of layout.places.values())
        if (other.lane > low && other.lane < high)
          expect(other.row, `${to} crosses lane ${other.lane}`).toBeGreaterThanOrEqual(b.row);
    }
  });

  it('puts a line with no moves of its own in the lane of the line it copies, and joins every placed move', () => {
    expect(layout.laneOf.get('copy')).toBe(2);
    expect(layout.edges).toHaveLength(layout.places.size - 1);
    expect(layout.pathOf.get('evans')).toEqual(pathOf(tree, 'evans').slice(5));
  });

  it('knows which line each line grows out of, for an index shaped like the tree', () => {
    expect(Object.fromEntries(layout.parentOf)).toEqual({
      main: null,
      evans: 'main',
      'two-knights': 'main',
      late: 'main',
      copy: 'evans',
    });
    expect(layout.branchAt.get('evans')).toBe(prefixId([...ITALIAN, 'f8c5']));
    expect(subtreeOf(layout, 'evans')).toEqual(['evans', 'copy']);
    expect(subtreeOf(layout, 'main')).toHaveLength(5);
  });
});
