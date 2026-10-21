import { testManifest } from '@/test-manifest';
import { buildOpening, parsePgn } from '@knightschool/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_DELAYS as DELAYS } from '@/lib/feedback';
import { setRandom, usePlay } from './store';

const game = parsePgn(`[Event "x"]
[Opening "T"]
[Variation "main"]
[ECO "C20"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 *`);

const gameOf = (moves: string) =>
  parsePgn(`[Event "x"]
[Opening "B"]
[Variation "v"]
[ECO "B12"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]

${moves}`);

const content = buildOpening('t', testManifest(), [{ id: 'main', kind: 'line', game, source: 'main.pgn' }]);

async function begin(mode: 'learn' | 'drill') {
  usePlay.setState({ content, variantId: 'main', steps: [], phase: 'idle' });
  const { lineSteps } = await import('@knightschool/core');
  usePlay.setState({ steps: lineSteps(content, 'main') });
  usePlay.getState().setMode(mode);
}

const san = () =>
  usePlay
    .getState()
    .steps.slice(0, usePlay.getState().index)
    .map((step) => step.edge.san);

describe('line play', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    usePlay.getState().stop();
    vi.useRealTimers();
  });

  it('drill: the computer replies by itself after each correct move, with no click to continue', async () => {
    await begin('drill');
    expect(usePlay.getState().phase).toBe('playing');
    expect(usePlay.getState().submitMove('e2e4')).toBe(true);
    expect(usePlay.getState().badge).toEqual({ square: 'e4', kind: 'correct' });
    expect(san()).toEqual(['e4']);

    vi.advanceTimersByTime(DELAYS.afterCorrect);
    expect(usePlay.getState().opponentThinking).toBe(true);
    vi.advanceTimersByTime(DELAYS.opponent);
    expect(san()).toEqual(['e4', 'e5']);
    expect(usePlay.getState().opponentThinking).toBe(false);
    expect(usePlay.getState().badge).toBeNull();
  });

  it('drill: a wrong move is refused with a cross and the same move is asked again', async () => {
    await begin('drill');
    expect(usePlay.getState().submitMove('d2d4')).toBe(false);
    expect(usePlay.getState().badge).toEqual({ square: 'd4', kind: 'wrong' });
    expect(san()).toEqual([]);
    vi.advanceTimersByTime(DELAYS.wrongBadge);
    expect(usePlay.getState().badge).toBeNull();
    expect(usePlay.getState().submitMove('e2e4')).toBe(true);
    expect(usePlay.getState().results[0]).toMatchObject({ index: 0, rating: 'hard' });
  });

  it('drill: two wrong moves reveal the move, and it must still be played', async () => {
    await begin('drill');
    usePlay.getState().submitMove('d2d4');
    usePlay.getState().submitMove('c2c4');
    expect(usePlay.getState().attempt.shown).toBe(true);
    expect(usePlay.getState().phase).toBe('playing');
    expect(usePlay.getState().submitMove('e2e4')).toBe(true);
    expect(usePlay.getState().results[0]?.rating).toBe('again');
  });

  it('drill: a hint marks the piece to move and lowers the rating', async () => {
    await begin('drill');
    usePlay.getState().hint();
    expect(usePlay.getState().attempt.hintUsed).toBe(true);
    usePlay.getState().submitMove('e2e4');
    expect(usePlay.getState().results[0]?.rating).toBe('hard');
  });

  it('drill: plays the whole line through to the end by itself', async () => {
    await begin('drill');
    for (const uci of ['e2e4', 'g1f3', 'f1c4']) {
      expect(usePlay.getState().submitMove(uci)).toBe(true);
      vi.advanceTimersByTime(DELAYS.afterCorrect + DELAYS.opponent);
    }
    expect(usePlay.getState().phase).toBe('complete');
    expect(san()).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']);
    expect(usePlay.getState().results).toHaveLength(3);
  });

  it('learn: the learner plays both sides, and every move is asked for', async () => {
    await begin('learn');
    expect(usePlay.getState().submitMove('e2e4')).toBe(true);
    vi.advanceTimersByTime(DELAYS.afterCorrect);
    expect(usePlay.getState().opponentThinking).toBe(false); // nothing is played for them
    expect(usePlay.getState().submitMove('e7e5')).toBe(true);
    expect(san()).toEqual(['e4', 'e5']);
  });

  it('ignores an illegal move and moves made while the computer is replying', async () => {
    await begin('drill');
    expect(usePlay.getState().submitMove('e2e5')).toBe(false);
    expect(usePlay.getState().badge).toBeNull();
    usePlay.getState().submitMove('e2e4');
    vi.advanceTimersByTime(DELAYS.afterCorrect); // computer is about to reply
    expect(usePlay.getState().submitMove('g1f3')).toBe(false);
  });

  it('restart goes back to the start of the line', async () => {
    await begin('drill');
    usePlay.getState().submitMove('e2e4');
    usePlay.getState().restart();
    expect(usePlay.getState().index).toBe(0);
    expect(usePlay.getState().results).toEqual([]);
  });
});

