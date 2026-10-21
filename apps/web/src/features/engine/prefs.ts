import { createPrefStore, isBoolean, parsePrefs, type PrefSchema } from '@/lib/local-prefs';

const KEY = 'knightschool.engine';

type EnginePrefs = {
  /** Start the engine on course pages, so the evaluation bar is there without asking. */
  auto: boolean;
};

const SCHEMA: PrefSchema<EnginePrefs> = { auto: isBoolean };
/** The engine is on by default: anything other than an explicit "off" means on. */
const DEFAULTS: EnginePrefs = { auto: true };

export const parseEnginePrefs = (raw: string | null): EnginePrefs => parsePrefs(raw, SCHEMA, DEFAULTS);

/** Per-device, so it lives in localStorage and applies before the database is open. */
export const useEnginePrefs = createPrefStore(KEY, SCHEMA, DEFAULTS);
