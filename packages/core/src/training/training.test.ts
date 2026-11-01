import { describe, expect, it } from 'vitest';
import { buildOpening } from '../content/build-opening';
import { readLine } from '../content/line-pgn';
import { OpeningFile } from '../content/schema';
import { resolveLines } from '../content/theory';
import { siteConfig } from '../testing/site-config';
import { reduceAttempt, startAttempt, type Attempt, type AttemptAction } from './attempt';
import { moveCards } from './cards';
import { autoGrade, createScheduler } from './scheduler';
import { moveState, stepState } from './states';

const play = (actions: AttemptAction[]): Attempt =>
  actions.reduce(
    (attempt, action) => reduceAttempt(attempt, action, siteConfig.teach.triesBeforeShown),
    startAttempt(),
  );
const right = (ms = 1000): AttemptAction => ({ type: 'try', uci: 'c2c3', ms, outcome: 'right' });
const wrong: AttemptAction = { type: 'try', uci: 'f3g5', ms: 2000, outcome: 'wrong' };

describe('an attempt', () => {
  it('keeps every try, and shows the move after too many wrong ones', () => {
    const attempt = play([wrong, wrong, right()]);
    expect(attempt.tries).toHaveLength(2);
    expect(attempt).toMatchObject({ shown: true, done: true });
  });

  it('does not count a sound move that is not the line’s', () => {
    const attempt = play([{ type: 'try', uci: 'e1g1', ms: 900, outcome: 'another' }, wrong, right()]);
    expect(attempt).toMatchObject({ shown: false, done: true });
    expect(attempt.tries.map((one) => one.outcome)).toEqual(['another', 'wrong', 'right']);
  });
});

describe('grading', () => {
  const easy = siteConfig.judge.easyWithinMs;
  it.each([
    ['quick and right', [right(800)], 'easy'],
    ['right, slowly', [right(easy + 1)], 'good'],
    ['after a wrong try', [wrong, right()], 'hard'],
    ['after a hint', [{ type: 'hint' } as const, right()], 'hard'],
    ['shown', [{ type: 'show' } as const], 'again'],
  ] as const)('%s is %s', (_, actions, rating) => {
    expect(autoGrade(play([...actions]), easy)).toBe(rating);
  });
});

describe('the scheduler', () => {
  it('moves a card on with each review', () => {
    const scheduler = createScheduler(siteConfig.schedule);
    const now = new Date('2026-11-01T10:00:00Z');
    let card = scheduler.newCard('move:x:e2e4', now);
    expect(card.state).toBe('new');
    card = scheduler.review(card, 'good', now);
    expect(card.state).toBe('learning');
    expect(new Date(card.due).getTime()).toBeGreaterThan(now.getTime());
    expect(card.id).toBe('move:x:e2e4');
  });
});

describe('states', () => {
  const judge = siteConfig.judge;
  const card = createScheduler(siteConfig.schedule).newCard('c', new Date('2026-11-01'));
  it('derives a move’s state from its answers', () => {
    expect(moveState(undefined, [], judge)).toBe('open');
    expect(moveState(card, ['hard'], judge)).toBe('learning');
    expect(moveState(card, ['again', 'good', 'easy'], judge)).toBe('known');
    expect(moveState({ ...card, state: 'review', scheduledDays: 9 }, ['good'], judge)).toBe('mastered');
  });

  it('opens a step when the one it grows from is known, unless gates are off', () => {
    expect(stepState(['open', 'open'], false, true)).toBe('locked');
    expect(stepState(['open', 'open'], false, false)).toBe('open');
    expect(stepState(['known', 'learning'], true, true)).toBe('learning');
    expect(stepState(['known', 'mastered'], true, true)).toBe('known');
  });
});

describe('move cards', () => {
  const main = readLine('main', '[For "white"]\n[Kind "main"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 *');
  const trap = readLine('trap', '[For "white"]\n[Kind "trap"]\n[Start "main 3.Bc4"]\n\n3... d6 4. Nc3 Bg4 5. h3 *');
  const opening = OpeningFile.parse({
    name: 'Italian',
    side: 'white',
    start: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    level: 'first',
    summary: 'S.',
    about: { idea: 'I.', risks: 'R.', suits: 'S.' },
    variations: [{ id: 'v', lines: ['main', 'trap'] }],
  });
  const built = buildOpening('italian', opening, resolveLines([main, trap]), siteConfig.teach.stepMoves);

  it('gives one card per learner move of the lines that earn them, keyed by position and move', () => {
    const cards = moveCards(built);
    expect(cards.map((card) => card.san)).toEqual(['c3', 'd3']);
    expect(cards[0]!.id).toMatch(/^move:.+ w KQkq - c2c3$|^move:.+:c2c3$/);
  });
});
