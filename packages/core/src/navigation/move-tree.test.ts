import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from '../chess/chess';
import { START_EPD } from '../chess/epd';
import { buildMoveTree, pathOf, prefixId, sansOf, type MovePath } from './move-tree';

const path = (line: string, moves: string, courses: string[] = [], side: 'white' | 'black' = 'white'): MovePath => ({
  line,
  moves: moves.split(' '),
  courses,
  side,
  name: line,
});

const italian = path('italian', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3', ['italian-course']);
const evans = path('evans', 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3', ['evans-course', 'italian-course']);
const twoKnights = path('two-knights', 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6', ['italian-course'], 'black');
const short = path('short', 'e2e4 e7e5 g1f3', ['other-course']);

describe('buildMoveTree', () => {
  const tree = buildMoveTree([italian, evans, twoKnights, short]);

  it('shares a common prefix as one node and branches where lines part', () => {
    expect(tree.nodes.size).toBe(1 + 7 + 3 + 1);
    const atBc4 = tree.nodes.get(prefixId(italian.moves.slice(0, 5)))!;
    expect(atBc4.children).toHaveLength(2);
    expect(atBc4.lines).toEqual(['italian', 'evans', 'two-knights']);
    expect(atBc4.courses).toEqual(['italian-course', 'evans-course']);
    expect(atBc4).toMatchObject({ ply: 5, uci: 'f1c4', san: 'Bc4', epd: epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4') });
  });

  it('marks where each line ends, including a line that ends where others carry on', () => {
    expect(tree.nodes.get(prefixId(short.moves))!.ends).toEqual(['short']);
    expect(tree.nodes.get(prefixId(short.moves))!.children).toHaveLength(1);
    expect(tree.nodes.get(prefixId(evans.moves))!.ends).toEqual(['evans']);
  });

  it('gives the moves from the start to a node as SAN', () => {
    expect(sansOf(tree, prefixId(short.moves))).toEqual(['e4', 'e5', 'Nf3']);
    expect(sansOf(tree, tree.root)).toEqual([]);
    expect(sansOf(tree, 'nowhere')).toEqual([]);
  });

  it('starts from a root at ply 0 holding every line', () => {
    const root = tree.nodes.get(tree.root)!;
    expect(root).toMatchObject({ parent: null, ply: 0, uci: null, san: null, epd: START_EPD });
    expect(root.lines).toEqual(['italian', 'evans', 'two-knights', 'short']);
  });

  it('keeps two move orders that reach the same position as two nodes', () => {
    const transposed = buildMoveTree([path('a', 'g1f3 g8f6 e2e4'), path('b', 'e2e4 g8f6 g1f3')]);
    const ends = [...transposed.nodes.values()].filter((node) => node.ends.length);
    expect(ends).toHaveLength(2);
    expect(ends[0]!.epd).toBe(ends[1]!.epd);
    expect(ends[0]!.id).not.toBe(ends[1]!.id);
  });

  it('names the line with an illegal move', () => {
    expect(() => buildMoveTree([path('bad', 'e2e4 e2e4')])).toThrow(/bad: illegal move e2e4 at ply 2/);
  });
});

describe('pathOf', () => {
  const tree = buildMoveTree([italian, evans]);

  it('lists the nodes along a line, root first', () => {
    const ids = pathOf(tree, 'evans');
    expect(ids).toHaveLength(evans.moves.length + 1);
    expect(ids[0]).toBe(tree.root);
    expect(tree.nodes.get(ids.at(-1)!)!.ends).toEqual(['evans']);
    expect(ids.every((id) => tree.nodes.has(id))).toBe(true);
  });

  it('is empty for a line the tree does not have', () => {
    expect(pathOf(tree, 'nope')).toEqual([]);
  });
});
