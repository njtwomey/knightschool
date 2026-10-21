import { testManifest } from '@/test-manifest';
import { buildOpening, courseUnits, parsePgn } from '@knightschool/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gameOf = (moves: string) =>
  parsePgn(`[Event "x"]
[Opening "T"]
[Variation "v"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves} *`);

// Seven moves of White's on the main line (two units), and two one-move replies inside it that make a side unit.
const content = buildOpening('t', testManifest(), [
  {
    id: 'main',
    kind: 'line',
    game: gameOf(
      '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 (4... d6 5. d3) (4... Qe7 5. O-O) 5. d3 d6 6. O-O O-O 7. Re1',
    ),
    source: 'main.pgn',
  },
]);

// A test can hold a load back (`gates`, one per call) to see what happens when an earlier start finishes last.
const gates: Promise<void>[] = [];
vi.mock('@/data/content', () => ({
  loadOpening: async () => {
    await gates.shift();
    return content;
  },
}));
let hash: Record<string, string> = {};
vi.mock('@/router/location', () => ({ readHashState: () => hash }));
// No database: the unit is cut with the default settings and nothing is saved.
vi.mock('@/data/storage', () => ({ whenStorageReady: () => Promise.reject(new Error('no database in tests')) }));

const { DELAYS, resumeStretch, usePlay } = await import('./store');
const { startFromAddress } = await import('./resume');

const units = courseUnits(content);
const played = () =>
  usePlay
    .getState()
    .steps.slice(0, usePlay.getState().index)
    .map((step) => step.edge.san);
/** Plays the learner's moves until the run is complete, letting the computer answer. */
function playThrough() {
  for (let i = 0; i < 40 && usePlay.getState().phase !== 'complete'; i++) {
    const { steps, index, opponentThinking } = usePlay.getState();
    const step = steps[index];
    if (step && !opponentThinking && step.ours) usePlay.getState().submitMove(step.edge.uci);
    vi.advanceTimersByTime(DELAYS.afterCorrect + DELAYS.opponent * 2);
  }
}

describe('playing one unit of the path', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    usePlay.getState().stop();
    vi.useRealTimers();
  });

  it('has the units the test expects', () => {
    expect(units.map((unit) => [unit.id, unit.cards.length, unit.side])).toEqual([
      ['main:1', 4, false],
      ['main:2', 3, false],
      ['main:3', 2, true],
    ]);
  });

  it('starts after the moves that lead to the unit and stops at its end', async () => {
    await usePlay.getState().start('t', 'main', 'practice', [], { n: 2 });
    expect(usePlay.getState().scope?.unit.id).toBe('main:2');
    expect(usePlay.getState().firstIndex).toBe(7);
    // Black's 4...Nf6 is the computer's, then the unit asks for 5.d3.
    vi.advanceTimersByTime(DELAYS.opponent);
    expect(played()).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6']);
    playThrough();
    expect(usePlay.getState().phase).toBe('complete');
    expect(usePlay.getState().results).toHaveLength(3);
    expect(played().at(-1)).toBe('Re1');
  });

  it('plays the branches of a side unit one after another, and restart goes back to the first', async () => {
    await usePlay.getState().start('t', 'main', 'practice', [], { n: 3 });
    expect(usePlay.getState().scope?.parts).toHaveLength(2);
    playThrough();
    expect(usePlay.getState().phase).toBe('complete');
    expect(usePlay.getState().scope?.part).toBe(1);
    expect(played().slice(-2)).toEqual(['Qe7', 'O-O']);
    expect(usePlay.getState().results).toHaveLength(2);
    usePlay.getState().restart();
    expect(usePlay.getState().scope?.part).toBe(0);
    expect(usePlay.getState().index).toBe(usePlay.getState().scope!.parts[0]!.from);
  });

  it('plays some moves of a unit, and Learn cannot step back before the unit', async () => {
    await usePlay.getState().start('t', 'main', 'learn', [], { n: 1, first: 3, last: 4 });
    const scope = usePlay.getState().scope!;
    expect(scope.parts).toEqual([{ moves: units[0]!.stretches[0]!.moves, from: 3, plies: [4, 6] }]);
    usePlay.getState().goTo(0);
    expect(usePlay.getState().index).toBe(3);
  });

  it('says so when the unit is not there', async () => {
    await usePlay.getState().start('t', 'main', 'practice', [], { n: 9 });
    expect(usePlay.getState().phase).toBe('error');
    expect(usePlay.getState().error).toMatch(/no unit 9/);
  });

  it('keeps the latest start when an earlier one finishes last', async () => {
    let release!: () => void;
    gates.push(new Promise((resolve) => (release = resolve)));
    const slow = usePlay.getState().start('t', 'main', 'practice', [], { n: 1 });
    await usePlay.getState().start('t', 'main', 'practice', [], { n: 2 });
    release();
    await slow;
    expect(usePlay.getState().scope?.unit.id).toBe('main:2');
    expect(usePlay.getState().firstIndex).toBe(7);
  });

  it('starts from the part the address names, on every start of the page', async () => {
    hash = { p: '1' };
    await startFromAddress('t', 'main', 'practice', { n: 3 });
    expect(usePlay.getState().scope?.part).toBe(1);
    hash = {};
  });

  it('in Learn, going to the end of one branch of a side unit carries on to the next', async () => {
    await usePlay.getState().start('t', 'main', 'learn', [], { n: 3 });
    expect(usePlay.getState().scope?.part).toBe(0);
    usePlay.getState().goTo(usePlay.getState().steps.length);
    expect(usePlay.getState().phase).toBe('playing');
    vi.advanceTimersByTime(DELAYS.opponent * 2);
    expect(usePlay.getState().scope?.part).toBe(1);
    usePlay.getState().goTo(usePlay.getState().steps.length);
    expect(usePlay.getState().phase).toBe('complete'); // the last branch's end is the unit's
  });

  it('resumes inside a stretch, never before its start', () => {
    const stretch = units[1]!.stretches[0]!;
    expect(resumeStretch(content, stretch, []).index).toBe(7);
    expect(resumeStretch(content, stretch, stretch.moves.slice(0, 9)).index).toBe(9);
  });
});
