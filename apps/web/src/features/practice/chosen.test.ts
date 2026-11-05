import { moveCards, stepPick, variationPick, type Card } from '@knightschool/core';
import { buildOpening, OpeningFile, readLine, resolveLines } from '@knightschool/core/content';
import { describe, expect, it, vi } from 'vitest';
import { stepStates } from '@/features/learn/model';
import { coverageOpenings, drillOptions, dueOutside, hasPicks, withRepertoire } from './chosen';
import { startedOpenings, type LearnerProgress, type OpeningProgress } from './progress';
import { nextStateOf } from './today/next';

// The web tests have no YAML loader: the same file, as core's tests read it (by a variable: the app's build has no node).
vi.mock('@/data/site-config', () => {
  const path = new URL('../../../../../packages/core/src/testing/site-config.ts', import.meta.url).pathname;
  return import(/* @vite-ignore */ path);
});

const line = (id: string, moves: string) => readLine(id, `[For "white"]\n[Kind "main"]\n\n${moves} *`);

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
      { id: 'quiet', lines: ['main'] },
      { id: 'sharp', lines: ['knights'] },
    ],
  }),
  resolveLines([
    line('main', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6'),
    line('knights', '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5'),
  ]),
  4,
);

const NOW = new Date('2026-11-05T12:00:00Z');
const defs = moveCards(opening);
const stepOf = (variation: string) =>
  opening.steps.find((step) => step.variation === variation && step.id !== 'setup')!;
const cardsOf = (variation: string) => defs.filter((def) => def.step === stepOf(variation).id);

const card = (id: string, due: string): Card => ({ id, due }) as unknown as Card;
const past = '2026-11-01T00:00:00Z';
const future = '2026-12-01T00:00:00Z';

/** The learner has one due card in each variation and one not yet due. */
function progress(): LearnerProgress {
  const cards = [
    card(cardsOf('quiet')[0]!.id, past),
    card(cardsOf('sharp')[0]!.id, past),
    card(cardsOf('sharp')[1]!.id, future),
  ];
  const states = stepStates(opening, cards, [], []);
  const one = {
    opening,
    cards: states.cards,
    stepStates: states.states,
    stepCounts: states.counts,
    started: true,
    due: 2,
    checkpoints: [
      { variation: 'quiet', name: 'Quiet', positions: 2, state: 'locked' },
      { variation: 'sharp', name: 'Sharp', positions: 2, state: 'locked' },
    ],
  } as unknown as OpeningProgress;
  return {
    openings: [one],
    chosen: [],
    allDue: cards.slice(0, 2),
    duePuzzles: new Map(),
    cards,
    reviews: [],
    attempts: [],
    due: cards.slice(0, 2),
    newLeft: 10,
  } as unknown as LearnerProgress;
}

/** A learner with nothing answered yet. */
function fresh(): LearnerProgress {
  const whole = progress();
  const states = stepStates(opening, [], [], []);
  whole.openings[0]!.stepStates = states.states;
  whole.openings[0]!.stepCounts = states.counts;
  return { ...whole, cards: [], allDue: [], due: [] };
}

describe('practice with something ticked', () => {
  it('changes nothing with nothing ticked', () => {
    const whole = progress();
    const limited = withRepertoire(whole, [], NOW);
    expect(hasPicks(limited)).toBe(false);
    expect(limited.due.map((one) => one.id)).toEqual(whole.due.map((one) => one.id));
    expect(startedOpenings(limited)).toEqual(whole.openings);
    expect(drillOptions(limited.openings[0]!)).toEqual({});
  });

  it('ignores picks that hold nothing', () => {
    expect(hasPicks(withRepertoire(progress(), ['gone', variationPick('italian', 'gone')], NOW))).toBe(false);
  });

  it('cuts what is due and the next review to the ticks, and counts what waits outside', () => {
    const limited = withRepertoire(progress(), [variationPick('italian', 'sharp')], NOW);
    expect(limited.due.map((one) => one.id)).toEqual([cardsOf('sharp')[0]!.id]);
    expect(limited.dueByKind.moves).toBe(1);
    expect(dueOutside(limited)).toBe(1);
    expect(limited.nextDue?.toISOString()).toBe(new Date(future).toISOString());
    expect(limited.chosen[0]!.due).toBe(1);
  });

  it('cuts an opening to its ticks and leaves the whole picture alone', () => {
    const limited = withRepertoire(progress(), [stepPick('italian', stepOf('sharp').id)], NOW);
    const view = limited.chosen[0]!;
    expect([...view.stepStates.keys()]).toEqual([stepOf('sharp').id]);
    expect(view.cards.every((one) => one.step === stepOf('sharp').id)).toBe(true);
    expect(view.checkpoints.map((one) => one.variation)).toEqual(['sharp']);
    expect(drillOptions(view).ends?.has('knights')).toBe(true);
    expect(limited.openings[0]!.cards).toHaveLength(defs.length);
    expect(coverageOpenings(limited)[0]).toBe(limited.openings[0]);
  });

  it('counts a ticked step as open however far off it is, without changing its state', () => {
    const whole = fresh();
    expect(whole.openings[0]!.stepStates.get(stepOf('sharp').id)).toBe('locked');
    const limited = withRepertoire(whole, [variationPick('italian', 'sharp')], NOW);
    expect(limited.chosen[0]!.stepStates.get(stepOf('sharp').id)).toBe('open');
    expect(limited.chosen[0]!.started).toBe(true);
    expect(limited.openings[0]!.stepStates.get(stepOf('sharp').id)).toBe('locked');
  });

  it('offers the next ticked step, not the opening’s first', () => {
    const next = nextStateOf(withRepertoire(fresh(), [variationPick('italian', 'sharp')], NOW), NOW);
    expect(next.hasRepertoire).toBe(true);
    expect(next.nextOpenStep?.number).toBe(opening.steps.indexOf(stepOf('sharp')) + 1);
  });

  it('is worked out from the whole picture each time', () => {
    const first = withRepertoire(progress(), [variationPick('italian', 'sharp')], NOW);
    const second = withRepertoire(first, [variationPick('italian', 'quiet')], NOW);
    expect(second.due.map((one) => one.id)).toEqual([cardsOf('quiet')[0]!.id]);
    expect(withRepertoire(second, [], NOW).due).toHaveLength(2);
  });
});
