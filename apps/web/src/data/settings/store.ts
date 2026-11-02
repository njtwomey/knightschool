import {
  checkSetting,
  openingSettingKey,
  readStoredSettings,
  settingsRegistry,
  storedSettingText,
  type AnySettingDefinition,
  type SettingDefinition,
  type SettingKey,
  type SettingValues,
} from '@knightschool/core';
import { learnerStore } from '../learner';
import { siteConfig } from '../site-config';

/*
 * Every stored setting value, per layer and store, behind the one registry (docs/v2/stores/settings.md):
 * - device settings in localStorage under `knightschool.settings` (one object, read key by key);
 * - learner settings in the SQLite `settings` table, one row per key (JSON text), and `opening:<id>:<key>` rows for the
 *   opening layer; exported with everything else;
 * - the secret (the Lichess token) in localStorage under `knightschool.explorerToken`, never exported.
 * The session layer lives with the page that holds it; the material layer comes from the content. Values are checked
 * when read (a bad one falls through to the next layer), so nothing stored can break the app.
 */

/** The registry, built once from the site's config. */
export const registry = settingsRegistry(siteConfig);

export const DEVICE_KEY = 'knightschool.settings';
export const SECRET_KEY = 'knightschool.explorerToken';
/** v1's board settings (and this branch's first board menu), carried over once into `knightschool.settings`. */
const OLD_BOARD_KEY = 'knightschool.board';
const OLD_BOARD_FIELDS: Record<string, SettingKey> = {
  theme: 'board.theme',
  pieces: 'board.pieces',
  coordinates: 'board.coordinates',
  legalMoves: 'board.legalMoves',
  hover: 'board.hoverSquare',
  lastMove: 'board.lastMove',
  marksWhileStudying: 'board.marksWhileStudying',
  notation: 'board.notation',
  animation: 'board.animation',
  engineOn: 'engine.on',
  engineLines: 'engine.lines',
};

export type SettingsSnapshot = {
  /** The learner's own choices (the `you` layer), from all three stores. */
  you: Readonly<Record<string, unknown>>;
  /** The opening layer, per opening id. */
  openings: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** False until the learner's rows are read from the database. */
  ready: boolean;
};

const definitionOf = (key: string) =>
  (registry.byKey as Record<string, AnySettingDefinition | undefined>)[key] as SettingDefinition | undefined;

function readJson(key: string): Record<string, unknown> | undefined {
  try {
    const text = localStorage.getItem(key);
    if (!text) return undefined;
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return undefined;
  }
}

function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Private windows and full storage: the change still applies for this visit.
  }
}

/** Device values, key by key: unknown keys are dropped, bad values are kept out by `checkSetting` when read. */
function readDevice(): Record<string, unknown> {
  let saved = readJson(DEVICE_KEY);
  if (saved === undefined) {
    const old = readJson(OLD_BOARD_KEY);
    if (old) {
      saved = {};
      for (const [field, key] of Object.entries(OLD_BOARD_FIELDS)) {
        if (old[field] !== undefined && checkSetting(definitionOf(key)!, old[field]) !== undefined)
          saved[key] = old[field];
      }
      writeLocal(DEVICE_KEY, JSON.stringify(saved));
      writeLocal(OLD_BOARD_KEY, null);
    }
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(saved ?? {})) if (definitionOf(key)?.store === 'device') out[key] = value;
  return out;
}

function readSecret(): Record<string, unknown> {
  try {
    const token = localStorage.getItem(SECRET_KEY);
    return token ? { 'lichess.token': token } : {};
  } catch {
    return {};
  }
}

let device = readDevice();
let secret = readSecret();
let learner: Record<string, unknown> = {};
let openings: Record<string, Record<string, unknown>> = {};
let ready = false;
/** Learner writes made before the database opened: they win over what it holds. */
const pending = new Map<string, unknown>();

const build = (): SettingsSnapshot => ({ you: { ...learner, ...device, ...secret }, openings, ready });
let snapshot = build();
const listeners = new Set<() => void>();

function changed(): void {
  snapshot = build();
  for (const listener of listeners) listener();
}

