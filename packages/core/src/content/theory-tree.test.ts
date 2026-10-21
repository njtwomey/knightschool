import { describe, expect, it } from 'vitest';
import {
  chapterTitle,
  parseStart,
  projectCourse,
  resolveTree,
  rewrittenMoves,
  sanMoves,
  treeGraph,
  uciLine,
  type Chapter,
} from './theory-tree';
import { positionId } from '../chess/position-id';
import { epdAfterPgn } from '../chess/chess';
import { parsePgn, writePgn } from '../chess/pgn';
import { TreeGraph, type CourseManifest } from '../schema/content';
import { manifestOf } from '../testing/manifest';
import { buildOpening } from './course-build';

const HEADER = `[Event "x"]
[Opening "Italian Game"]
[Variation "Italian Game"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]`;

const chapter = (id: string, body: string, extra: Record<string, string> = {}): Chapter => {
  const tags = Object.entries({ For: 'white', Kind: 'main', Opponent: 'x', ...extra })
    .map(([key, value]) => `[${key} "${value}"]`)
    .join('\n');
  return { id, source: `${id}.pgn`, game: parsePgn(`${HEADER}\n${tags}\n\n${body} *`, `${id}.pgn`) };
};

const italian = chapter('italian', '1. e4 e5 2. Nf3 { Develops and hits e5. } 2... Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4');
const evans = chapter('evans', '4. b4 Bxb4 5. c3 Ba5 6. d4', {
  Start: 'italian 3...Bc5',
  Kind: 'gambit',
});
const twoKnights = chapter('two-knights', '3... Nf6 4. Ng5 d5 5. exd5', { Start: 'italian 3.Bc4' });

const course = (lines: CourseManifest['lines'], over: Partial<CourseManifest> = {}): CourseManifest => {
  const rest: Partial<ReturnType<typeof manifestOf>> = manifestOf({ trigger: '1. e4 e5 2. Nf3 Nc6 3. Bc4' });
  delete rest.lines;
  delete rest.traps;
  return { ...(rest as Omit<CourseManifest, 'lines'>), lines, ...over };
};

describe('sanMoves', () => {
  it('reads a numbered move list', () => {
    expect(sanMoves('1. e4 e5 2. Nf3', 'x')).toEqual(['e4', 'e5', 'Nf3']);
    expect(sanMoves('', 'x')).toEqual([]);
  });
});

