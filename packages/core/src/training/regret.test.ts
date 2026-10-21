import { describe, expect, it } from 'vitest';
import { moveRegret, moverValue, regretSummary, regretVerdict, REGRET_CAP, type EngineScore } from './regret';
import type { Side } from '../schema';

describe('moverValue', () => {
  it.each<[EngineScore, Side, number]>([
    [{ cp: 35 }, 'white', 35],
    [{ cp: 35 }, 'black', -35],
    [{ cp: 5000 }, 'white', REGRET_CAP],
    [{ cp: -5000 }, 'white', -REGRET_CAP],
    [{ mate: 3 }, 'white', REGRET_CAP],
    [{ mate: 3 }, 'black', -REGRET_CAP],
    [{ mate: -2 }, 'black', REGRET_CAP],
    [{ mate: 0 }, 'white', 0],
    [{}, 'white', 0],
  ])('%j for %s is %d', (score, side, value) => {
    expect(moverValue(score, side)).toBe(value);
  });
});

describe('moveRegret', () => {
  it.each<[string, EngineScore, EngineScore, Side, { cp: number; gainCp: number; verdict: string; mate: unknown }]>([
    ['the same score', { cp: 20 }, { cp: 20 }, 'white', { cp: 0, gainCp: 0, verdict: 'slip', mate: null }],
    ['a little worse for White', { cp: 40 }, { cp: 15 }, 'white', { cp: 25, gainCp: 0, verdict: 'slip', mate: null }],
    [
      'worse for Black is a higher score',
      { cp: -30 },
      { cp: 30 },
      'black',
      { cp: 60, gainCp: 0, verdict: 'inaccuracy', mate: null },
    ],
    ['a dropped piece', { cp: 20 }, { cp: -300 }, 'white', { cp: 320, gainCp: 0, verdict: 'mistake', mate: null }],
    ['better than the course', { cp: 10 }, { cp: 80 }, 'white', { cp: 0, gainCp: 70, verdict: 'better', mate: null }],
    [
      'slightly better is still a slip',
      { cp: -10 },
      { cp: -30 },
      'black',
      { cp: 0, gainCp: 20, verdict: 'slip', mate: null },
    ],
    [
      'allowing a mate',
      { cp: 50 },
      { mate: -3 },
      'white',
      { cp: 1050, gainCp: 0, verdict: 'mistake', mate: 'allowed' },
    ],
    [
      'allowing a mate as Black',
      { cp: -20 },
      { mate: 2 },
      'black',
      { cp: 1020, gainCp: 0, verdict: 'mistake', mate: 'allowed' },
    ],
    ['missing a mate', { mate: 2 }, { cp: 400 }, 'white', { cp: 600, gainCp: 0, verdict: 'mistake', mate: 'missed' }],
    [
      'a slower mate costs nothing',
      { mate: 1 },
      { mate: 4 },
      'white',
      { cp: 0, gainCp: 0, verdict: 'slip', mate: null },
    ],
    ['both lose to mate', { mate: 3 }, { mate: 5 }, 'black', { cp: 0, gainCp: 0, verdict: 'slip', mate: null }],
  ])('%s', (_name, course, played, side, expected) => {
    expect(moveRegret(course, played, side)).toEqual(expected);
  });

  it('never exceeds twice the cap', () => {
    expect(moveRegret({ mate: 1 }, { mate: -1 }, 'white').cp).toBe(2 * REGRET_CAP);
  });
});

describe('regretVerdict', () => {
  it.each<[number, number, string]>([
    [0, 0, 'slip'],
    [29, 0, 'slip'],
    [30, 0, 'inaccuracy'],
    [99, 0, 'inaccuracy'],
    [100, 0, 'mistake'],
    [0, 29, 'slip'],
    [0, 30, 'better'],
  ])('%d cp lost, %d gained: %s', (cp, gain, verdict) => {
    expect(regretVerdict(cp, gain)).toBe(verdict);
  });
});

describe('regretSummary', () => {
  it('is empty with no misses', () => {
    expect(regretSummary([])).toEqual({
      misses: 0,
      checked: 0,
      slips: 0,
      inaccuracies: 0,
      mistakes: 0,
      totalCp: 0,
      averageCp: null,
    });
  });

  it('counts the checked moves and leaves the pending ones out of the average', () => {
    const summary = regretSummary([
      moveRegret({ cp: 20 }, { cp: 10 }, 'white'),
      moveRegret({ cp: 20 }, { cp: 90 }, 'white'),
      moveRegret({ cp: 20 }, { cp: -30 }, 'white'),
      moveRegret({ cp: 20 }, { cp: -200 }, 'white'),
      undefined,
    ]);
    expect(summary).toEqual({
      misses: 5,
      checked: 4,
      slips: 2,
      inaccuracies: 1,
      mistakes: 1,
      totalCp: 10 + 0 + 50 + 220,
      averageCp: 70,
    });
  });
});