describe('every branch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    usePlay.getState().stop();
    setRandom(Math.random);
    vi.useRealTimers();
  });

  // White's answer to the Caro-Kann is 2. Nc3; Black may reply 2...d5 or 2...e5, and White must know both.
  const branchy = buildOpening('b', testManifest({ name: 'B', eco: 'B12', lines: ['main', 'side'] }), [
    { id: 'main', kind: 'line', game: gameOf('1. e4 c6 2. Nc3 d5 3. Nf3 *'), source: 'main.pgn' },
    { id: 'side', kind: 'line', game: gameOf('1. e4 c6 2. Nc3 e5 3. Nf3 *'), source: 'side.pgn' },
  ]);

  async function drill(roll: number) {
    setRandom(() => roll);
    usePlay.setState({ content: branchy, variantId: 'all', steps: [], index: 0, phase: 'idle' });
    usePlay.getState().setMode('branches');
  }

  const played = () =>
    usePlay
      .getState()
      .steps.slice(0, usePlay.getState().index)
      .map((step) => step.edge.san);
  const tapMove = (uci: string) => {
    expect(usePlay.getState().submitMove(uci)).toBe(true);
    vi.advanceTimersByTime(DELAYS.afterCorrect + DELAYS.opponent);
  };

  it('plays the branch the dice pick, and the learner answers it', async () => {
    await drill(0); // main line
    tapMove('e2e4'); // 1. e4, then the computer plays 1...c6
    tapMove('b1c3'); // 2. Nc3, then the computer picks 2...d5
    expect(played()).toEqual(['e4', 'c6', 'Nc3', 'd5']);
    tapMove('g1f3');
    expect(usePlay.getState().phase).toBe('complete');
  });

  it('plays a different branch with different dice, and expects the answer to that one', async () => {
    await drill(0.9); // the less common reply
    tapMove('e2e4');
    tapMove('b1c3');
    expect(played()).toEqual(['e4', 'c6', 'Nc3', 'e5']);
    tapMove('g1f3');
    expect(usePlay.getState().phase).toBe('complete');
    expect(usePlay.getState().results).toHaveLength(3);
  });
});

describe('resuming from the moves in a URL', () => {
  it('resumes a fixed line after the moves that match, and ignores moves that do not', async () => {
    const { resumeFrom } = await import('./store');
    expect(resumeFrom(content, 'main', 'drill', ['e2e4', 'e7e5']).index).toBe(2);
    expect(resumeFrom(content, 'main', 'drill', ['e2e4', 'a7a6']).index).toBe(1);
    expect(resumeFrom(content, 'main', 'drill', []).index).toBe(0);
    expect(resumeFrom(content, 'main', 'drill', ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'a2a3']).index).toBe(
      6,
    );
  });

  it('rebuilds the branch that was being played', async () => {
    const { resumeFrom } = await import('./store');
    const resumed = resumeFrom(content, 'all', 'branches', ['e2e4', 'e7e5', 'g1f3']);
    expect(resumed.steps.map((step) => step.edge.san)).toEqual(['e4', 'e5', 'Nf3']);
    expect(resumed.steps.map((step) => step.ours)).toEqual([true, false, true]);
    expect(resumed.index).toBe(3);
    expect(resumeFrom(content, 'all', 'branches', ['zzzz']).steps).toEqual([]);
  });
});
