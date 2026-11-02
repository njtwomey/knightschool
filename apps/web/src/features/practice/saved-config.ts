import type { SettingKey, SettingValues } from '@knightschool/core';
import { DEFAULT_CONFIG, type PracticeConfig, type PracticeMode } from '@/components/practice/practice-config';
import { getSetting, getSettingsSnapshot, setSetting, whenSettingsReady } from '@/data/settings';

/*
 * Each mode's saved set-up (docs/v2/components/practice-setup.md): one choice per mode under
 * `knightschool.practice.<mode>`, read field by field so an old or broken value falls back to the default. Every mode's
 * page and the practice hub read and write it here.
 *
 * The fields that are learner settings (moves per question, how the computer plays, the puzzle rating and who solves)
 * are not kept here: they are read from the settings (`use-setting`: your choice, the preset or the default), and Start
 * saves a changed one as your choice, so the settings page and the card always agree. Values an older build kept here
 * are carried over into the settings once.
 */

const keyOf = (mode: PracticeMode) => `knightschool.practice.${mode}`;

/** The set-up fields that are registry settings, and their keys. */
const SETTING_FIELDS = {
  movesPerQuestion: 'review.movesPerQuestion',
  computerPlays: 'computer.plays',
  rating: 'puzzles.rating',
  solver: 'puzzles.solver',
} as const satisfies Partial<Record<keyof PracticeConfig, SettingKey>>;
type SettingField = keyof typeof SETTING_FIELDS;
const settingFields = Object.keys(SETTING_FIELDS) as SettingField[];

function readSaved(mode: PracticeMode): Record<string, unknown> {
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(mode)) ?? '{}') as unknown;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function writeSaved(mode: PracticeMode, value: Record<string, unknown>): void {
  try {
    localStorage.setItem(keyOf(mode), JSON.stringify(value));
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}

/** Moves a setting field an older build saved per mode into the settings, once, unless you already chose one. */
function carryOver(mode: PracticeMode, raw: Record<string, unknown>): void {
  const old = settingFields.filter((field) => raw[field] !== undefined);
  if (old.length === 0) return;
  void whenSettingsReady().then(() => {
    const you = getSettingsSnapshot().you;
    const saved = readSaved(mode);
    for (const field of old) {
      const key = SETTING_FIELDS[field];
      if (you[key] === undefined) setSetting(key, saved[field] as SettingValues[typeof key], { label: 'carry over' });
      delete saved[field];
    }
    writeSaved(mode, saved);
  });
}

export function readPracticeConfig(mode: PracticeMode, defaults: Partial<PracticeConfig> = {}): PracticeConfig {
  const fromSettings = Object.fromEntries(settingFields.map((field) => [field, getSetting(SETTING_FIELDS[field])]));
  const base = { ...DEFAULT_CONFIG, ...defaults, ...fromSettings } as PracticeConfig;
  const raw = readSaved(mode);
  carryOver(mode, raw);
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(base)) {
    if (key in SETTING_FIELDS) continue;
    const saved = raw[key];
    if (saved === undefined) continue;
    if (Array.isArray(value) ? Array.isArray(saved) : typeof saved === typeof value) out[key] = saved;
  }
  return out as PracticeConfig;
}

export function savePracticeConfig(mode: PracticeMode, config: PracticeConfig): void {
  const rest: Record<string, unknown> = { ...config };
  for (const field of settingFields) {
    delete rest[field];
    // Only the fields this mode shows are its choice; the others stay as the settings have them.
    if (!MODE_SETTINGS[mode].includes(field)) continue;
    const key = SETTING_FIELDS[field];
    if (JSON.stringify(getSetting(key)) !== JSON.stringify(config[field]))
      setSetting(key, config[field] as SettingValues[typeof key]);
  }
  writeSaved(mode, rest);
}

/** Which setting fields each mode's card shows (practice-setup's fields). */
const MODE_SETTINGS: Record<PracticeMode, readonly SettingField[]> = {
  review: ['movesPerQuestion'],
  drill: ['computerPlays'],
  puzzles: ['rating', 'solver'],
  'play-on': [],
  speed: [],
  'name-it': [],
};
