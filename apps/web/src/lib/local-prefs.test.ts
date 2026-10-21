import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrefStore, isBoolean, oneOf, parsePrefs, readPref, writePref, type PrefSchema } from './local-prefs';

/** A localStorage that keeps values in a map. */
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
  };
}

const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

type Prefs = { colour: 'red' | 'blue'; on: boolean };
const SCHEMA: PrefSchema<Prefs> = { colour: oneOf(['red', 'blue'] as const), on: isBoolean };
const DEFAULTS: Prefs = { colour: 'red', on: true };

describe('local prefs', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('reads a saved value through its parser, else the fallback', () => {
    const parse = (raw: string) => (raw === 'yes' || raw === 'no' ? raw : undefined);
    expect(readPref('k', parse, 'no')).toBe('no');
    writePref('k', 'yes');
    expect(readPref('k', parse, 'no')).toBe('yes');
    writePref('k', 'maybe');
    expect(readPref('k', parse, 'no')).toBe('no');
    writePref('k', null);
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('falls back, and saves nothing, when localStorage throws', () => {
    vi.stubGlobal('localStorage', throwing);
    expect(readPref('k', (raw) => raw, 'fallback')).toBe('fallback');
    expect(() => writePref('k', 'x')).not.toThrow();
  });

  it('keeps the good fields of a saved object and defaults the rest', () => {
    expect(parsePrefs(null, SCHEMA, DEFAULTS)).toEqual(DEFAULTS);
    expect(parsePrefs('not json', SCHEMA, DEFAULTS)).toEqual(DEFAULTS);
    expect(parsePrefs('42', SCHEMA, DEFAULTS)).toEqual(DEFAULTS);
    expect(parsePrefs('{"colour":"blue","on":"yes","extra":1}', SCHEMA, DEFAULTS)).toEqual({
      colour: 'blue',
      on: true,
    });
  });

  it('makes a store that starts from what was saved and saves every change', () => {
    localStorage.setItem('prefs', '{"colour":"blue"}');
    const store = createPrefStore('prefs', SCHEMA, DEFAULTS);
    expect(store.getState()).toMatchObject({ colour: 'blue', on: true });
    store.getState().set({ on: false });
    expect(store.getState().on).toBe(false);
    expect(JSON.parse(localStorage.getItem('prefs')!)).toEqual({ colour: 'blue', on: false });
  });
});
