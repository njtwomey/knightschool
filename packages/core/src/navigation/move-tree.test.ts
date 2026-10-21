import { describe, expect, it } from 'vitest';
import { epdAfterPgn } from '../chess/chess';
import { START_EPD } from '../chess/epd';
import {
  buildMoveTree,
  compress,
  everyMove,
  pathOf,
  prefixId,
  runText,
  sansOf,
  scopeTree,
  trunkEnd,
  type MovePath,
  type MoveTree,
} from './move-tree';

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

/** The tree as indented text, child order kept: "san [lines] (ends)". */
const outline = (tree: MoveTree) => {
  const out: string[] = [];
  const visit = (id: string, depth: number) => {
    const node = tree.nodes.get(id)!;
    const ends = node.ends.length ? ` (ends ${node.ends.join(',')})` : '';
    out.push(`${'  '.repeat(depth)}${node.san ?? 'start'} ${node.lines.length}${ends}`);
    node.children.forEach((child) => visit(child, depth + 1));
  };
  visit(tree.root, 0);
  return out;
};

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

describe('scopeTree', () => {
  const tree = buildMoveTree([italian, evans, twoKnights, short]);

  it('keeps only the lines a course lists, and only its courses', () => {
    const scoped = scopeTree(tree, { courses: ['evans-course'] });
    expect(outline(scoped)).toEqual([
      'start 1',
      '  e4 1',
      '    e5 1',
      '      Nf3 1',
      '        Nc6 1',
      '          Bc4 1',
      '            Bc5 1',
      '              b4 1',
      '                Bxb4 1',
      '                  c3 1 (ends evans)',
    ]);
    expect(scoped.nodes.get(scoped.root)!.courses).toEqual(['evans-course']);
    expect([...scoped.paths.keys()]).toEqual(['evans']);
  });

  it('keeps named lines, and everything when there is no scope', () => {
    expect([...scopeTree(tree, { lines: ['short', 'two-knights'] }).paths.keys()]).toEqual(['two-knights', 'short']);
    expect(scopeTree(tree, {})).toBe(tree);
  });

  it('leaves the original tree alone', () => {
    scopeTree(tree, { lines: ['short'] });
    expect(tree.nodes.get(tree.root)!.children).toHaveLength(1);
    expect(tree.nodes.get(prefixId(italian.moves.slice(0, 5)))!.lines).toHaveLength(3);
  });
});

describe('compress', () => {
  const tree = buildMoveTree([italian, evans, twoKnights, short]);
  const { root, runs } = compress(tree);

  it('keeps only the root, branch points and line ends, each with the moves that lead to it', () => {
    const texts = (id: string): string[] =>
      runs.get(id)!.children.flatMap((child) => [runText(runs.get(child)!), ...texts(child)]);
    expect(texts(root)).toEqual([
      '1. e4 e5 2. Nf3',
      '2... Nc6 3. Bc4',
      '3... Bc5',
      '4. c3',
      '4. b4 Bxb4 5. c3',
      '3... Nf6',
    ]);
    expect(runs.size).toBe(7);
  });

  it('stops a run where a line ends even if others carry on', () => {
    const atNf3 = runs.get(prefixId(short.moves))!;
    expect(atNf3.ends).toEqual(['short']);
    expect(atNf3.children).toHaveLength(1);
    expect(atNf3.parent).toBe(root);
  });

  it('carries the last move node of a run as its id, ply and position', () => {
    const evansEnd = runs.get(prefixId(evans.moves))!;
    expect(evansEnd.moves.map((move) => move.san)).toEqual(['b4', 'Bxb4', 'c3']);
    expect(evansEnd).toMatchObject({ ply: 9, lines: ['evans'], ends: ['evans'] });
    expect(evansEnd.epd).toBe(tree.nodes.get(prefixId(evans.moves))!.epd);
  });
});

describe('trunkEnd and everyMove', () => {
  const tree = buildMoveTree([italian, evans, twoKnights]);

  it('finds where the lines first part', () => {
    expect(trunkEnd(tree)).toMatchObject({ san: 'Bc4', ply: 5 });
    expect(trunkEnd(buildMoveTree([italian, short]))).toMatchObject({ san: 'Nf3', ply: 3 });
  });

  it('keeps every move below the shared trunk, which is one node', () => {
    const { root, runs } = everyMove(tree);
    const trunk = runs.get(runs.get(root)!.children[0]!)!;
    expect(runText(trunk)).toBe('1. e4 e5 2. Nf3 Nc6 3. Bc4');
    expect(
      [...runs.values()].filter((run) => run.id !== root && run.id !== trunk.id).every((run) => run.moves.length === 1),
    ).toBe(true);
    expect(runs.size).toBe(1 + 1 + (tree.nodes.size - 1 - 5));
  });

  it('keeps every move when told to', () => {
    expect(compress(tree, () => true).runs.size).toBe(tree.nodes.size);
  });
});
