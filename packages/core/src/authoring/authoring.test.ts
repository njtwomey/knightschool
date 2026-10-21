import { describe, expect, it } from 'vitest';
import {
  buildAuthored,
  exportReminder,
  isOwnOpening,
  ownOpeningGroups,
  ownOpeningId,
  slugify,
  uniqueId,
} from './authoring';
import { reduceAttempt, startAttempt } from '../training/attempt';
import { nextBranchMove } from '../training/branches';
import { parsePgn, writePgn } from '../chess/pgn';
import { createScheduler } from '../training/scheduler';
import { cardDefinitions, followOn, lineQuestions, recordAnswer } from '../training/cards';
import { courseUnits, planIntroductions } from '../training/units';
import type { Chapter } from '../content/theory-tree';
import { variantPath } from '../navigation/content-walk';
import { namedPly } from '../navigation/content-walk';

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

describe('an authored course in training', () => {
  // Written the way the editor writes it: a course of its own, a main line, and a branch from it with a note.
  const main = chapterText('Main', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3', { Opponent: '1...e5' });
  const branch = chapterText('Two knights', '3... Nf6 4. d3 { Quiet and safe. [%tag tip] } 4... Bc5 5. c3', {
    Start: 'mine-main 3.Bc4',
    Kind: 'sideline',
    Opponent: '3...Nf6',
  });
  const built = buildAuthored([], {
    chapters: [
      { id: 'mine-main', pgn: main },
      { id: 'mine-two-knights', pgn: branch },
    ],
    courses: [{ id: 'mine', manifest: course(['mine-main', 'mine-two-knights'], { opening: ownOpeningId('white') }) }],
  });
  const content = built.courses[0]!;
  const ucisOf = (definitions: { expectedUci: string }[]) => definitions.map((definition) => definition.expectedUci);

  it('earns a review card for each of your moves, on both lines', () => {
    expect(built.problems).toEqual([]);
    const cards = cardDefinitions(content);
    expect(new Set(ucisOf(cards))).toEqual(new Set(['e2e4', 'g1f3', 'f1c4', 'c2c3', 'd2d3']));
    expect(cards.every((card) => card.id.startsWith('mine:'))).toBe(true);
  });

  it('is cut into units on a study path, and new cards come from it in order', () => {
    const units = courseUnits(content);
    expect(units.map((unit) => unit.line)).toContain('mine-two-knights');
    const covered = units.flatMap((unit) => ucisOf(unit.cards));
    expect(new Set(covered)).toEqual(new Set(ucisOf(cardDefinitions(content))));
    const introduced = planIntroductions([{ content, cards: [], reviews: [] }], 10, new Date());
    expect(ucisOf(introduced).slice(0, 3)).toEqual(['e2e4', 'g1f3', 'f1c4']);
  });

  it('is drilled, quizzed and practised like a shipped course', () => {
    // A review: the right move, recorded with a new schedule.
    const [first] = planIntroductions([{ content, cards: [], reviews: [] }], 1, new Date());
    const attempt = reduceAttempt(
      startAttempt(),
      { type: 'move', uci: first!.expectedUci, elapsedMs: 900 },
      first!.expectedUci,
    );
    const answer = recordAnswer(createScheduler(), first!, attempt, 'session', new Date());
    expect(answer.review.cardId).toBe(first!.id);
    expect(answer.card.reps).toBe(1);
    // A line's own quiz, and a question that runs on along the branch.
    expect(ucisOf(lineQuestions(content, 'mine-two-knights'))).toContain('d2d3');
    const beforeBc4 = variantPath(content, 'mine-two-knights')[3]!.to; // after 2...Nc6
    expect(followOn(content, beforeBc4, 'f1c4', 'mine-two-knights')!.definition.expectedUci).toBe('d2d3');
    // The every-branch drill plays your move at the start.
    expect(nextBranchMove(content.nodes[content.opening.rootEpd]!, () => 0)).toMatchObject({ ours: true });
    // The note and its tag reach the learner.
    const d3 = variantPath(content, 'mine-two-knights').find((edge) => edge.san === 'd3')!;
    expect(d3.annotation).toMatchObject({ text: 'Quiet and safe.', tags: ['tip'] });
  });
});
