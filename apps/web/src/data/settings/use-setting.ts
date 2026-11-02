import {
  presetOf,
  presetValues,
  resolveBelow,
  resolveSetting,
  sameSetting,
  sourceWords,
  valueWords,
  type ResolvedSetting,
  type SettingDefinition,
  type SettingKey,
  type SettingLayer,
  type SettingLayers,
  type SettingValues,
  type WritableLayer,
} from '@knightschool/core';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  getSettingsSnapshot,
  registry,
  storedSetting,
  subscribeSettings,
  writeSetting,
  type SettingsSnapshot,
} from './store';
import { recordSettingChange } from './undo';

/** Where a setting is looked up beyond the learner's own choices (docs/v2/hooks/use-setting.md, "Takes"). */
export type SettingScopeOptions = {
  /** The opening layer: the learner's choices for this opening (its id). */
  opening?: string;
  /** The opening's name, for the source line ("Set for the Italian Game"). */
  openingName?: string;
  /** The session layer: a practice card's copy, applied at Start. */
  session?: Readonly<Partial<SettingValues>>;
  /** Called when a row writes the session layer (the card edits its copy; nothing is stored). */
  onSessionChange?: <K extends SettingKey>(key: K, value: SettingValues[K] | undefined) => void;
  /** The material layer: an opening author's suggested values. */
  material?: Readonly<Partial<SettingValues>>;
  /** The layer `set` and `reset` write by default: the most particular one given (session, then opening, then you). */
  layer?: WritableLayer;
};

export type UseSettingResult<K extends SettingKey> = {
  /** The value, checked against its schema; a bad stored value falls through to the next layer. */
  value: SettingValues[K];
  /** The layer it came from. */
  source: SettingLayer;
  /** The source in words, for the row ("From the Club player preset", "Set for this opening"). */
  sourceText: string;
  /** What the value means in practice (the registry's `explain`), if the setting says. */
  meaning: string | undefined;
  /** The value in words ("slow", "offered", "10"). */
  valueText: string;
  /** Saves at a layer (by default the one the caller shows), undoable. */
  set: (value: SettingValues[K], layer?: WritableLayer) => void;
  /** Removes the value at the layer (by default the one shown), so the layer below wins; undoable. */
  reset: (layer?: WritableLayer) => void;
  /** The layer `set` and `reset` write. */
  layer: WritableLayer;
  /** What a reset at `layer` falls back to. */
  below: ResolvedSetting<K>;
  /** The written layer holds a value that differs from the one beneath, so a reset means something. */
  canReset: boolean;
  /** Label, hint, control, level, store, scopes: everything settings-row needs. */
  definition: SettingDefinition<K>;
  /** False while a learner setting waits for the database; components that decide something with it should wait. */
  ready: boolean;
};

const layerOf = (options: SettingScopeOptions): WritableLayer =>
  options.layer ?? (options.session ? 'session' : options.opening ? 'opening' : 'you');

/** The layers a lookup sees, from a store snapshot and the caller's scope. */
export function settingLayers(snapshot: SettingsSnapshot, options: SettingScopeOptions = {}): SettingLayers {
  const presetId = resolveSetting(registry.byKey.preset, { you: snapshot.you }).value;
  return {
    session: options.session,
    opening: options.opening ? snapshot.openings[options.opening] : undefined,
    you: snapshot.you,
    material: options.material,
    preset: presetValues(registry, presetId),
  };
}

/** The learner's chosen preset (its id and name). */
export function currentPreset(snapshot: SettingsSnapshot = getSettingsSnapshot()) {
  return presetOf(registry, resolveSetting(registry.byKey.preset, { you: snapshot.you }).value);
}

/** Reads a setting outside React (a library call, an event handler): the same lookup as `useSetting`. */
export function getSetting<K extends SettingKey>(key: K, options: SettingScopeOptions = {}): SettingValues[K] {
  return resolveSetting(registry.byKey[key], settingLayers(getSettingsSnapshot(), options)).value;
}

/** Writes a setting outside React (a practice card's Start, a preset pick): undoable like `useSetting`'s `set`. */
export function setSetting<K extends SettingKey>(
  key: K,
  value: SettingValues[K] | undefined,
  options: { opening?: string; label?: string } = {},
): void {
  const definition = registry.byKey[key];
  const at = options.opening ? ({ layer: 'opening', opening: options.opening } as const) : ({ layer: 'you' } as const);
  const before = storedSetting(key, at);
  if (sameSetting(before, value)) return;
  writeSetting(key, value, at);
  const label =
    options.label ??
    (value === undefined
      ? `reset ${definition.label.toLowerCase()}`
      : `${definition.label} ${valueWords(definition, value as SettingValues[K])}`);
  recordSettingChange(label, () => writeSetting(key, before as SettingValues[K] | undefined, at));
}

/** The whole store, for components that show many settings at once (the settings page, the preset picker). */
export function useSettingsSnapshot(): SettingsSnapshot {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getSettingsSnapshot);
}

/**
 * One setting through the registry's layers: its value, where it came from, what it means, and set and reset at the
 * layer the caller shows (docs/v2/hooks/use-setting.md). Every user of a key updates at once.
 *
 * `const { value, source, set, reset } = useSetting('review.newPerDay', { opening })`
 */
export function useSetting<K extends SettingKey>(key: K, options: SettingScopeOptions = {}): UseSettingResult<K> {
  const snapshot = useSettingsSnapshot();
  const definition = registry.byKey[key];
  const { opening, openingName, session, material, onSessionChange } = options;
  const shown = layerOf(options);

  const layers = useMemo(
    () => settingLayers(snapshot, { opening, session, material }),
    [snapshot, opening, session, material],
  );

  const set = useCallback(
    (value: SettingValues[K], layer: WritableLayer = shown) => {
      if (layer === 'session') onSessionChange?.(key, value);
      else setSetting(key, value, { opening: layer === 'opening' ? opening : undefined });
    },
    [key, shown, opening, onSessionChange],
  );
  const reset = useCallback(
    (layer: WritableLayer = shown) => {
      if (layer === 'session') onSessionChange?.(key, undefined);
      else setSetting(key, undefined, { opening: layer === 'opening' ? opening : undefined });
    },
    [key, shown, opening, onSessionChange],
  );

  const resolved = resolveSetting(definition, layers);
  const below = resolveBelow(definition, layers, shown);
  const own = layers[shown]?.[key];
  const presetName = currentPreset(snapshot).name;
  return {
    value: resolved.value,
    source: resolved.source,
    sourceText: sourceWords(resolved.source, { preset: presetName, opening: openingName }),
    meaning: definition.explain?.(resolved.value),
    valueText: valueWords(definition, resolved.value),
    set,
    reset,
    layer: shown,
    below,
    canReset: own !== undefined && !sameSetting(resolved.value, below.value),
    definition,
    ready: definition.store !== 'learner' || snapshot.ready,
  };
}
