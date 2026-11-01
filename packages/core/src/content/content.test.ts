import { describe, expect, it } from 'vitest';
import { buildOpening } from './build-opening';
import { readLine } from './line-pgn';
import { OpeningFile } from './schema';
import { resolveLines } from './theory';

const main = readLine(
  'main',
  `[For "white"]
[Kind "main"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 { Aims at f7. [%cal Gc4f7] [%icon weak@f7] [%idea f7-weakness] } 3... Bc5
4. c3 $1 ( 4. Ng5? { Too early. } 4... Nh6 ) 4... Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 *`,
);
const branch = readLine(
  'branch',
  `[For "white"]
[Kind "sideline"]
[Start "main 5.d3"]

5... d5 { Strikes at once. } 6. exd5 Nxd5 7. O-O *`,
);

const opening = OpeningFile.parse({
  name: 'Italian Game',
  side: 'white',
  start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
  level: 'first',
  summary: 'A summary.',
  about: { idea: 'An idea.', risks: 'Some risks.', suits: 'Beginners.' },
  variations: [{ id: 'giuoco', lines: ['main', 'branch'] }],
});

describe('reading a line', () => {
  it('reads notes, symbols, marks, icons, ideas and refutations', () => {
    const bc4 = main.moves[4]!;
    expect(bc4.note).toEqual({ text: 'Aims at f7.', arrows: ['Gc4f7'], icons: ['weak@f7'], ideas: ['f7-weakness'] });
    const c3 = main.moves[6]!;
    expect(c3.note?.nag).toEqual([1]);
    expect(c3.refutations[0]!.map((move) => move.san)).toEqual(['Ng5', 'Nh6']);
    expect(c3.refutations[0]![0]!.note).toEqual({ text: 'Too early.', nag: [2] });
  });

  it('refuses a variation that is not a refutation', () => {
    expect(() => readLine('x', '[For "white"]\n[Kind "main"]\n\n1. e4 ( 1. d4 ) 1... e5 *')).toThrow(
      /does not start with a move marked/,
    );
  });
});

describe('resolving lines', () => {
  it('starts a branch from its parent, notes left with the parent', () => {
    const lines = resolveLines([branch, main]);
    const resolved = lines.get('branch')!;
    expect(resolved.ownFrom).toBe(9);
    expect(resolved.moves[9]!.san).toBe('d5');
    expect(resolved.moves[4]!.note).toBeUndefined();
    expect(resolved.parent).toEqual({ line: 'main', ply: 8 });
  });

  it('names a [Start] move the parent does not play', () => {
    const bad = readLine('bad', '[For "white"]\n[Kind "sideline"]\n[Start "main 5.d4"]\n\n5... exd4 *');
    expect(() => resolveLines([main, bad])).toThrow(/does not play/);
  });

  it('allows one comment per move', () => {
    const twice = readLine(
      'twice',
      '[For "white"]\n[Kind "sideline"]\n[Start "main 2...Nc6"]\n\n3. Bc4 { Again. } 3... Nf6 *',
    );
    expect(() => resolveLines([main, twice])).toThrow(/already has a comment/);
  });

  it('checks the headers', () => {
    const bad = readLine('nokind', '[For "white"]\n\n1. e4 *');
    expect(() => resolveLines([bad])).toThrow(/\[Kind\]/);
  });
});

describe('building an opening', () => {
  const built = buildOpening('italian-white', opening, resolveLines([main, branch]), 4);

  it('keys moves by position, marks the learner’s, and keeps refutations at their position', () => {
    const afterBc5 = main.moves[5]!;
    expect(afterBc5.san).toBe('Bc5');
    const node = Object.values(built.positions).find((position) => position.refutations?.length);
    expect(node!.refutations![0]).toMatchObject({ san: 'Ng5', then: [{ san: 'Nh6' }] });
    const c3 = Object.values(built.positions)
      .flatMap((position) => position.moves)
      .find((move) => move.san === 'c3')!;
    expect(c3).toMatchObject({ mine: true, lines: ['main', 'branch'] });
    expect(built.startPly).toBe(5);
  });

  it('cuts steps of about four learner moves, each starting with the move that leads in', () => {
    expect(built.steps.map((step) => [step.id, step.from, step.to])).toEqual([
      ['main:1', 5, 12],
      ['branch:1', 9, 12],
    ]);
  });

  it('refuses two answers in one position unless one is an alternative', () => {
    const other = readLine('other', '[For "white"]\n[Kind "sideline"]\n[Start "main 3...Bc5"]\n\n4. O-O Nf6 *');
    const file = { ...opening, variations: [{ ...opening.variations[0]!, lines: ['main', 'other'] }] };
    expect(() => buildOpening('x', file, resolveLines([main, other]), 4)).toThrow(/two answers/);
    expect(() => buildOpening('x', { ...file, alternatives: ['other'] }, resolveLines([main, other]), 4)).not.toThrow();
  });
});
