import type { OpeningIndexEntry } from '@knightschool/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let enrolled: string[] = [];
vi.mock('@/data/storage', () => ({ whenStorageReady: () => Promise.resolve({ storage: {} }) }));
vi.mock('@/data/training-settings', () => ({ getEnrolled: () => Promise.resolve(enrolled) }));

/** A localStorage that keeps values in a map. */
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
  };
}

/** The module as a fresh page load would make it: its stores read (and migrate) what is in localStorage now. */
async function load() {
  vi.resetModules();
  return import('./practice-config');
}

beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
afterEach(() => vi.unstubAllGlobals());

describe('practice config', () => {
  it('starts from the defaults: the schedule for the quiz, the courses being learned elsewhere', async () => {
    const { savedConfig } = await load();
    expect(savedConfig('quiz')).toEqual({ source: 'due', weighting: 'random', moves: 1 });
    expect(savedConfig('name-it')).toEqual({ source: 'learning', weighting: 'random', positions: 10 });
    expect(savedConfig('speed')).toEqual({
      source: 'learning',
      weighting: 'random',
      run: 'lines',
      lines: 5,
      seconds: 60,
      depth: 10,
    });
  });

  it('keeps what is saved and defaults only the fields it does not accept', async () => {
    localStorage.setItem(
      'knightschool.practice.speed',
      JSON.stringify({ source: 'rush:italian', weighting: 'popular', run: 'timed', lines: 7, seconds: 120, depth: 0 }),
    );
    localStorage.setItem('knightschool.practice.quiz', JSON.stringify({ source: 'rush:italian', moves: 0 }));
    localStorage.setItem('knightschool.practice.name-it', 'not json');
    const { savedConfig } = await load();
    expect(savedConfig('speed')).toEqual({
      source: 'rush:italian',
      weighting: 'popular',
      run: 'timed',
      lines: 5,
      seconds: 120,
      depth: 0,
    });
    // An opening rush is Speed's alone.
    expect(savedConfig('quiz')).toEqual({ source: 'due', weighting: 'random', moves: 0 });
    expect(savedConfig('name-it').positions).toBe(10);
  });

  it('saves a set-up for the next visit', async () => {
    const first = await load();
    first.saveConfig('name-it', { source: 'all', weighting: 'popular', positions: 20 });
    const { savedConfig } = await load();
    expect(savedConfig('name-it')).toEqual({ source: 'all', weighting: 'popular', positions: 20 });
  });

  it.each([
    [
      'quiz',
      {
        'knightschool.quiz.source': 'caro-kann',
        'knightschool.quiz.weighting': 'popular',
        'knightschool.quiz.moves': '3',
      },
      { source: 'caro-kann', weighting: 'popular', moves: 3 },
    ],
    ['quiz, one key only', { 'knightschool.quiz.moves': '0' }, { source: 'due', weighting: 'random', moves: 0 }],
    [
      'name-it',
      { 'knightschool.guess.source': 'all', 'knightschool.guess.weighting': 'popular' },
      { source: 'all', weighting: 'popular', positions: 10 },
    ],
    [
      'speed',
      {
        'knightschool.speed': JSON.stringify({
          mode: 'timed',
          lines: 10,
          seconds: 30,
          source: 'rush:italian',
          weighting: 'popular',
          depth: 15,
        }),
      },
      { source: 'rush:italian', weighting: 'popular', run: 'timed', lines: 10, seconds: 30, depth: 15 },
    ],
  ] as const)('carries the old keys over once: %s', async (name, old, expected) => {
    const mode = name.split(',')[0] as 'quiz' | 'name-it' | 'speed';
    for (const [key, value] of Object.entries(old)) localStorage.setItem(key, value);
    const { savedConfig, practiceKey } = await load();
    expect(savedConfig(mode)).toEqual(expected);
    for (const key of Object.keys(old)) expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(practiceKey(mode))).not.toBeNull();
    // Once only: an old key written again later (an older tab) does not overwrite the new choice.
    for (const [key, value] of Object.entries(old)) localStorage.setItem(key, value === '3' ? '5' : value);
    const again = await load();
    expect(again.savedConfig(mode)).toEqual(expected);
  });
});

describe('resolvePool', () => {
  const course = (id: string) => ({ id, name: id }) as OpeningIndexEntry;
  const index = [course('italian'), course('caro-kann'), course('london')];

  it.each([
    ['the courses being learned', 'learning', ['london', 'italian'], ['italian', 'london']],
    ['everything when nothing is being learned', 'learning', [], ['italian', 'caro-kann', 'london']],
    ['everything', 'all', ['london'], ['italian', 'caro-kann', 'london']],
    ['one course', 'caro-kann', ['london'], ['caro-kann']],
    ['a course no longer there: the courses being learned', 'gone', ['london'], ['london']],
  ])('%s', async (_, source, learning, expected) => {
    enrolled = learning;
    const { resolvePool } = await load();
    expect((await resolvePool(source, index)).map((entry) => entry.id)).toEqual(expected);
  });
});

describe('describeConfig', () => {
  const index = [{ id: 'italian', name: 'Italian Game' }] as OpeningIndexEntry[];

  it.each([
    ['quiz', { source: 'due', weighting: 'popular', moves: 1 }, 'Due today (your schedule) · 1 move per question'],
    [
      'quiz',
      { source: 'italian', weighting: 'popular', moves: 0 },
      'From Italian Game, favouring popular · the rest of the line per question · free practice, not saved',
    ],
    ['name-it', { source: 'all', weighting: 'random', positions: 5 }, 'From everything, at random · 5 positions'],
    [
      'speed',
      { source: 'learning', weighting: 'random', run: 'lines', lines: 3, seconds: 60, depth: 6 },
      'From the courses I am learning, at random · 3 lines · to move 6',
    ],
    [
      'speed',
      { source: 'rush:italian', weighting: 'random', run: 'timed', lines: 3, seconds: 120, depth: 6 },
      'Opening rush on Italian Game, at random · 2 minutes against the clock',
    ],
  ] as const)('%s: %s', async (mode, config, text) => {
    const { describeConfig } = await load();
    expect(describeConfig(mode, config as never, index)).toBe(text);
  });
});
