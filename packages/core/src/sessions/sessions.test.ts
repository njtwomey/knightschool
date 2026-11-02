import { describe, expect, it } from 'vitest';
import { buildOpening } from '../content/build-opening';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import { exerciseOver } from '../exercise/exercise';
import { siteConfig } from '../testing/site-config';
import { moveCardId, moveCards, type MoveCardDefinition } from '../training/cards';
import { createScheduler } from '../training/scheduler';
import { checkpointRef } from '../training/test-out';
import { checkpointCleared, checkpointExercises, shuffled } from './checkpoint';
import {
  branchExercise,
  drillBranches,
  drillExercises,
  drillScope,
  orderBranches,
  resumeBranch,
  scopePositions,
} from './drill';
import {
  dueCards,
  introducedOn,
  moveExercise,
  moveInto,
  newLeftToday,
  parseMoveCardId,
  planIntroductions,
  runExercise,
} from './review';
import { activityDays, dayKey, practiceStreak } from './streak';

const lines = resolveLines([
  readLine('main', '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 *'),
  readLine('d6', '[For "white"]\n[Kind "sideline"]\n[Start "main 3.Bc4"]\n\n3... d6 4. d4 exd4 5. Nxd4 *'),
  readLine('trap', '[For "white"]\n[Kind "trap"]\n[Start "main 4.c3"]\n\n4... Qe7 5. d4 Bb6 6. d5 *'),
]);
const opening = buildOpening(
  'italian',
  OpeningFile.parse({
    name: 'Italian',
    side: 'white',
    start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    level: 'first',
    summary: 'S.',
    about: { idea: 'I.', risks: 'R.', suits: 'S.' },
    variations: [
      { id: 'piano', lines: ['main', 'trap'] },
      { id: 'other', lines: ['d6'] },
    ],
  }),
  lines,
  siteConfig.teach.stepMoves,
);
const sans = (scope: ReturnType<typeof drillScope>) =>
  scopePositions(scope).map(({ epd, uci }) => opening.positions[epd]!.moves.find((m) => m.uci === uci)!.san);

describe('a drill', () => {
  it('holds the learner’s card moves and the replies on lines that earn cards', () => {
    const scope = drillScope(opening);
    expect(sans(scope).sort()).toEqual(['Nxd4', 'c3', 'd3', 'd4', 'd4', 'd5']);
    expect(scope.replies[opening.startEpd]!.sort()).toEqual(['d7d6', 'f8c5']);
    // A trap to spring earns cards like any line a step teaches: its reply after 4.c3 is drilled too.
    const afterC3 = Object.keys(scope.replies).find((epd) => scope.replies[epd]!.includes('g8f6'))!;
    expect(scope.replies[afterC3]!.sort()).toEqual(['d8e7', 'g8f6']);
  });

  it('keeps to one variation’s lines', () => {
    const scope = drillScope(opening, 'other');
    expect(sans(scope)).toEqual(['d4', 'Nxd4']);
    expect(scope.replies[opening.startEpd]).toEqual(['d7d6']);
  });

  it('runs from the start until the book ends', () => {
    const [run] = drillExercises(opening, drillScope(opening, 'other'), 3, 'other');
    expect(run!.id).toBe('drill:italian:other:1');
    expect(exerciseOver(run!, opening.startEpd, 0, 0)).toBe(false);
    const end = opening.lines.find((line) => line.id === 'd6')!;
    let epd = opening.startEpd;
    for (const uci of end.moves.slice(opening.startPly))
      epd = opening.positions[epd]!.moves.find((m) => m.uci === uci)!.to;
    expect(exerciseOver(run!, epd, 5, 2)).toBe(true);
  });
});

