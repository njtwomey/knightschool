import type { SettingsRegistry } from './registry';
import {
  SETTING_LAYERS,
  type AnySettingDefinition,
  type Preset,
  type ResolvedSetting,
  type SettingDefinition,
  type SettingKey,
  type SettingLayer,
  type SettingLayers,
  type SettingLevel,
  type SettingValues,
} from './types';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * A raw stored value checked against its setting: numbers outside config's range are clamped (the range may have
 * changed since it was saved), anything else that fails the schema is `undefined`, so the next layer answers.
 */
export function checkSetting<K extends SettingKey>(
  definition: SettingDefinition<K>,
  raw: unknown,
): SettingValues[K] | undefined {
  if (raw === undefined || raw === null) return undefined;
  let value = raw;
  const { range } = definition;
  if (range && typeof value === 'number' && Number.isFinite(value)) value = clamp(value, range.min, range.max);
  if (range && Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n)))
    value = value.map((n: number) => clamp(n, range.min, range.max));
  const parsed = definition.schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/** Whether a setting may hold a value at a layer: the scopes say for stored layers; presets reach learner settings only. */
export function layerApplies(definition: AnySettingDefinition, layer: SettingLayer): boolean {
  if (layer === 'default') return true;
  if (layer === 'preset') return definition.store === 'learner';
  return definition.scopes.includes(layer);
}

/**
 * A setting's value, looked up from `from` (by default the most particular layer) down to the registry's default; the
 * first layer with a valid value wins (docs/v2/library/settings.md, "Layers, most particular first").
 */
export function resolveSetting<K extends SettingKey>(
  definition: SettingDefinition<K>,
  layers: SettingLayers,
  from: SettingLayer = 'session',
): ResolvedSetting<K> {
  const def = definition as unknown as AnySettingDefinition;
  for (const layer of SETTING_LAYERS.slice(SETTING_LAYERS.indexOf(from))) {
    if (layer === 'default') break;
    if (!layerApplies(def, layer)) continue;
    const value = checkSetting(definition, layers[layer]?.[definition.key]);
    if (value !== undefined) return { value, source: layer };
  }
  return { value: definition.default, source: 'default' };
}

/** The value the layer below `layer` gives: what a reset at `layer` falls back to. */
export function resolveBelow<K extends SettingKey>(
  definition: SettingDefinition<K>,
  layers: SettingLayers,
  layer: SettingLayer,
): ResolvedSetting<K> {
  const below = SETTING_LAYERS[SETTING_LAYERS.indexOf(layer) + 1] ?? 'default';
  return resolveSetting(definition, layers, below);
}

/** Two setting values are the same (lists and ranges compared item by item). */
export function sameSetting(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A preset's values (an unknown id gives the default preset's). */
export function presetValues(
  registry: Pick<SettingsRegistry, 'presets' | 'defaultPreset'>,
  id: string,
): Partial<SettingValues> {
  return (registry.presets.find((preset) => preset.id === id) ?? presetOf(registry, registry.defaultPreset)).values;
}

export function presetOf(registry: Pick<SettingsRegistry, 'presets' | 'defaultPreset'>, id: string): Preset {
  return (
    registry.presets.find((preset) => preset.id === id) ??
    registry.presets.find((preset) => preset.id === registry.defaultPreset) ??
    registry.presets[0]!
  );
}

/**
 * The learner's own choices that sit on top of their preset: keys in the `you` layer whose value differs from what
 * the preset (or the default) gives. Empty when the learner has changed nothing, so the picker shows the preset alone.
 */
export function customChanges(
  registry: Pick<SettingsRegistry, 'byKey' | 'presets' | 'defaultPreset'>,
  you: Readonly<Record<string, unknown>>,
  presetId: string,
): SettingKey[] {
  const preset = presetValues(registry, presetId);
  const out: SettingKey[] = [];
  for (const [key, raw] of Object.entries(you)) {
    if (key === 'preset') continue;
    const definition = (registry.byKey as Record<string, SettingDefinition | undefined>)[key];
    if (!definition || definition.store !== 'learner') continue;
    const value = checkSetting(definition, raw);
    if (value === undefined) continue;
    const under = resolveSetting(definition, { preset }, 'preset').value;
    if (!sameSetting(value, under)) out.push(definition.key);
  }
  return out;
}

/** True when any learner choice differs from the preset, so the picker says "custom". */
export function isCustom(
  registry: Pick<SettingsRegistry, 'byKey' | 'presets' | 'defaultPreset'>,
  you: Readonly<Record<string, unknown>>,
  presetId: string,
): boolean {
  return customChanges(registry, you, presetId).length > 0;
}

