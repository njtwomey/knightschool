import { customChanges, type SettingKey, type SettingValues } from '@knightschool/core';
import { useMemo } from 'react';
import { currentPreset, registry, setSetting, settingsBatch, useSettingsSnapshot } from '@/data/settings';
import { presetOf, SETTINGS, valueLabel, type LayerValues, type SettingValue, type WritableLayer } from './registry';

/** What a settings component needs to show and change the learner's real settings. */
export type LiveSettings = {
  layers: LayerValues;
  presetId: string;
  ready: boolean;
  onChange: (key: string, value: SettingValue) => void;
  onReset: (key: string) => void;
  onResetGroup: (keys: string[]) => void;
  onPick: (presetId: string) => void;
  /** Clears the learner's own choices that sit on top of the preset, as one undoable change. */
  clearCustom: () => void;
  /** The learner's own choices on top of their preset. */
  custom: SettingKey[];
};

/**
 * The stored settings for the rows, groups and picker when the page does not pass its own (`use-setting` underneath):
 * the `you` layer, or one opening's layer with `opening`. Every change saves at once and is undoable.
 */
export function useLiveSettings({
  layer = 'you',
  opening,
}: { layer?: WritableLayer; opening?: string } = {}): LiveSettings {
  const snapshot = useSettingsSnapshot();
  return useMemo(() => {
    const presetId = currentPreset(snapshot).id;
    const at = layer === 'opening' && opening ? { opening } : {};
    const layers: LayerValues = {
      you: snapshot.you,
      opening: opening ? snapshot.openings[opening] : undefined,
    };
    const write = (key: string, value: SettingValue | undefined, label?: string) =>
      setSetting(key as SettingKey, value as SettingValues[SettingKey] | undefined, { ...at, label });
    const custom = customChanges(registry, snapshot.you, presetId);
    return {
      layers,
      presetId,
      ready: snapshot.ready,
      custom,
      onChange: (key, value) => write(key, value),
      onReset: (key) => write(key, undefined, `reset ${SETTINGS[key]?.label.toLowerCase() ?? key}`),
      onResetGroup: (keys) =>
        settingsBatch(`reset ${keys.length} ${keys.length === 1 ? 'setting' : 'settings'}`, () => {
          for (const key of keys) write(key, undefined);
        }),
      onPick: (id) => setSetting('preset', id, { label: `preset ${presetOf(id).name}` }),
      clearCustom: () =>
        settingsBatch(`clear ${custom.length} ${custom.length === 1 ? 'change' : 'changes'} of your own`, () => {
          for (const key of custom) setSetting(key, undefined);
        }),
    };
  }, [snapshot, layer, opening]);
}

/** A change in words for its saved notice: "New moves a day set to 15". */
export function changeText(key: string, value: SettingValue | undefined): string {
  const def = SETTINGS[key];
  if (!def) return 'Saved.';
  if (value === undefined) return `${def.label} reset.`;
  const shown = def.control.kind === 'secret' ? (value ? 'saved' : 'cleared') : valueLabel(def, value);
  return `${def.label} set to ${shown}.`;
}