export const getSettingsSnapshot = (): SettingsSnapshot => snapshot;

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let loading: Promise<void> | undefined;

/** Reads the learner's rows once (again after an import, `reloadLearnerSettings`). */
function loadLearner(): Promise<void> {
  loading ??= (async () => {
    try {
      const store = await learnerStore();
      const rows = await store.settings.all();
      const stored = readStoredSettings(registry, rows);
      learner = stored.you;
      openings = stored.openings;
      // v1 names read as their registry keys are written under the new name once, so exports carry both.
      for (const key of Object.keys(stored.you)) {
        if (!(key in rows)) void store.settings.set(key, storedSettingText(stored.you[key]));
      }
      for (const [rowKey, value] of pending) {
        void store.settings.set(rowKey, storedSettingText(value));
        applyLearner(rowKey, value);
      }
      pending.clear();
    } catch (error) {
      console.warn('Settings could not be read; defaults apply.', error);
    } finally {
      ready = true;
      changed();
    }
  })();
  return loading;
}

if (typeof window !== 'undefined') {
  void loadLearner();
  // Another tab changed this device's look: follow it.
  window.addEventListener('storage', (event) => {
    if (event.key === DEVICE_KEY || event.key === OLD_BOARD_KEY) device = readDevice();
    else if (event.key === SECRET_KEY) secret = readSecret();
    else return;
    changed();
  });
}

/** Resolves once the learner's settings are read (or found unreadable). */
export const whenSettingsReady = (): Promise<void> => loadLearner();

/** Reads the learner's rows again: after an import merged new values into the table. */
export function reloadLearnerSettings(): Promise<void> {
  loading = undefined;
  return loadLearner();
}

function applyLearner(rowKey: string, value: unknown): void {
  if (rowKey.startsWith('opening:')) {
    const cut = rowKey.lastIndexOf(':');
    const id = rowKey.slice('opening:'.length, cut);
    const key = rowKey.slice(cut + 1);
    const current = { ...(openings[id] ?? {}) };
    if (value === undefined) delete current[key];
    else current[key] = value;
    openings = { ...openings, [id]: current };
  } else {
    learner = { ...learner };
    if (value === undefined) delete learner[rowKey];
    else learner[rowKey] = value;
  }
}

function writeLearner(rowKey: string, value: unknown): void {
  applyLearner(rowKey, value);
  if (!ready) {
    pending.set(rowKey, value);
    return;
  }
  void learnerStore()
    .then((store) =>
      value === undefined ? store.settings.remove(rowKey) : store.settings.set(rowKey, storedSettingText(value)),
    )
    .catch((error: unknown) => console.warn(`Setting ${rowKey} could not be saved.`, error));
}

/**
 * Stores (or, with `undefined`, removes) one value at the `you` layer or one opening's layer, in the setting's store.
 * An opening value for a key whose scopes leave out `opening` is refused.
 */
export function writeSetting<K extends SettingKey>(
  key: K,
  value: SettingValues[K] | undefined,
  at: { layer: 'you' } | { layer: 'opening'; opening: string } = { layer: 'you' },
): void {
  const definition = definitionOf(key);
  if (!definition) return;
  if (at.layer === 'opening') {
    if (!definition.scopes.includes('opening') || definition.store !== 'learner') return;
    writeLearner(openingSettingKey(at.opening, key), value);
  } else if (definition.store === 'device') {
    device = { ...device };
    if (value === undefined) delete device[key];
    else device[key] = value;
    writeLocal(DEVICE_KEY, JSON.stringify(device));
  } else if (definition.store === 'secret') {
    secret = value ? { [key]: value } : {};
    writeLocal(SECRET_KEY, value ? String(value) : null);
  } else {
    writeLearner(key, value);
  }
  changed();
}

/** The raw stored value at a layer (`undefined` when that layer has none), for Undo. */
export function storedSetting(key: SettingKey, at: { layer: 'you' } | { layer: 'opening'; opening: string }): unknown {
  return at.layer === 'opening' ? snapshot.openings[at.opening]?.[key] : snapshot.you[key];
}