/** Names that make a source line read naturally. */
export type SourceNames = { preset?: string; opening?: string };

/** Where a value came from, as a settings row's small line ("From the Club player preset", "Set for the Italian Game"). */
export function sourceWords(source: SettingLayer, names: SourceNames = {}): string {
  switch (source) {
    case 'session':
      return 'This session';
    case 'opening':
      return names.opening ? `Set for the ${names.opening}` : 'Set for this opening';
    case 'you':
      return 'Your choice';
    case 'material':
      return 'Set by the opening’s author';
    case 'preset':
      return names.preset ? `From the ${names.preset} preset` : 'From your preset';
    default:
      return 'Default';
  }
}

/** A value in words, for sources, resets and "what changes" lists. */
export function valueWords<K extends SettingKey>(definition: SettingDefinition<K>, value: SettingValues[K]): string {
  if (definition.valueLabel) return definition.valueLabel(value);
  const { control } = definition;
  switch (control.kind) {
    case 'switch':
      return value ? 'on' : 'off';
    case 'select':
    case 'toggle':
    case 'swatch': {
      const option = control.options.find((candidate) => sameSetting(candidate.value, value));
      return (option?.label ?? String(value)).toLowerCase();
    }
    case 'secret':
      return value ? 'set' : 'not set';
    case 'text':
      return value ? String(value) : 'none';
    case 'slider':
      return control.unit ? `${String(value)} ${control.unit}` : String(value);
    default:
      return Array.isArray(value) ? value.join(', ') : String(value);
  }
}

/** Whether a setting matches search words on its label, hint, key and synonyms (every word must match). */
export function matchesSetting(definition: AnySettingDefinition, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [definition.label, definition.hint, definition.key, ...(definition.synonyms ?? [])]
    .join(' ')
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** The settings a search finds, at a level (`basic` shows basic rows only), in the page's order. */
export function settingRows(
  registry: Pick<SettingsRegistry, 'definitions'>,
  query: string,
  level: SettingLevel | 'all' = 'all',
): AnySettingDefinition[] {
  return registry.definitions.filter(
    (definition) =>
      definition.group !== 'preset' &&
      (level === 'all' || definition.level === level) &&
      matchesSetting(definition, query),
  );
}

/** A learner settings-table key for one opening's value (docs/v2/stores/settings.md). */
export const openingSettingKey = (openingId: string, key: SettingKey) => `opening:${openingId}:${key}`;

/** The stored learner layers read from settings-table rows (key to JSON text). */
export type StoredLearnerSettings = {
  you: Record<string, unknown>;
  openings: Record<string, Record<string, unknown>>;
};

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // v1 kept some values as bare text.
    return text;
  }
};

/**
 * The learner's stored settings from settings-table rows: registry keys into the `you` layer, `opening:<id>:<key>`
 * rows into each opening's layer, and v1 keys (`newCardsPerDay`, ...) read as their registry key when that key has no
 * row of its own. Rows that are not settings (`introduced:<day>`, `lastExportAt`) are ignored.
 */
export function readStoredSettings(
  registry: Pick<SettingsRegistry, 'byKey' | 'definitions'>,
  rows: Readonly<Record<string, string>>,
): StoredLearnerSettings {
  const byKey = registry.byKey as Record<string, AnySettingDefinition | undefined>;
  const you: Record<string, unknown> = {};
  const openings: Record<string, Record<string, unknown>> = {};
  for (const [rowKey, text] of Object.entries(rows)) {
    if (rowKey.startsWith('opening:')) {
      const cut = rowKey.lastIndexOf(':');
      const id = rowKey.slice('opening:'.length, cut);
      const key = rowKey.slice(cut + 1);
      if (id && byKey[key]?.store === 'learner') (openings[id] ??= {})[key] = parseJson(text);
      continue;
    }
    if (byKey[rowKey]?.store === 'learner') you[rowKey] = parseJson(text);
  }
  for (const definition of registry.definitions) {
    if (definition.store !== 'learner' || !definition.aliases || definition.key in you) continue;
    for (const [alias, convert] of Object.entries(definition.aliases)) {
      if (alias in rows) {
        you[definition.key] = convert(parseJson(rows[alias]!));
        break;
      }
    }
  }
  return { you, openings };
}

/** A setting's value as settings-table text. */
export const storedSettingText = (value: unknown): string => JSON.stringify(value);
