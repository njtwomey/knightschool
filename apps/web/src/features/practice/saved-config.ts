import { DEFAULT_CONFIG, type PracticeConfig, type PracticeMode } from '@/components/practice/practice-config';

/*
 * Each mode's saved set-up (docs/v2/components/practice-setup.md): one choice per mode under
 * `knightschool.practice.<mode>`, read field by field so an old or broken value falls back to the default. Every mode's
 * page and the practice hub read and write it here.
 */

const keyOf = (mode: PracticeMode) => `knightschool.practice.${mode}`;

export function readPracticeConfig(mode: PracticeMode, defaults: Partial<PracticeConfig> = {}): PracticeConfig {
  const base = { ...DEFAULT_CONFIG, ...defaults };
  try {
    const raw = JSON.parse(localStorage.getItem(keyOf(mode)) ?? '{}') as Record<string, unknown>;
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(base)) {
      const saved = raw[key];
      if (saved === undefined) continue;
      if (Array.isArray(value) ? Array.isArray(saved) : typeof saved === typeof value) out[key] = saved;
    }
    return out as PracticeConfig;
  } catch {
    return base;
  }
}

export function savePracticeConfig(mode: PracticeMode, config: PracticeConfig): void {
  try {
    localStorage.setItem(keyOf(mode), JSON.stringify(config));
  } catch {
    // Storage blocked: the choice lasts for this visit only.
  }
}