describe('drill branches', () => {
  const scope = drillScope(opening);
  const sanOf = (moves: string[]) => {
    let epd = opening.startEpd;
    return moves.map((uci) => {
      const move = opening.positions[epd]!.moves.find((m) => m.uci === uci)!;
      epd = move.to;
      return move.san;
    });
  };
  it('lists every branch once, in the order written, each ending on a learner move', () => {
    const branches = drillBranches(opening, scope);
    expect(branches.map((b) => sanOf(b.moves).join(' '))).toEqual([
      'Bc5 c3 Nf6 d3',
      'Bc5 c3 Qe7 d4 Bb6 d5',
      'd6 d4 exd4 Nxd4',
    ]);
    expect(branches.map((b) => b.line)).toEqual(['main', 'trap', 'd6']);
    expect(branches.map((b) => b.weight)).toEqual([0.25, 0.25, 0.5]);
    expect(branches[0]!.cards).toHaveLength(2);
  });
  it('weighs each branch by the band’s games', () => {
    const counts = {
      [opening.startEpd]: {
        moves: [
          { uci: 'f8c5', games: 300 },
          { uci: 'd7d6', games: 100 },
          { uci: 'g8f6', games: 600 },
        ],
      },
    };
    expect(drillBranches(opening, scope, counts).map((b) => b.weight)).toEqual([0.375, 0.375, 0.25]);
  });
  it('orders branches as written, by the band, or the weakest first, each once', () => {
    const branches = drillBranches(opening, scope);
    const seq = [0.9, 0.1];
    const random = () => seq.shift() ?? 0;
    expect(orderBranches(branches, 'written', random).map((b) => b.line)).toEqual(['d6', 'main', 'trap']);
    const weak = orderBranches(branches, 'least-known', Math.random, (b) => (b.line === 'trap' ? 2 : 1));
    expect(weak.map((b) => b.line)).toEqual(['trap', 'd6', 'main']);
    expect(
      orderBranches(branches, 'level', () => 0.99)
        .map((b) => b.line)
        .sort(),
    ).toEqual(['d6', 'main', 'trap']);
  });
  it('resumes a branch from the moves in the address', () => {
    const branches = drillBranches(opening, scope);
    const start = opening.lines.find((l) => l.id === 'd6')!.moves.slice(0, opening.startPly);
    const found = resumeBranch(opening, branches, [...start, 'd7d6', 'd2d4'])!;
    expect(found.branch.line).toBe('d6');
    expect(found.from).toBe(2);
    expect(resumeBranch(opening, branches, [...start, 'g8f6'])).toBeNull();
    expect(resumeBranch(opening, branches, ['e2e4'])).toBeNull();
    const exercise = branchExercise(opening, scope, found.branch, { id: 'x', from: found.from });
    expect(exercise.startPly).toBe(opening.startPly + 2);
    expect(exercise.responder).toEqual({ kind: 'scripted', script: found.branch.moves.slice(2) });
    expect(exerciseOver(exercise, exercise.start, 0, 0)).toBe(false);
  });
});

describe('a review', () => {
  const scheduler = createScheduler(siteConfig.schedule);
  const now = new Date('2026-11-01T12:00:00Z');

  it('reads a move card id back', () => {
    const epd = opening.startEpd;
    expect(parseMoveCardId(moveCardId(epd, 'f8c5'))).toEqual({ epd, uci: 'f8c5' });
    expect(parseMoveCardId('puzzle:abc')).toBeNull();
  });

  it('asks the due cards, the most overdue first', () => {
    const card = (id: string, due: string) => ({ ...scheduler.newCard(id, now), due });
    const due = dueCards(
      [card('a', '2026-11-01T11:00:00Z'), card('b', '2026-11-02T00:00:00Z'), card('c', '2026-10-30T00:00:00Z')],
      now,
    );
    expect(due.map((one) => one.id)).toEqual(['c', 'a']);
  });

  it('makes a card an exercise from its position, with the move that reached it', () => {
    const [first] = moveCards(opening);
    const exercise = moveExercise(first!, { mode: 'review', before: moveInto(opening, first!.epd) });
    expect(exercise.id).toBe(first!.id);
    expect(exercise.before).toBe('f8c5');
    expect(exercise.side).toBe('white');
    expect(exerciseOver(exercise, first!.epd, 0, 0)).toBe(false);
    expect(exerciseOver(exercise, first!.epd, 1, 1)).toBe(true);
  });

  it('asks a run of moves along the card’s line, stopping at a move not yet met', () => {
    const [c3, d3] = moveCards(opening);
    const run = runExercise(opening, c3!, { mode: 'review', moves: 2 });
    expect(run.id).toBe(c3!.id);
    expect(run.responder).toEqual({ kind: 'scripted', script: ['c2c3', 'g8f6', 'd2d3'] });
    expect(run.learnerMoves).toBeUndefined();
    const rest = runExercise(opening, c3!, { mode: 'review', moves: 0 });
    expect(rest.responder.kind === 'scripted' && rest.responder.script).toEqual(['c2c3', 'g8f6', 'd2d3']);
    const held = runExercise(opening, c3!, { mode: 'review', moves: 3, allowed: (id) => id !== d3!.id });
    expect(held.responder).toEqual({ kind: 'scripted', script: ['c2c3'] });
    expect(runExercise(opening, c3!, { mode: 'review', moves: 1 })).toEqual(moveExercise(c3!, { mode: 'review' }));
  });
  it('introduces new cards in step order, taking turns between openings, up to the limit', () => {
    const card = (id: string): MoveCardDefinition => ({ id, epd: id, uci: 'a', san: 'a', step: 's' });
    const picked = planIntroductions([[card('a1'), card('a2'), card('a3')], [card('b1')]], new Set(['a1']), 3);
    expect(picked.map((one) => one.id)).toEqual(['a2', 'b1', 'a3']);
    expect(planIntroductions([[card('a1')]], new Set(), 0)).toEqual([]);
  });

  it('counts the day’s allowance', () => {
    expect(newLeftToday(0, 10)).toBe(10);
    expect(newLeftToday(4, 10)).toBe(6);
    expect(newLeftToday(14, 10)).toBe(0);
  });
  it('counts the cards met for the first time today, from any mode, moves and questions only', () => {
    const at = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
    const reviews = [
      { cardId: 'move:a:e2e4', at: at('2026-10-31', 10) },
      { cardId: 'move:a:e2e4', at: at('2026-11-01', 10) },
      { cardId: 'move:b:d2d4', at: at('2026-11-01', 9) },
      { cardId: 'move:b:d2d4', at: at('2026-11-01', 11) },
      { cardId: 'quiz:italian:c3', at: at('2026-11-01', 12) },
      { cardId: 'puzzle:abc', at: at('2026-11-01', 12) },
    ];
    expect(introducedOn(reviews, '2026-11-01')).toBe(2);
    expect(introducedOn(reviews, '2026-10-31')).toBe(1);
    expect(introducedOn([], '2026-11-01')).toBe(0);
  });
});

