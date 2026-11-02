import { describe, expect, it } from 'vitest';
import { replay } from '../chess/play';
import { buildOpening } from '../content/build-opening';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import type { Exercise } from '../exercise/exercise';
import { siteConfig } from '../testing/site-config';
import { checkpointCleared, checkpointPlan, mistakeExercise } from './checkpoint';

const lines = resolveLines([
  readLine('main', '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O *'),
  readLine('side', '[For "white"]\n[Kind "sideline"]\n[Start "main 4.c3"]\n\n4... d6 5. d4 exd4 6. cxd4 *'),
  readLine('trap', '[For "white"]\n[Kind "trap"]\n[Start "main 3.Bc4"]\n\n3... Nd4? 4. Nxe5 Qg5 5. Nxf7 *'),
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
      { id: 'piano', lines: ['main', 'side'] },
      { id: 'traps', lines: ['trap'] },
    ],
  }),
  lines,
  siteConfig.teach.stepMoves,
);
const at = (sans: string) => replay(opening.startEpd, sans.split(' ')).at(-1)!.epd;

describe('a mistake to punish', () => {
  it('is an exercise from after the mistake, never a card', () => {
    const exercise = mistakeExercise(
      { epd: opening.startEpd, uci: 'c6d4', punish: 'f3e5' },
      { mode: 'checkpoint', tries: 1, help: false },
    );
    expect(exercise).toMatchObject({ before: 'c6d4', start: at('Nd4'), record: 'none', tries: 1, help: false });
    expect(exercise.responder).toEqual({ kind: 'scripted', script: ['f3e5'] });
    expect(exercise.id).toBe(`mistake:${at('Nd4')}:f3e5`);
  });
});

describe('a checkpoint', () => {
  const puzzle: Exercise = {
    id: 'puzzle:abc',
    mode: 'puzzle',
    start: opening.startEpd,
    side: 'white',
    grader: { kind: 'exact' },
    responder: { kind: 'scripted', script: ['f3e5'] },
  };
  const seeded = (seed: number) => () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  it('mixes a position from every step, mistakes, puzzles and questions, making up shortfalls with positions', () => {
    const plan = checkpointPlan(opening, 'piano', {
      random: seeded(7),
      tries: 1,
      mix: { positions: 2, mistakes: 2, questions: 1, puzzles: 1 },
      mistakes: [{ epd: opening.startEpd, uci: 'c6d4', punish: 'f3e5' }],
      puzzles: [puzzle],
    });
    expect(plan.counts).toEqual({ positions: 4, mistakes: 1, puzzles: 1, questions: 0 });
    expect(plan.exercises).toHaveLength(6);
    expect(plan.exercises.every((e) => e.tries === 1 && e.help === false && e.mode === 'checkpoint')).toBe(true);
    expect(plan.exercises.find((e) => e.id === 'puzzle:abc')?.record).toBe('none');
  });
  it('is stable for a seed', () => {
    const plan = (seed: number) =>
      checkpointPlan(opening, 'piano', {
        random: seeded(seed),
        tries: 1,
        mix: siteConfig.teach.checkpointMix,
      }).exercises.map((e) => e.id);
    expect(plan(3)).toEqual(plan(3));
  });
  it('is cleared at the mark with no blunders', () => {
    const results = (right: number, of: number) => Array.from({ length: of }, (_, i) => ({ right: i < right }));
    expect(checkpointCleared(results(9, 10), 0.9)).toBe(true);
    expect(checkpointCleared(results(8, 10), 0.9)).toBe(false);
    expect(checkpointCleared(results(10, 10), 0.9, 1)).toBe(false);
    expect(checkpointCleared([], 0.9)).toBe(false);
  });
});
