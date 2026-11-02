import {
  presetOf as corePresetOf,
  presetValues,
  resolveSetting as coreResolve,
  sameSetting,
  SETTING_LAYERS,
  sourceWords,
  valueWords,
  matchesSetting as coreMatches,
  type AnySettingDefinition,
  type Preset,
  type SettingDefinition,
  type SettingGroupId as CoreGroupId,
  type SettingKey,
  type SettingLayer,
  type SettingValues,
  type WritableLayer,
} from '@knightschool/core';
import { registry } from '@/data/settings';

/*
 * The settings components' view of the registry (docs/v2/settings.md, "One registry"). The registry itself is core's
 * (`settingsRegistry`, built once from the site config in data/settings); this file only words it the way the rows,
 * groups, picker and practice card read it: by plain string key, with the learner's preset passed by id.
 */

export { SETTING_LAYERS };
export type { SettingLayer, WritableLayer };

/** Any setting's value. */
export type SettingValue = SettingValues[SettingKey];
/** One registry entry, whatever its key. */
export type SettingDef = SettingDefinition;
export type SettingGroupId = Exclude<CoreGroupId, 'preset'>;
export type SettingGroupDef = { id: SettingGroupId; title: string; description: string };
export type { Preset };

/** The groups on the settings page, in order (the preset sits above them). */
export const SETTING_GROUPS: SettingGroupDef[] = registry.groups.filter(
  (group): group is (typeof registry.groups)[number] & { id: SettingGroupId } => group.id !== 'preset',
);

export const SETTINGS = registry.byKey as unknown as Record<string, SettingDef | undefined>;
export const settingsOf = (group: SettingGroupId): SettingDef[] =>
  (registry.definitions as readonly AnySettingDefinition[]).filter((def) => def.group === group) as SettingDef[];
export const groupOf = (id: SettingGroupId): SettingGroupDef => SETTING_GROUPS.find((group) => group.id === id)!;

/** A value in words, for sources, resets and "what changes" lists. */
export const valueLabel = (def: SettingDef, value: SettingValue): string => valueWords(def, value);

/** Whether a setting matches the search words, on its label, hint, key and synonyms. */
export const matchesSetting = (def: SettingDef, query: string): boolean =>
  coreMatches(def as AnySettingDefinition, query);

export const PRESETS: readonly Preset[] = registry.presets;
export const presetOf = (id: string): Preset => corePresetOf(registry, id);

/** The values set in the stored and session layers; the preset layer comes from `presetId`. */
export type LayerValues = Partial<
  Record<'session' | 'opening' | 'you' | 'material', Readonly<Record<string, unknown>>>
>;

export type Resolved = { value: SettingValue; source: SettingLayer };

/** Looks a value up from the given layer down to the default; the first layer that has one wins. */
export function resolveSetting(
  def: SettingDef,
  layers: LayerValues,
  presetId: string,
  from: SettingLayer = 'session',
): Resolved {
  return coreResolve(def, { ...layers, preset: presetValues(registry, presetId) }, from);
}

/** The layer below a written one, for the reset ("Reset to the Club player preset (10)"). */
export function resolveBelow(def: SettingDef, layers: LayerValues, presetId: string, layer: SettingLayer): Resolved {
  const below = SETTING_LAYERS[SETTING_LAYERS.indexOf(layer) + 1] ?? 'default';
  return resolveSetting(def, layers, presetId, below);
}

/** Where a value came from, as the row's small grey line. */
export const sourceText = (source: SettingLayer, presetId: string, openingName?: string): string =>
  sourceWords(source, { preset: presetOf(presetId).name, opening: openingName });

/** What a reset falls back to, named for its hint. */
export function resetText(below: Resolved, def: SettingDef, presetId: string): string {
  const to =
    below.source === 'preset'
      ? `the ${presetOf(presetId).name} preset`
      : below.source === 'material'
        ? 'what the opening’s author set'
        : below.source === 'you'
          ? 'your choice'
          : below.source === 'opening'
            ? 'this opening’s value'
            : 'the default';
  return `Reset to ${to} (${valueLabel(def, below.value)})`;
}

/** Whether the written layer holds a value that differs from the one beneath it, so a reset means something. */
export function canReset(def: SettingDef, layers: LayerValues, presetId: string, layer: WritableLayer): boolean {
  const own = layers[layer]?.[def.key];
  return (
    own !== undefined &&
    !sameSetting(resolveSetting(def, layers, presetId, layer).value, resolveBelow(def, layers, presetId, layer).value)
  );
}