describe('a checkpoint', () => {
  const seeded = (seed: number) => () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  it('asks each learner position of the variation once, one try and no help, stable for a seed', () => {
    const one = checkpointExercises(opening, 'piano', seeded(7), siteConfig.teach.checkpointTries);
    const two = checkpointExercises(opening, 'piano', seeded(7), siteConfig.teach.checkpointTries);
    expect(one.map((e) => e.id)).toEqual(two.map((e) => e.id));
    expect(one.map((e) => e.id).sort()).toEqual(
      scopePositions(drillScope(opening, 'piano'))
        .map((p) => moveCardId(p.epd, p.uci))
        .sort(),
    );
    expect(one.every((e) => e.mode === 'checkpoint' && e.help === false && e.tries === 1 && e.before)).toBe(true);
  });

  it('is cleared at the mark', () => {
    const results = (right: number, of: number) => Array.from({ length: of }, (_, i) => ({ right: i < right }));
    expect(checkpointCleared(results(9, 10), 0.9)).toBe(true);
    expect(checkpointCleared(results(8, 10), 0.9)).toBe(false);
    expect(checkpointCleared([], 0.9)).toBe(false);
    expect(checkpointRef('italian', 'piano')).toBe('checkpoint:italian:piano');
  });

  it('shuffles without losing anything', () => {
    expect(shuffled([1, 2, 3, 4], seeded(3)).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('a streak', () => {
  const at = (day: number, hour = 10) => new Date(2026, 10, day, hour).toISOString();
  const now = new Date(2026, 10, 10, 18);

  it('counts days in a row up to today, and keeps yesterday’s until today is over', () => {
    expect(practiceStreak([at(8), at(9), at(10), at(10, 12)], now)).toMatchObject({ days: 3, doneToday: true });
    expect(practiceStreak([at(8), at(9)], now)).toMatchObject({ days: 2, doneToday: false });
    expect(practiceStreak([at(7), at(8)], now)).toMatchObject({ days: 0, doneToday: false });
  });

  it('remembers the longest run', () => {
    const facts = practiceStreak([at(1), at(2), at(3), at(4), at(9), at(10)], now);
    expect(facts).toMatchObject({ days: 2, longest: 4, since: dayKey(new Date(2026, 10, 9)) });
    expect(practiceStreak([], now)).toEqual({ days: 0, longest: 0, doneToday: false });
  });
});

describe('activity days', () => {
  it('counts every answer by local day, with those right and each mode, leaving out watching', () => {
    const at = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString();
    const days = activityDays([
      { at: at('2026-11-02', 9), mode: 'review', result: 'right' },
      { at: at('2026-11-01', 9), mode: 'review', result: 'wrong' },
      { at: at('2026-11-02', 10), mode: 'drill', result: 'right' },
      { at: at('2026-11-02', 11), mode: 'review', result: 'shown' },
      { at: at('2026-11-02', 12), mode: 'watch', result: 'right' },
    ]);
    expect(days).toEqual([
      { date: '2026-11-01', answers: 1, right: 0, modes: { review: 1 } },
      { date: '2026-11-02', answers: 3, right: 2, modes: { review: 2, drill: 1 } },
    ]);
  });
});
