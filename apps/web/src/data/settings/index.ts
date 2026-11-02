/*
 * The learner's settings (docs/v2/settings.md): one registry in core, read and written here through `useSetting`.
 */
export {
  currentPreset,
  getSetting,
  setSetting,
  settingLayers,
  useSetting,
  useSettingsSnapshot,
  type SettingScopeOptions,
  type UseSettingResult,
} from './use-setting';
export {
  DEVICE_KEY,
  getSettingsSnapshot,
  registry,
  reloadLearnerSettings,
  SECRET_KEY,
  subscribeSettings,
  whenSettingsReady,
  type SettingsSnapshot,
} from './store';
export { feedbackDelay, scheduleConfig } from './schedule';
export { settingsBatch, undoSettingChange, useLastSettingChange, type SettingsUndoEntry } from './undo';
export type { SettingKey, SettingValues, WritableLayer } from '@knightschool/core';