describe('resolveTree', () => {
  it('rebuilds a chapter from the start, with the tree annotations on its [Start] moves', () => {
    const tree = resolveTree([italian, evans, twoKnights]);
    const line = tree.lines.get('evans')!;
    expect(line.game.moves.map((move) => move.san)).toEqual([
      ...['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
      ...['b4', 'Bxb4', 'c3', 'Ba5', 'd4'],
    ]);
    expect(line.game.moves[2]!.comment).toBe('Develops and hits e5.');
    expect(line.game.tags.Start).toBeUndefined();
    expect(line.startEpd).toBe(epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5'));
    expect(line.parents).toEqual(['italian']);
    expect(tree.lines.get('two-knights')!.parents).toEqual(['italian']);
    expect(tree.lines.get('italian')!.parents).toEqual([]);
    expect(uciLine(line).slice(0, 3)).toEqual(['e2e4', 'e7e5', 'g1f3']);
    expect(uciLine(undefined)).toEqual([]);
  });

  it('does not care about the order of the chapters', () => {
    const tree = resolveTree([evans, twoKnights, italian]);
    expect([...tree.lines.keys()].sort()).toEqual(['evans', 'italian', 'two-knights']);
  });

  it('holds several of our moves at one position: the tree is theory, a course picks', () => {
    const tree = resolveTree([italian, evans]);
    const at = epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
    const ours = [...tree.edges.values()].filter((edge) => edge.from === at).map((edge) => edge.san);
    expect(ours.sort()).toEqual(['b4', 'c3']);
  });

  it('reads a [Start] as a chapter and the move it branches after, with earlier moves when needed', () => {
    expect(parseStart('evans-gambit 6.d4', 'x')).toEqual({ parent: 'evans-gambit', ply: 10, sans: ['d4'] });
    expect(parseStart('odd 1.h4 d5', 'x')).toEqual({ parent: 'odd', ply: 1, sans: ['h4', 'd5'] });
    expect(parseStart('italian 3...Bc5+', 'x')).toEqual({ parent: 'italian', ply: 5, sans: ['Bc5'] });
    expect(parseStart('', 'x')).toBeUndefined();
    expect(() => parseStart('1. e4 e5', 'x.pgn')).toThrow(/x\.pgn: \[Start "1\. e4 e5"\] should name a chapter/);
  });

  it('fails when a [Start] names a missing chapter, a move the parent does not write, or a circle', () => {
    const stray = chapter('stray', '3. Bb5', { Start: 'nowhere 2...Nc6' });
    expect(() => resolveTree([italian, stray])).toThrow(/stray\.pgn: \[Start\] branches from "nowhere"/);
    const notOwn = chapter('not-own', '4. b4', { Start: 'evans 3...Bc5' }); // 3...Bc5 is italian's move, not evans'
    expect(() => resolveTree([italian, evans, notOwn])).toThrow(/after 3\.\.\.Bc5 in "evans", which does not write/);
    const a = chapter('a', '2. Nf3', { Start: 'b 1...e5' });
    const b = chapter('b', '2. Nc3', { Start: 'a 1...e5' });
    expect(() => resolveTree([a, b])).toThrow(/in a circle: a, b/);
  });

  it('asks for the earlier moves when the parent writes the branch move in two places', () => {
    const firsts = chapter('firsts', '1. h4 ( 1. a3 d5 ) 1... d5');
    const ambiguous = chapter('after-h4', '2. d4', { Start: 'firsts 1...d5' });
    expect(() => resolveTree([firsts, ambiguous])).toThrow(
      /ambiguous: "firsts" writes 1\.\.\.d5 in more than one place/,
    );
    const clear = chapter('after-a3', '2. d4', { Start: 'firsts 1.a3 d5' });
    const tree = resolveTree([firsts, clear]);
    expect(tree.lines.get('after-a3')!.game.moves.map((move) => move.san)).toEqual(['a3', 'd5', 'd4']);
  });

  it('fails on a clashing line id, an illegal move, or two different comments on one move', () => {
    expect(() => resolveTree([italian, { ...evans, id: 'italian' }])).toThrow(/also used by italian\.pgn/);
    expect(() => resolveTree([chapter('bad', '1. e4 e5 2. Ke3')])).toThrow(/bad\.pgn: illegal move 2\.Ke3/);
    const other = chapter('other', '1. e4 e5 2. Nf3 { A different note. } 2... d6');
    expect(() => resolveTree([italian, other])).toThrow(/commented differently/);
  });

  it('shows a move with the comment and marks the tree holds, in every chapter that writes it', () => {
    const copy = chapter('copy', '1. e4 e5 2. Nf3 Nc6 3. Bb5'); // retypes 2.Nf3 without italian's comment
    const line = resolveTree([italian, copy]).lines.get('copy')!;
    expect(line.game.moves[2]).toMatchObject({ san: 'Nf3', comment: 'Develops and hits e5.' });
  });

  it('reports moves written out in more than one chapter', () => {
    const copy = chapter('copy', '1. e4 e5 2. Nf3 Nc6 3. Bb5');
    const moves = rewrittenMoves(resolveTree([italian, copy]));
    expect(moves.map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(moves[0]!.writtenIn).toEqual(['italian', 'copy']);
  });

  it('writes a chapter that starts mid-game so it reads back the same', () => {
    const text = writePgn(evans.game, 6);
    expect(text).toContain('4. b4 Bxb4 5. c3');
    expect(parsePgn(text).moves.map((move) => move.san)).toEqual(evans.game.moves.map((move) => move.san));
  });
});

describe('treeGraph', () => {
  it('lists each chapter with the chapter and move it branches after, and each move once', () => {
    const graph = treeGraph(resolveTree([italian, evans, twoKnights]));
    expect(graph.chapters.map(({ id, parent, after }) => [id, parent, after])).toEqual([
      ['italian', null, null],
      ['evans', 'italian', '3...Bc5'],
      ['two-knights', 'italian', '3.Bc4'],
    ]);
    expect(graph.chapters[1]!.from).toBe(positionId(epdAfterPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')));
    expect(graph.chapters.map(({ id, ply, moves }) => [id, ply, moves.join(' ')])).toEqual([
      ['italian', 0, 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4'],
      ['evans', 6, 'e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 b2b4 c5b4 c2c3 b4a5 d2d4'],
      ['two-knights', 5, 'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5'],
    ]);
    expect(graph.chapters[0]).toMatchObject({ name: 'Italian Game', opening: 'Italian Game', courses: [] });
    expect(TreeGraph.parse(graph)).toEqual(graph);
    const listed = treeGraph(resolveTree([italian]), (line) => (line === 'italian' ? ['a', 'b'] : []));
    expect(listed.chapters[0]!.courses).toEqual(['a', 'b']);
    const fromRoot = graph.moves.filter((move) => move.from === graph.root);
    expect(fromRoot).toEqual([
      { from: graph.root, to: positionId(epdAfterPgn('1. e4')), san: 'e4', chapters: ['italian'] },
    ]);
    expect(graph.moves).toHaveLength(9 + 5 + 4);
  });
});

describe('chapterTitle', () => {
  it.each([
    ['Short Variation', 'Caro-Kann Defence: Advance Variation', 'Caro-Kann Defence: Short Variation'],
    ['Scandinavian Defense: Main Line', 'Scandinavian Defense', 'Scandinavian Defense: Main Line'],
    ['Hillbilly Attack', 'Caro-Kann Defence', 'Caro-Kann Defence: Hillbilly Attack'],
    ['Caro-Kann Defence, Two Knights', 'Caro-Kann Defence', 'Caro-Kann Defence, Two Knights'],
    ['Mieses Opening', '', 'Mieses Opening'],
  ])('%s in %s reads %s', (name, opening, title) => {
    expect(chapterTitle({ name, opening })).toBe(title);
  });
});

describe('projectCourse', () => {
  const tree = resolveTree([italian, evans, twoKnights]);

  it('gives the same tree as a course whose lines are written out in full', () => {
    const projected = projectCourse(
      'italian-course',
      course(['italian', { id: 'two-knights', kind: 'sideline', alternative: false }]),
      tree,
    );
    const full = (id: string, body: string, kind: string) => ({
      id,
      kind: 'line' as const,
      source: `${id}.pgn`,
      game: parsePgn(`${HEADER}\n[Kind "${kind}"]\n\n${body} *`),
    });
    const manifest = manifestOf({ trigger: '1. e4 e5 2. Nf3 Nc6 3. Bc4', lines: ['italian', 'two-knights'] });
    manifest.lines[1]!.kind = 'sideline';
    const written = buildOpening('italian-course', manifest, [
      full('italian', '1. e4 e5 2. Nf3 { Develops and hits e5. } 2... Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4', 'main'),
      full(
        'two-knights',
        '1. e4 e5 2. Nf3 { Develops and hits e5. } 2... Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5',
        'sideline',
      ),
    ]);
    expect(projected.nodes).toEqual(written.nodes);
    expect(projected.opening.variants).toEqual(written.opening.variants);
  });

  it('takes kind and opponent from the chapter unless the course overrides them', () => {
    const projected = projectCourse('evans-course', course(['evans', { id: 'italian', alternative: true }]), tree);
    const [first, second] = projected.opening.variants;
    expect(first).toMatchObject({ id: 'evans', weight: 'gambit', opponent: 'x' });
    expect(second).toMatchObject({ id: 'italian', alternative: true });
  });

  it('lets two courses answer one position differently, but not one course', () => {
    expect(() => projectCourse('both', course(['italian', 'evans']), tree)).toThrow(/two repertoire moves/);
  });

  it('turns a chapter whose [Kind] is a trap kind into a trap', () => {
    const trap = chapter('trap', '4... Nd4 5. Nxe5', { Start: 'italian 4.c3', Kind: 'for-us' });
    const projected = projectCourse('c', course(['italian', 'trap']), resolveTree([italian, trap]));
    expect(projected.opening.variants.map((variant) => [variant.id, variant.kind, variant.whose])).toEqual([
      ['italian', 'line', undefined],
      ['trap', 'refutation', 'for-us'],
    ]);
  });

  it('turns a trap written for one side into the other kind of trap for a course of the other side', () => {
    const trap = chapter('trap', '4... Nd4? 5. Nxe5', {
      Start: 'italian 4.c3',
      Kind: 'for-us',
    });
    const blackChapter = chapter('black-line', '4... Nf6', {
      Start: 'italian 4.c3',
      For: 'black',
    });
    const both = resolveTree([italian, trap, blackChapter]);
    const black = projectCourse('b', course(['black-line', 'trap'], { side: 'black' }), both);
    expect(black.opening.variants.find((variant) => variant.id === 'trap')?.whose).toBe('against-us');
    const white = projectCourse('w', course(['italian', 'trap']), both);
    expect(white.opening.variants.find((variant) => variant.id === 'trap')?.whose).toBe('for-us');
  });

  it('names the course file when a listed line is missing or [For] is wrong', () => {
    expect(() => projectCourse('c', course(['nope']), tree)).toThrow(/c\/course\.yaml: there is no line "nope"/);
    expect(() =>
      resolveTree([{ ...italian, game: { ...italian.game, tags: { ...italian.game.tags, For: 'both' } } }]),
    ).toThrow(/\[For\] must say/);
  });
});
