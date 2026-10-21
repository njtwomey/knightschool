import { describe, expect, it } from 'vitest';
import { parsePgn } from './pgn';
import { newCard } from './scheduler';
import type { LineKind, OpeningContent, TrapKind } from './schema/content';
import type { Card, Review } from './schema/user';
import { manifestOf } from './test-manifest';
import { cardDefinitions, cardId } from './training';
import { buildOpening } from './tree';
import {
  courseUnits,
  cutIntoUnits,
  pathIntroductionOrder,
  unitProgress,
  unitStretches,
  type CourseUnit,
} from './units';

const NOW = new Date('2026-10-21T10:00:00.000Z');

const game = (moves: string, name: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "${name}"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves} *`);

type Source = { id: string; moves: string; kind: LineKind | TrapKind };

/** A white course from lines and traps, each given its kind. */
function course(sources: Source[]): OpeningContent {
  const lines = sources.filter((source) => !['for-us', 'against-us'].includes(source.kind));
  const traps = sources.filter((source) => ['for-us', 'against-us'].includes(source.kind));
  const base = manifestOf({ lines: lines.map((line) => line.id), traps: traps.map((trap) => trap.id) });
  const manifest = {
    ...base,
    lines: base.lines.map((line, i) => ({ ...line, kind: lines[i]!.kind as LineKind })),
    traps: base.traps.map((trap, i) => ({ ...trap, kind: traps[i]!.kind as TrapKind })),
  };
  return buildOpening(
    't',
    manifest,
    sources.map((source) => ({
      id: source.id,
      kind: traps.includes(source) ? ('refutation' as const) : ('line' as const),
      game: game(source.moves, source.id),
      source: `${source.id}.pgn`,
    })),
  );
}

// The main line has seven moves of ours and two short replies of Black's inside it (4...d6 and 4...Qe7). A gambit
// leaves after 2.Nf3, a sideline and two traps after 3.Bc4, and a rare line after 2.Nf3.
const MAIN = '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 (4... d6 5. d3) (4... Qe7 5. O-O) 5. d3 d6 6. O-O O-O 7. Re1';
const SOURCES: Source[] = [
  { id: 'main', moves: MAIN, kind: 'main' },
  {
    id: 'side',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6',
    kind: 'sideline',
  },
  { id: 'gambit', moves: '1. e4 e5 2. Nf3 d5 3. exd5 e4 4. Qe2 Nf6 5. Nc3', kind: 'gambit' },
  { id: 'rare', moves: '1. e4 e5 2. Nf3 f6 3. Nxe5', kind: 'rare' },
  { id: 'avoid', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxd4 exd4', kind: 'against-us' },
  {
    id: 'spring',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5 6. Nxe5 Bxd1 7. Bxf7+ Ke7 8. Nd5#',
    kind: 'for-us',
  },
];

const content = course(SOURCES);
/** The position after some moves (SAN) from the start. */
function after(c: OpeningContent, moves: string): string {
  let epd = c.opening.rootEpd;
  for (const san of moves.split(' ')) epd = c.nodes[epd]!.moves.find((move) => move.san === san)!.to;
  return epd;
}
const sanOf = (c: OpeningContent, unit: CourseUnit) =>
  unit.cards.map((card) => c.nodes[card.epd]!.moves.find((move) => move.uci === card.expectedUci)!.san);

describe('cutIntoUnits', () => {
  it.each([
    ['nothing', 0, [], []],
    ['fewer than a unit', 3, [], [[0, 2]]],
    ['one unit', 4, [], [[0, 3]]],
    ['six moves stay together without a branch', 6, [], [[0, 5]]],
    [
      'six moves split where a branch leaves',
      6,
      [3],
      [
        [0, 2],
        [3, 5],
      ],
    ],
    [
      'eight moves in two',
      8,
      [],
      [
        [0, 3],
        [4, 7],
      ],
    ],
    [
      'eight moves cut at a branch rather than in the middle',
      8,
      [3],
      [
        [0, 2],
        [3, 7],
      ],
    ],
    [
      'ten moves in two of five',
      10,
      [],
      [
        [0, 4],
        [5, 9],
      ],
    ],
    [
      'twelve moves in three',
      12,
      [],
      [
        [0, 3],
        [4, 7],
        [8, 11],
      ],
    ],
  ])('%s', (_name, count, branches, expected) => {
    expect(cutIntoUnits(count, 4, (k) => branches.includes(k))).toEqual(expected);
  });
});

describe('courseUnits', () => {
  const units = courseUnits(content);
  const byId = (id: string) => units.find((unit) => unit.id === id)!;

  it('puts the main line first, then branches by kind, depth and order, with short replies grouped', () => {
    expect(units.map((unit) => unit.id)).toEqual(['main:1', 'main:2', 'gambit:1', 'main:3', 'side:1', 'avoid:1']);
    expect(units.map((unit) => unit.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(units.map((unit) => sanOf(content, unit))).toEqual([
      ['e4', 'Nf3', 'Bc4', 'c3'],
      ['d3', 'O-O', 'Re1'],
      ['exd5', 'Qe2', 'Nc3'],
      ['d3', 'O-O'],
      ['Ng5', 'exd5', 'Bb5+', 'dxc6'],
      ['Nxd4'],
    ]);
    expect(units.map((unit) => unit.kind)).toEqual(['main', 'main', 'gambit', 'main', 'sideline', 'against-us']);
  });

  it('makes a unit of the short replies that leave the same unit, one stretch each', () => {
    const side = byId('main:3');
    expect(side.side).toBe(true);
    expect(side.stretches).toHaveLength(2);
    expect(byId('main:1').side).toBe(false);
    expect(byId('avoid:1').side).toBe(false); // a trap is not grouped with main-line replies
  });

  it('gives every card exactly one unit', () => {
    const ids = units.flatMap((unit) => unit.cards.map((card) => card.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ids)).toEqual(new Set(cardDefinitions(content).map((card) => card.id)));
  });

  it('makes a branch wait for the unit it leaves, and a line wait for its unit before', () => {
    expect(units.map((unit) => [unit.id, unit.prerequisites])).toEqual([
      ['main:1', []],
      ['main:2', ['main:1']],
      ['gambit:1', ['main:1']],
      ['main:3', ['main:1']],
      ['side:1', ['main:1']],
      ['avoid:1', ['main:1']],
    ]);
    expect(units.map((unit) => unit.branch)).toEqual([false, false, true, true, true, true]);
  });

  it('starts each stretch where the unit begins: the main line at the start, a branch where it leaves', () => {
    const [first] = byId('main:1').stretches;
    expect(first!.from).toBe(0);
    expect(first!.moves).toHaveLength(7); // up to 4.c3
    const [second] = byId('main:2').stretches;
    expect(second!.from).toBe(7); // Black's 4...Nf6 is played first
    expect(second!.moves).toHaveLength(13); // to the end of the line
    const [gambit] = byId('gambit:1').stretches;
    expect(gambit!.from).toBe(3); // after 2.Nf3, from 2...d5
    expect(gambit!.plies).toEqual([4, 6, 8]);
  });

  it('attaches traps where they leave, and quizzes to the unit or trap that reaches them, as extras', () => {
    expect(byId('main:1').traps).toEqual(['spring']);
    expect(byId('avoid:1').traps).toEqual(['avoid']);
    const quiz = (id: string, epd: string) => ({ id, epd, prompt: 'Why?', accept: [], reveal: 'x' });
    const quizzed = {
      ...content,
      quizzes: [
        quiz('on-gambit', after(content, 'e4 e5 Nf3 d5 exd5')),
        quiz('in-trap', after(content, 'e4 e5 Nf3 Nc6 Bc4 d6 Nc3 Bg4')),
      ],
    };
    const withQuizzes = courseUnits(quizzed);
    expect(withQuizzes.find((unit) => unit.id === 'gambit:1')!.quizzes).toEqual(['on-gambit']);
    expect(withQuizzes.find((unit) => unit.id === 'main:1')!.quizzes).toEqual(['in-trap']);
  });

  it('follows the card settings: rare lines only when asked for, and the unit size', () => {
    expect(units.some((unit) => unit.line === 'rare')).toBe(false);
    const withRare = courseUnits(content, { includeRare: true });
    expect(withRare.at(-1)).toMatchObject({ id: 'rare:1', kind: 'rare', prerequisites: ['main:1'] });
    const small = courseUnits(content, { size: 2 });
    expect(small.filter((unit) => unit.line === 'main' && !unit.side).map((unit) => unit.cards.length)).toEqual([
      2, 2, 3,
    ]);
  });

  it('orders branches of the same kind by how many games reach them', () => {
    const twoSidelines = course([
      { id: 'main', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3', kind: 'main' },
      { id: 'quiet', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Be7 4. d4 d6 5. dxe5 dxe5 6. Qxd8+', kind: 'sideline' },
      { id: 'busy', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 h6 4. d4 d6 5. dxe5 dxe5 6. Qxd8+', kind: 'sideline' },
    ]);
    const ids = (c: OpeningContent) => courseUnits(c).map((unit) => unit.id);
    expect(ids(twoSidelines)).toEqual(['main:1', 'quiet:1', 'busy:1']);
    const afterH6 = twoSidelines.nodes[after(twoSidelines, 'e4 e5 Nf3 Nc6 Bc4 h6')]!;
    const popular = {
      ...twoSidelines,
      nodes: { ...twoSidelines.nodes, [afterH6.epd]: { ...afterH6, popularity: 0.3 } },
    };
    expect(ids(popular)).toEqual(['main:1', 'busy:1', 'quiet:1']);
  });

  it('has nothing for a course with no cards', () => {
    const reading = course([{ id: 'main', moves: '1. e4 e5 2. Nf3', kind: 'rare' }]);
    expect(courseUnits(reading)).toEqual([]);
  });
});

describe('unitStretches', () => {
  const units = courseUnits(content);
  const main1 = units[0]!;
  const side = units.find((unit) => unit.side)!;

  it('plays the whole unit, or part of it from the opponent move before', () => {
    expect(unitStretches(main1)).toEqual(main1.stretches);
    // Moves 2 to 3 (Nf3, Bc4): from 1...e5 to 3.Bc4.
    expect(unitStretches(main1, 2, 3)).toEqual([
      { moves: main1.stretches[0]!.moves.slice(0, 5), from: 1, plies: [2, 4] },
    ]);
    expect(unitStretches(main1, 4)).toEqual([{ moves: main1.stretches[0]!.moves, from: 5, plies: [6] }]);
  });

  it('keeps only the stretches of a side unit that hold the moves asked for', () => {
    expect(unitStretches(side, 2, 2)).toEqual([side.stretches[1]]);
    expect(unitStretches(side)).toHaveLength(2);
  });
});

// Cards and reviews for the state table.
const at = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString();
const cardOf = (unit: CourseUnit, i: number, over: Partial<Card> = {}): Card => ({
  ...newCard(unit.cards[i]!, NOW),
  ...over,
});
const review = (cardIdValue: string, rating: Review['rating'], minute: number): Review => ({
  id: `${cardIdValue}:${minute}`,
  cardId: cardIdValue,
  at: at(minute),
  rating,
  playedUci: null,
  msToAnswer: 1000,
  hintUsed: false,
  sessionId: 's',
});
const passAll = (unit: CourseUnit) =>
  unit.cards.flatMap((card) => [review(card.id, 'good', 1), review(card.id, 'easy', 2)]);

describe('unitProgress', () => {
  const units = courseUnits(content);
  const [main1, main2] = units as [CourseUnit, CourseUnit];
  const allCards = (unit: CourseUnit, over: Partial<Card> = {}) => unit.cards.map((_, i) => cardOf(unit, i, over));
  const states = (cards: Card[], reviews: Review[]) =>
    Object.fromEntries([...unitProgress(units, cards, reviews)].map(([id, progress]) => [id, progress.state]));

  it.each([
    [
      'nothing studied: only the first unit is open',
      [],
      [],
      { 'main:1': 'unlocked', 'main:2': 'locked', 'gambit:1': 'locked', 'avoid:1': 'locked' },
    ],
    ['cards introduced: learning', allCards(main1), [], { 'main:1': 'learning', 'main:2': 'locked' }],
    [
      'every move right twice in a row: passed, and what depends on it opens',
      allCards(main1),
      passAll(main1),
      { 'main:1': 'passed', 'main:2': 'unlocked', 'gambit:1': 'unlocked', 'main:3': 'unlocked', 'avoid:1': 'unlocked' },
    ],
    [
      'one move wrong last time: still learning',
      allCards(main1),
      [...passAll(main1), review(main1.cards[0]!.id, 'again', 3)],
      { 'main:1': 'learning', 'main:2': 'locked' },
    ],
    [
      'a hard answer does not count as right',
      allCards(main1),
      [...passAll(main1), review(main1.cards[2]!.id, 'hard', 3)],
      { 'main:1': 'learning' },
    ],
    [
      'reviews count in time order, not list order',
      allCards(main1),
      [review(main1.cards[0]!.id, 'again', 0), ...passAll(main1)].reverse(),
      { 'main:1': 'passed' },
    ],
    [
      'every card at seven days or more: graduated',
      allCards(main1, { state: 'review', scheduledDays: 7 }),
      [],
      { 'main:1': 'graduated', 'main:2': 'unlocked' },
    ],
    [
      'some moves graduated and the rest passed: passed',
      [...allCards(main1).slice(0, 2), ...allCards(main1, { state: 'review', scheduledDays: 9 }).slice(2)],
      passAll(main1).filter((row) => main1.cards.slice(0, 2).some((card) => card.id === row.cardId)),
      { 'main:1': 'passed', 'main:2': 'unlocked' },
    ],
    [
      'six days is not yet graduated',
      allCards(main1, { state: 'review', scheduledDays: 6 }),
      passAll(main1),
      { 'main:1': 'passed' },
    ],
    [
      'progress made before the path existed still shows',
      allCards(main2),
      [],
      { 'main:1': 'unlocked', 'main:2': 'learning' },
    ],
  ] as [string, Card[], Review[], Record<string, string>][])('%s', (_name, cards, reviews, expected) => {
    expect(states(cards, reviews)).toMatchObject(expected);
  });

  it('counts each unit and says what a locked unit waits for', () => {
    const progress = unitProgress(units, [cardOf(main1, 0)], [review(main1.cards[0]!.id, 'good', 1)]);
    expect(progress.get('main:1')).toMatchObject({ total: 4, introduced: 1, passed: 0, graduated: 0, waitingFor: [] });
    expect(progress.get('main:1')!.moves[0]).toEqual({ introduced: true, passed: false, graduated: false });
    expect(progress.get('main:1')!.moves[1]).toEqual({ introduced: false, passed: false, graduated: false });
    expect(progress.get('main:2')).toMatchObject({ state: 'locked', waitingFor: ['main:1'] });
  });
});

describe('pathIntroductionOrder', () => {
  const units = courseUnits(content);
  const main1 = units[0]!;
  const order = (cards: Card[], reviews: Review[]) =>
    pathIntroductionOrder(units, unitProgress(units, cards, reviews), new Set(cards.map((card) => card.id)));

  it('offers only the open units, in path order, leaving out cards that exist', () => {
    expect(order([], []).map((card) => card.id)).toEqual(main1.cards.map((card) => card.id));
    const some = [cardOf(main1, 0)];
    expect(order(some, []).map((card) => card.id)).toEqual(main1.cards.slice(1).map((card) => card.id));
    const passed = main1.cards.map((_, i) => cardOf(main1, i));
    expect(order(passed, passAll(main1)).map((card) => card.id)).toEqual(
      units.slice(1).flatMap((unit) => unit.cards.map((card) => card.id)),
    );
  });

  it('never offers a quiz', () => {
    expect(order([], []).every((card) => card.expectedUci !== '' && card.id === cardId('t', card.epd))).toBe(true);
  });
});
