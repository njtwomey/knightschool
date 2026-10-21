import { describe, expect, it } from 'vitest';
import {
  buildAuthored,
  exportReminder,
  isOwnOpening,
  overridesFromYaml,
  overridesToYaml,
  ownOpeningGroups,
  ownOpeningId,
  slugify,
  uniqueId,
} from './authoring';
import { parsePgn, writePgn } from './pgn';
import type { Chapter } from './theory-tree';
import { variantPath } from './tree-helpers';
import { namedPly } from './tree-helpers';

const headers = (id: string, extra: Record<string, string> = {}) =>
  Object.entries({
    Event: 'Knight School',
    Opening: 'Italian Game',
    Variation: id,
    ECO: 'C50',
    Character: 'solid',
    Risk: 'low',
    EarlyMate: 'none',
    Tricks: 'none',
    For: 'white',
    Kind: 'main',
    Opponent: '1...e5',
    ...extra,
  })
    .map(([key, value]) => `[${key} "${value.replace(/"/g, '\\"')}"]`)
    .join('\n');

const chapterText = (id: string, moves: string, extra: Record<string, string> = {}) =>
  `${headers(id, extra)}\n\n${moves} *\n`;
const shipped: Chapter[] = [
  {
    id: 'italian',
    source: 'tree/italian.pgn',
    game: parsePgn(chapterText('italian', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5')),
  },
];
const course = (lines: string[], over: Record<string, unknown> = {}) =>
  JSON.stringify({
    name: 'Mine',
    side: 'white',
    opening: 'italian-game',
    tier: 1,
    trigger: '',
    summary: 'x',
    about: { idea: 'x', risks: 'x', suits: 'x' },
    lines,
    ...over,
  });

describe('buildAuthored', () => {
  const evans = chapterText('My Evans', '4. b4 { A pawn for time. [%tag tip,trap] } 4... Bxb4 5. c3', {
    Start: 'italian 3...Bc5',
    Description: 'The gambit, "for real".',
  });

  it('merges authored chapters with the shipped tree and projects authored courses like shipped ones', () => {
    const built = buildAuthored(shipped, {
      chapters: [{ id: 'my-evans', pgn: evans }],
      courses: [{ id: 'mine', manifest: course(['italian', 'my-evans']) }],
    });
    expect(built.problems).toEqual([]);
    expect(built.chapters).toEqual(['my-evans']);
    const [content] = built.courses;
    expect(content!.opening.id).toBe('mine');
    expect(variantPath(content!, 'my-evans').map((edge) => edge.san)).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Bc5',
      'b4',
      'Bxb4',
      'c3',
    ]);
    const b4 = variantPath(content!, 'my-evans')[6]!;
    expect(b4.annotation).toMatchObject({ text: 'A pawn for time.', tags: ['tip', 'trap'] });
    const variant = content!.opening.variants.find((candidate) => candidate.id === 'my-evans')!;
    expect(variant).toMatchObject({ description: 'The gambit, "for real".', snapshot: 9 });
    // An authored line is pictured at its end unless it says otherwise; a shipped one keeps its own rule.
    expect(namedPly(content!, 'my-evans')).toBe(9);
    expect(content!.opening.variants.find((candidate) => candidate.id === 'italian')!.snapshot).toBeUndefined();
  });

  it('keeps a chosen snapshot', () => {
    const built = buildAuthored(shipped, {
      chapters: [{ id: 'my-evans', pgn: evans.replace('[Start', '[Snapshot "7"]\n[Start') }],
      courses: [{ id: 'mine', manifest: course(['my-evans']) }],
    });
    expect(namedPly(built.courses[0]!, 'my-evans')).toBe(7);
  });

  it('leaves out what does not fit, and what grows from it, without touching the shipped tree', () => {
    const built = buildAuthored(
      shipped,
      {
        chapters: [
          { id: 'italian', pgn: chapterText('Copy', '1. e4') }, // the id is taken
          { id: 'lost', pgn: chapterText('Lost', '2. d4', { Start: 'nowhere 1...e5' }) },
          { id: 'garbled', pgn: '1. e4 ((' },
          { id: 'fine', pgn: chapterText('Fine', '4. c3', { Start: 'italian 3...Bc5' }) },
        ],
        courses: [
          { id: 'ok', manifest: course(['fine']) },
          { id: 'uses-lost', manifest: course(['lost']) },
          { id: 'bad-json', manifest: '{' },
          { id: 'no-name', manifest: course(['fine'], { name: '' }) },
          { id: 'shipped-id', manifest: course(['fine']) },
        ],
      },
      new Set(['shipped-id']),
    );
    expect(built.chapters).toEqual(['fine']);
    expect(built.courses.map((content) => content.opening.id)).toEqual(['ok']);
    expect(built.problems.map((problem) => `${problem.kind}:${problem.id}`).sort()).toEqual([
      'chapter:garbled',
      'chapter:italian',
      'chapter:lost',
      'course:bad-json',
      'course:no-name',
      'course:shipped-id',
      'course:uses-lost',
    ]);
    expect(built.problems.find((problem) => problem.id === 'lost')!.message).toMatch(/^authored\/lost\.pgn: .*nowhere/);
    expect(built.tree.lines.get('italian')!.source).toBe('tree/italian.pgn');
  });
});

