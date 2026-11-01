import { describe, expect, it } from 'vitest';
import { buildOpening } from '../content/build-opening';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import { exerciseOver } from '../exercise/exercise';
import { siteConfig } from '../testing/site-config';
import { moveCardId, moveCards, type MoveCardDefinition } from '../training/cards';
import { createScheduler } from '../training/scheduler';
import { checkpointCleared, checkpointExercises, checkpointRef, shuffled } from './checkpoint';
import { drillExercises, drillScope, scopePositions } from './drill';
import { dueCards, moveExercise, moveInto, newLeftToday, parseMoveCardId, planIntroductions } from './review';
import { dayKey, practiceStreak } from './streak';

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
    expect(sans(scope).sort()).toEqual(['Nxd4', 'c3', 'd3', 'd4']);
    expect(scope.replies[opening.startEpd]!.sort()).toEqual(['d7d6', 'f8c5']);
    // The trap is an exercise, not a card: its reply after 4.c3 is not drilled.
    const afterC3 = Object.keys(scope.replies).find((epd) => scope.replies[epd]!.includes('g8f6'))!;
    expect(scope.replies[afterC3]).toEqual(['g8f6']);
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

  it('introduces new cards in step order, taking turns between openings, up to the limit', () => {
    const card = (id: string): MoveCardDefinition => ({ id, epd: id, uci: 'a', san: 'a', step: 's' });
    const picked = planIntroductions([[card('a1'), card('a2'), card('a3')], [card('b1')]], new Set(['a1']), 3);
    expect(picked.map((one) => one.id)).toEqual(['a2', 'b1', 'a3']);
    expect(planIntroductions([[card('a1')]], new Set(), 0)).toEqual([]);
  });

  it('counts the day’s allowance', () => {
    expect(newLeftToday(undefined, '2026-11-01', 10)).toBe(10);
    expect(newLeftToday({ day: '2026-11-01', count: 4 }, '2026-11-01', 10)).toBe(6);
    expect(newLeftToday({ day: '2026-10-31', count: 10 }, '2026-11-01', 10)).toBe(10);
    expect(newLeftToday({ day: '2026-11-01', count: 14 }, '2026-11-01', 10)).toBe(0);
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
