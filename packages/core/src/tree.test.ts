import { manifestOf } from './test-manifest';
import { describe, expect, it } from 'vitest';
import { parsePgn } from './pgn';
import { buildOpening, type VariantSource } from './tree';
import {
  pathFromUcis,
  alternativesAfter,
  continueLine,
  lineName,
  lineSteps,
  mainLine,
  pathSteps,
  ourMoveNodes,
  pathTo,
  preferredMove,
  transpositions,
  variantPath,
} from './tree-helpers';
import { START_EPD } from './epd';

const header = (variation: string, extra = '') => `[Event "Knight School"]
[Opening "Test Opening"]
[Variation "${variation}"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]
${extra}
`;

const variant = (id: string, kind: 'line' | 'refutation', moves: string, extra = ''): VariantSource => ({
  id,
  kind,
  game: parsePgn(`${header(id, extra)}\n${moves}`),
  source: `${id}.pgn`,
});

const manifest = manifestOf;

describe('buildOpening with a reused line', () => {
  it("does not hold a line from another course to this course's kind", () => {
    const kinded = (reused: boolean) => ({
      ...variant('borrowed', 'line', '1. e4 e5 *', '[Kind "gambit"]'),
      reused,
    });
    const build = (reused: boolean) => buildOpening('test', manifest({ lines: ['borrowed'] }), [kinded(reused)]);
    expect(() => build(false)).toThrow(/does not match/);
    expect(() => build(true)).not.toThrow();
  });
});

describe('buildOpening with an introduction', () => {
  const lines = [variant('main', 'line', '1. e4 e5 *')];
  it('carries the idea, the risks and the origin through to the course', () => {
    const about = {
      idea: 'Aim at [f7](4k3/5p2/8/8/8/8/8/4K3 w - -).',
      risks: 'f2 is weak too.',
      suits: 'Everyone.',
      origin: 'Old.',
    };
    expect(buildOpening('test', manifest({ about }), lines).opening.about).toEqual(about);
  });
  it.each([
    ['idea', { idea: 'bad [f7](rnbqkbnr/9/8/8/8/8/8/8 w - -)', risks: 'x', suits: 'x' }],
    ['risks', { idea: 'x', risks: 'bad [f7](rnbqkbnr/9/8/8/8/8/8/8 w - -)', suits: 'x' }],
    ['suits', { idea: 'x', risks: 'x', suits: 'bad [f7](rnbqkbnr/9/8/8/8/8/8/8 w - -)' }],
    ['origin', { idea: 'x', risks: 'x', suits: 'x', origin: 'bad [f7](rnbqkbnr/9/8/8/8/8/8/8 w - -)' }],
  ])('rejects a broken position link in the %s', (_, about) => {
    expect(() => buildOpening('test', manifest({ about }), lines)).toThrow(/course\.yaml/);
  });
});