describe('ids and the export reminder', () => {
  it.each([
    ['Giuoco Piano, Main Line!', 'giuoco-piano-main-line'],
    ['  Réti   Opening ', 'reti-opening'],
    ['???', 'line'],
  ])('slugify(%j) is %j', (text, slug) => {
    expect(slugify(text)).toBe(slug);
  });

  it('finds an id that is not taken', () => {
    expect(uniqueId('a', new Set())).toBe('a');
    expect(uniqueId('a', new Set(['a', 'a-2']))).toBe('a-3');
  });

  const NOW = new Date('2026-10-21T12:00:00.000Z');
  it.each([
    ['nothing changed', 0, '2026-01-01T00:00:00.000Z', null],
    ['nothing to count from', 3, undefined, null],
    ['a few edits, recently', 3, '2026-10-20T12:00:00.000Z', null],
    ['twenty edits', 20, '2026-10-21T11:00:00.000Z', { edits: 20, days: 0 }],
    ['a week since, with an edit', 1, '2026-10-14T12:00:00.000Z', { edits: 1, days: 7 }],
  ] as [string, number, string | undefined, unknown][])('%s', (_name, edits, since, expected) => {
    expect(exportReminder(edits, since, NOW)).toEqual(expected);
  });
});

describe('PGN with tags', () => {
  it('writes and reads back move tags and headers with quotes', () => {
    const game = parsePgn(
      '[Event "x"]\n[Description "Say \\"hi\\""]\n\n1. e4 { Good. [%tag tip] } e5 { [%tag blunder,other] } *',
    );
    expect(game.tags.Description).toBe('Say "hi"');
    expect(game.moves.map((move) => move.tags)).toEqual([['tip'], ['blunder', 'other']]);
    expect(parsePgn(writePgn(game))).toEqual(game);
  });
});

describe('units: as YAML', () => {
  it('round-trips, leaves out empty parts, and explains what does not fit', () => {
    const text = overridesToYaml({ order: ['main:2'], after: { 'side:1': ['main:2'] }, drop: {} });
    expect(text).toBe('order:\n  - main:2\nafter:\n  side:1:\n    - main:2\n');
    expect(overridesFromYaml(text)).toEqual({ order: ['main:2'], after: { 'side:1': ['main:2'] }, drop: {} });
    expect(overridesToYaml({ order: [], after: {}, drop: {} })).toBe('');
    expect(overridesFromYaml('  ')).toBeUndefined();
    expect(() => overridesFromYaml('order: [main]')).toThrow(/order\.0: a unit id/);
    expect(() => overridesFromYaml('first: [main:1]')).toThrow(/Unrecognized key/);
    expect(() => overridesFromYaml('order: [')).toThrow(/^Not YAML/);
  });
});

describe('courses of their own', () => {
  it('get a "My courses" group per side, made by the app', () => {
    expect(ownOpeningId('black')).toBe('my-black-courses');
    expect(isOwnOpening('my-white-courses')).toBe(true);
    expect(isOwnOpening('italian-game')).toBe(false);
    const groups = ownOpeningGroups([
      { id: 'a', side: 'white', opening: 'my-white-courses' },
      { id: 'b', side: 'white', opening: 'italian-game' },
      { id: 'c', side: 'black', opening: 'my-black-courses' },
    ]);
    expect(groups.map((group) => [group.id, group.name, group.side, group.courses])).toEqual([
      ['my-white-courses', 'My courses', 'white', ['a']],
      ['my-black-courses', 'My courses', 'black', ['c']],
    ]);
  });

  it('build without any opening of the app', () => {
    const built = buildAuthored([], {
      chapters: [{ id: 'mine-main', pgn: chapterText('Main', '1. e4 e5', { Opponent: '1...e5' }) }],
      courses: [{ id: 'mine', manifest: course(['mine-main'], { opening: ownOpeningId('white') }) }],
    });
    expect(built.problems).toEqual([]);
    expect(built.courses[0]!.opening.opening).toBe('my-white-courses');
  });
});
