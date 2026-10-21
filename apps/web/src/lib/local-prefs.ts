import { create, type StoreApi, type UseBoundStore } from 'zustand';

/**
 * Per-device choices kept in localStorage, so they apply before the database is open. localStorage can throw (a private
 * window, blocked site data) or hold anything an older version wrote, so every read falls back and every write may
 * quietly not happen: the choice then still applies for this visit.
 */

/** The saved value under `key`, through `parse`; `fallback` when there is none, it cannot be read, or `parse` says no. */
export function readPref<T>(key: string, parse: (raw: string) => T | undefined, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Saves `value` under `key`; null removes it. */
export function writePref(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // not saved; the choice still applies for this visit
  }
}

/** Which values each field of a saved object may hold. */
export type PrefSchema<T> = { [K in keyof T]: (value: unknown) => boolean };

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
/** A guard for one of a fixed list of values. */
export const oneOf =
  <V>(values: readonly V[]) =>
  (value: unknown) =>
    values.includes(value as V);

/**
 * A saved JSON object, field by field: a field the schema rejects (or one missing) takes its default, so an old or
 * damaged value can never break what reads it, and the fields that are still good are kept.
 */
export function parsePrefs<T extends object>(raw: string | null, schema: PrefSchema<T>, defaults: T): T {
  let saved: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>;
  } catch {
    // the defaults, below
  }
  const out = { ...defaults };
  for (const key of Object.keys(schema) as (keyof T & string)[])
    if (schema[key](saved[key])) out[key] = saved[key] as T[typeof key];
  return out;
}

export const readPrefs = <T extends object>(key: string, schema: PrefSchema<T>, defaults: T): T =>
  readPref(key, (raw) => parsePrefs(raw, schema, defaults), defaults);

/** Saves only the schema's fields, so a store's functions never end up in localStorage. */
export function writePrefs<T extends object>(key: string, schema: PrefSchema<T>, value: T): void {
  const fields = Object.fromEntries(Object.keys(schema).map((field) => [field, value[field as keyof T]]));
  writePref(key, JSON.stringify(fields));
}

export type PrefStore<T> = UseBoundStore<StoreApi<T & { set: (patch: Partial<T>) => void }>>;

/** A Zustand store of saved choices: read once when it is made, written whole on every `set`. */
export function createPrefStore<T extends object>(key: string, schema: PrefSchema<T>, defaults: T): PrefStore<T> {
  return create<T & { set: (patch: Partial<T>) => void }>()((set, get) => ({
    ...readPrefs(key, schema, defaults),
    set(patch) {
      set(patch as Partial<T & { set: (patch: Partial<T>) => void }>);
      writePrefs(key, schema, get());
    },
  }));
}