describe('buildOpening', () => {
  const content = buildOpening('test', manifest({ lines: ['main', 'side'], traps: ['trap'] }), [
    variant('main', 'line', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *'),
    variant('side', 'line', '1. e4 e5 2. Nf3 Nf6 3. Nxe5 *'),
    variant(
      'trap',
      'refutation',
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4 *',
      '[Refutes "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4"]',
    ),
  ]);

  it('shares positions between variants and records which variants use each move', () => {
    const afterNf3 = content.nodes['rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -']!;
    expect(afterNf3.moves.map((move) => move.san).sort()).toEqual(['Nc6', 'Nf6']);
    const e4 = content.nodes[START_EPD]!.moves[0]!;
    expect(e4.variants).toEqual(['main', 'side', 'trap']);
  });

  it('marks only the first line main line', () => {
    expect(mainLine(content).map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    const trap = Object.values(content.nodes)
      .flatMap((node) => node.moves)
      .find((edge) => edge.san === 'Nd4')!;
    expect(trap.isMainLine).toBe(false);
  });

  it('gives each of our-move positions exactly one repertoire move', () => {
    const ours = ourMoveNodes(content);
    expect(ours.length).toBeGreaterThan(0);
    for (const node of ours) expect(node.moves.filter((edge) => edge.isRepertoire)).toHaveLength(1);
    expect(ours.map((node) => node.sideToMove)).toEqual(ours.map(() => 'white'));
  });

  it('finds the shortest path to a position', () => {
    const nd4Node = Object.values(content.nodes).find((node) => node.moves.some((edge) => edge.san === 'Nxd4'))!;
    expect(pathTo(content, nd4Node.epd).map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4']);
  });

  it('makes transposed move orders one position', () => {
    const transposing = buildOpening('t', manifest({ side: 'black', lines: ['a', 'b'] }), [
      variant('a', 'line', '1. e4 e5 2. Nf3 Nc6 *'),
      variant('b', 'line', '1. Nf3 Nc6 2. e4 e5 *'),
    ]);
    expect(transpositions(transposing).size).toBeGreaterThan(0);
  });

  it('follows the main line when stepping forward', () => {
    expect(preferredMove(content.nodes[content.opening.rootEpd]!)?.san).toBe('e4');
    expect(preferredMove({ ...content.nodes[content.opening.rootEpd]!, moves: [] })).toBeUndefined();
  });

  it('replays the main line of a variant', () => {
    expect(variantPath(content, 'side').map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5']);
    expect(variantPath(content, 'trap').at(-1)?.san).toBe('exd4');
    expect(() => variantPath(content, 'nope')).toThrow();
  });

  it('turns a variant into steps and says whose move each is', () => {
    const steps = lineSteps(content, 'main');
    expect(steps.map((step) => step.edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    expect(steps.map((step) => step.ours)).toEqual([true, false, true, false, true, false]);
    expect(steps[0]!.fromEpd).toBe(content.opening.rootEpd);
    expect(steps[1]!.fromEpd).toBe(steps[0]!.edge.to);
  });

  it('turns any run of moves into steps, as far as the course knows them', () => {
    const steps = pathSteps(content, ['e2e4', 'e7e5', 'g1f3', 'g8f6', 'a2a3']);
    expect(steps.map((step) => step.edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nf6']);
    expect(steps.map((step) => step.ours)).toEqual([true, false, true, false]);
    expect(steps[3]!.fromEpd).toBe(steps[2]!.edge.to);
    expect(pathSteps(content, [])).toEqual([]);
  });

  it('carries a path on to the end of its line', () => {
    const toNf3 = pathTo(
      content,
      Object.values(content.nodes).find((node) => node.moves.some((edge) => edge.san === 'Nc6'))!.epd,
    );
    expect(toNf3.map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(continueLine(content, toNf3).map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    expect(continueLine(content, []).map((edge) => edge.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
  });

  it('lists the other moves at a position, leaving out the one the shown line takes', () => {
    const afterE4E5Nf3 = continueLine(content, []).slice(0, 3);
    const shown = continueLine(content, [])[3];
    expect(alternativesAfter(content, afterE4E5Nf3, shown).map((edge) => edge.san)).toEqual(['Nf6']);
    expect(alternativesAfter(content, afterE4E5Nf3).map((edge) => edge.san)).toEqual(['Nc6', 'Nf6']);
    expect(alternativesAfter(content, continueLine(content, []), undefined)).toEqual([]);
  });

  it('walks a list of moves through the tree and stops at the first one it does not know', () => {
    const line = continueLine(content, []);
    const ucis = line.map((edge) => edge.uci);
    expect(pathFromUcis(content, ucis).map((edge) => edge.san)).toEqual(line.map((edge) => edge.san));
    expect(pathFromUcis(content, ucis.slice(0, 2)).map((edge) => edge.san)).toEqual(['e4', 'e5']);
    expect(pathFromUcis(content, ['e2e4', 'e7e5', 'a2a3', 'g1f3'])).toHaveLength(2); // a2a3 is not in the course
    expect(pathFromUcis(content, [])).toEqual([]);
    expect(pathFromUcis(content, ['zzzz'])).toEqual([]);
  });

  it('names the variant a run of moves belongs to', () => {
    expect(lineName(content, continueLine(content, []))).toBe('main');
    expect(lineName(content, variantPath(content, 'side'))).toBe('side');
    expect(lineName(content, continueLine(content, []).slice(0, 3))).toBe('main'); // shared moves: the first line
    expect(lineName(content, [])).toBeUndefined();
  });

  it('keeps a refutation demonstration without making a card from the mistake', () => {
    const demo = buildOpening('d', manifest({ lines: ['main'], traps: ['trap'] }), [
      variant('main', 'line', '1. e4 e5 2. Nf3 Nc6 *'),
      variant(
        'trap',
        'refutation',
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5? Qg5 5. Nxf7?? Qxg2 *',
        '[Refutes "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4"]',
      ),
    ]);
    const cards = ourMoveNodes(demo).flatMap((node) =>
      node.moves.filter((edge) => edge.isRepertoire).map((edge) => edge.san),
    );
    expect(cards).not.toContain('Nxe5');
    expect(cards).not.toContain('Nxf7');
  });
});

describe('buildOpening authoring errors', () => {
  const m = (over?: Parameters<typeof manifestOf>[0]) => manifest(over);

  it('rejects two repertoire moves for one position', () => {
    expect(() =>
      buildOpening('x', m({ lines: ['a', 'b'] }), [
        variant('a', 'line', '1. e4 e5 *'),
        variant('b', 'line', '1. d4 d5 *'),
      ]),
    ).toThrow(/two repertoire moves/);
  });

  it('accepts a second move when it is marked as a mistake', () => {
    expect(() =>
      buildOpening('x', m({ lines: ['a', 'b'] }), [
        variant('a', 'line', '1. e4 e5 *'),
        variant('b', 'line', '1. d4? d5 *'),
      ]),
    ).not.toThrow();
  });

  it('rejects an illegal move and names the file', () => {
    expect(() =>
      buildOpening('x', m(), [variant('main', 'line', '1. e4 e5 2. Qh5 Nc6 3. Qxf7 Kxf7 4. Qd8 *')]),
    ).toThrow(/main\.pgn: illegal move/);
  });

  it('rejects files that are not listed, and listed files that are missing', () => {
    expect(() =>
      buildOpening('x', m(), [variant('main', 'line', '1. e4 *'), variant('extra', 'line', '1. d4 *')]),
    ).toThrow(/not listed/);
    expect(() => buildOpening('x', m({ lines: ['main', 'gone'] }), [variant('main', 'line', '1. e4 *')])).toThrow(
      /no such file/,
    );
  });

  it('rejects a comment that links to an illegal position, naming the file', () => {
    const bad = variant('main', 'line', '1. e4 { Look at [f7](8/8/8/8/8/8/8/8 w - -) now. } *');
    expect(() => buildOpening('x', m(), [bad])).toThrow(/main\.pgn: "f7" links to/);
  });

  it('rejects a line whose main path does not pass through the trigger', () => {
    expect(() => buildOpening('x', m({ trigger: '1. e4 e5' }), [variant('main', 'line', '1. d4 d5 *')])).toThrow(
      /trigger/,
    );
    expect(() => buildOpening('x', m({ trigger: '1. e5' }), [variant('main', 'line', '1. e4 *')])).toThrow(/legal/);
  });

  it('accepts an empty trigger, which means the starting position', () => {
    expect(() => buildOpening('x', m({ trigger: '' }), [variant('main', 'line', '1. d4 d5 *')])).not.toThrow();
  });

  it('lets an alternative line answer a position the main line already answers, and never makes it a repertoire move', () => {
    const base = m({ lines: ['main', 'other'] });
    const manifestWithAlternative = {
      ...base,
      lines: base.lines.map((line) => (line.file === 'other' ? { ...line, alternative: true } : line)),
    };
    const built = buildOpening('x', manifestWithAlternative, [
      variant('main', 'line', '1. e4 e5 2. Nf3 *'),
      variant('other', 'line', '1. e4 e5 2. Nc3 *'),
    ]);
    const after = built.nodes['rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -']!;
    expect(after.moves.map((edge) => [edge.san, edge.isRepertoire])).toEqual([
      ['Nf3', true],
      ['Nc3', false],
    ]);
  });

  it('refuses the same answer twice when neither line is an alternative', () => {
    expect(() =>
      buildOpening('x', m({ lines: ['a', 'b'] }), [
        variant('a', 'line', '1. e4 e5 2. Nf3 *'),
        variant('b', 'line', '1. e4 e5 2. Nc3 *'),
      ]),
    ).toThrow(/two repertoire moves/);
  });

  it('rejects two variants that comment differently on the same move', () => {
    expect(() =>
      buildOpening('x', m({ lines: ['a', 'b'] }), [
        variant('a', 'line', '1. e4 { One. } e5 *'),
        variant('b', 'line', '1. e4 { Two. } c5 *'),
      ]),
    ).toThrow(/comment differently/);
  });
});

describe('positions after a mistake of ours', () => {
  it('are shown but never become cards', () => {
    const demo = buildOpening('d', manifest({ lines: ['main'], traps: ['trap'] }), [
      variant('main', 'line', '1. e4 e5 2. Nf3 Nc6 *'),
      variant(
        'trap',
        'refutation',
        '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5? Qg5 5. Nxf7?? Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3# *',
        '[Refutes "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4"]',
      ),
    ]);
    const cards = ourMoveNodes(demo).flatMap((node) =>
      node.moves.filter((edge) => edge.isRepertoire).map((edge) => edge.san),
    );
    expect(cards).not.toContain('Rf1'); // played after our own blunders
    expect(cards).not.toContain('Be2');
    expect(cards).not.toContain('Nxe5');
    expect(cards).toContain('Bc4'); // the sound moves before the mistake are still cards
  });

  it('still count when another route reaches them cleanly', () => {
    const both = buildOpening('d', manifest({ lines: ['a', 'b'] }), [
      variant('a', 'line', '1. e4 e5 2. Nf3 Nc6 3. Bc4 *'),
      variant('b', 'line', '1. e4 e5 2. Bc4? Nc6 3. Nf3 *'),
    ]);
    const cards = ourMoveNodes(both).flatMap((node) =>
      node.moves.filter((edge) => edge.isRepertoire).map((edge) => edge.san),
    );
    expect(cards).toContain('Bc4'); // reached by 2.Nf3 Nc6 3.Bc4 as well
  });
});
