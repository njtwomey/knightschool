import type { z } from 'zod';

/*
 * The settings registry's types (docs/v2/settings.md, "One registry"; docs/v2/library/settings.md). Every learner
 * setting is one key here with its value's type; the registry (registry.ts) declares each once.
 */

/** Every setting key and the type of its value (docs/v2/settings.md, "Keys"). */
export interface SettingValues {
  preset: string;
  /** The openings being learned (opening ids); set on onboarding and the repertoire page. */
  repertoire: string[];
  /** A rating band as `min-max`. */
  'level.band': string;
  /** The share of games a reply must reach to be answered. */
  'level.coverageTarget': number;
  'level.includeRare': boolean;
  'level.includeAlternatives': boolean;
  'level.trapsAsDrills': boolean;
  'review.newPerDay': number;
  'review.sessionSize': number;
  'review.order': 'due' | 'opening' | 'mixed';
  'review.retention': number;
  /** 1 to 5, or 0 for the rest of the line. */
  'review.movesPerQuestion': number;
  'review.grading': 'automatic' | 'manual';
  'learning.gatesRelaxed': boolean;
  'learning.startFrom': 'branch' | 'start';
  'feedback.explain': 'symbol' | 'sentence' | 'refutation';
  'feedback.evalAfter': 'off' | 'words' | 'both';
  'feedback.speed': 'slow' | 'normal' | 'fast';
  'feedback.hints': boolean;
  'feedback.triesTable': 'live' | 'end' | 'off';
  'feedback.triesColumns': ('grade' | 'cost' | 'time' | 'help')[];
  'feedback.triesRightMoves': boolean;
  'feedback.sounds': boolean;
  'computer.plays': 'written' | 'level' | 'least-known' | 'engine';
  'puzzles.rating': [number, number];
  'puzzles.solver': 'you' | 'opponent' | 'both';
  'puzzles.showThemes': 'before' | 'after' | 'never';
  /** Theme ids; empty means all. */
  'puzzles.themes': string[];
  'board.theme': 'green' | 'tan' | 'blue' | 'slate' | 'purple';
  'board.pieces': 'classic' | 'bold' | 'soft';
  'board.coordinates': boolean;
  'board.legalMoves': boolean;
  'board.lastMove': boolean;
  'board.hoverSquare': boolean;
  'board.animation': boolean;
  'board.notation': 'letters' | 'figurines';
  'board.marksWhileStudying': boolean;
  /** rem. */
  'board.sizeCap': number;
  'display.previews': 'off' | 'board' | 'full';
  /** ms to open; closing takes half. */
  'display.previewDelay': number;
  'display.positionFeatures': 'off' | 'request' | 'always';
  'engine.on': boolean;
  'engine.depth': number;
  'engine.lines': number;
  'engine.bakedOnly': boolean;
  'explorer.minShare': number;
  'lichess.token': string;
  'lichess.username': string;
  'chessdotcom.username': string;
  'games.count': number;
  'games.fetchOnOpen': boolean;
  'progress.showStreak': boolean;
  'data.exportReminder': boolean;
  'access.reducedMotion': 'system' | 'on' | 'off';
  'access.highContrast': boolean;
  'access.largerPieces': boolean;
  'access.typedMoves': boolean;
  'access.squareCursor': boolean;
  'access.readMoves': boolean;
}

export type SettingKey = keyof SettingValues;
export type SettingValue<K extends SettingKey = SettingKey> = SettingValues[K];

/** Where a value may come from, most particular first (settings.md, "Layers"). */
export const SETTING_LAYERS = ['session', 'opening', 'you', 'material', 'preset', 'default'] as const;
export type SettingLayer = (typeof SETTING_LAYERS)[number];
/** The layers a value can be set at by the learner or an author; preset and default are not stored per key. */
export type SettingScope = 'session' | 'opening' | 'you' | 'material';
/** The layers a row writes to. */
export type WritableLayer = 'session' | 'opening' | 'you';

export type SettingStore = 'device' | 'learner' | 'secret';
export type SettingLevel = 'basic' | 'advanced';

export const SETTING_GROUPS = [
  { id: 'preset', title: 'Preset', description: 'A bundle of settings chosen at once.' },
  { id: 'level', title: 'Your level', description: 'What you meet: your band, rare lines, alternatives and traps.' },
  { id: 'review', title: 'Review', description: 'How many new moves join your reviews, and how much a review asks.' },
  { id: 'learning', title: 'Learning', description: 'How the steps of an opening open up and where they start.' },
  { id: 'feedback', title: 'Feedback', description: 'How much the board tells you after a move, and how fast.' },
  { id: 'computer', title: 'The computer', description: 'How the computer answers when you drill your lines.' },
  { id: 'puzzles', title: 'Puzzles', description: 'Which puzzles from your openings come up, and who solves them.' },
  { id: 'board', title: 'Board', description: 'How the board looks on this screen.' },
  { id: 'display', title: 'Display', description: 'Previews of positions and what is said about them.' },
  { id: 'engine', title: 'Engine', description: 'The computer’s evaluation beside the board, and the explorer.' },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Lichess and Chess.com, for your games and faster explorer answers.',
  },
  { id: 'progress', title: 'Progress and data', description: 'Your streak and the reminder to keep a copy.' },
  { id: 'accessibility', title: 'Accessibility', description: 'Motion, contrast, piece size and other ways to play.' },
] as const;
export type SettingGroupId = (typeof SETTING_GROUPS)[number]['id'];
export type SettingGroup = (typeof SETTING_GROUPS)[number];

/** A control's choice; `value` is the setting's value. */
export type SettingOption<V = string | number | boolean> = { value: V; label: string; hint?: string };

/** How a setting is shown: settings-row picks its control from `kind`. */
export type SettingControl =
  | { kind: 'switch' }
  | { kind: 'slider'; min: number; max: number; step: number; marks?: number[]; unit?: string }
  /** Two thumbs, for a range value `[low, high]`. */
  | { kind: 'range'; min: number; max: number; step: number; marks?: number[] }
  | { kind: 'select'; options: SettingOption[] }
  /** A one-of-several row of buttons (filter-toggle). */
  | { kind: 'toggle'; options: SettingOption[] }
  /** Colour swatches (board colours); the web app knows each option's colours. */
  | { kind: 'swatch'; options: SettingOption[] }
  /** Several of several, for a list value. */
  | { kind: 'multi'; options: SettingOption<string>[] }
  | { kind: 'number'; min: number; max: number }
  | { kind: 'text'; placeholder?: string }
  | { kind: 'secret'; placeholder?: string }
  /** Chosen on another page (the repertoire, the puzzle themes); the row links there. */
  | { kind: 'elsewhere'; href: string; text: string };

/** One setting, declared once (`defineSetting`). */
export type SettingDefinition<K extends SettingKey = SettingKey> = {
  key: K;
  group: SettingGroupId;
  label: string;
  /** One sentence under the label. */
  hint: string;
  /** Other words a search finds it by ("delay" finds Speed of play). */
  synonyms?: readonly string[];
  /** Checks a stored value; a value that fails falls through to the next layer. */
  schema: z.ZodType<SettingValues[K]>;
  default: SettingValues[K];
  /** Numbers (and both ends of a range) outside this are clamped rather than refused (config's ranges). */
  range?: { min: number; max: number };
  level: SettingLevel;
  /** Where the learner or an author may set it, besides the preset and default. */
  scopes: readonly SettingScope[];
  store: SettingStore;
  control: SettingControl;
  /** What a value means in practice ("About 70 new moves a week"). */
  explain?(value: SettingValues[K]): string;
  /** A value in words, for sources, resets and lists ("offered", "slow"); defaults from the control. */
  valueLabel?(value: SettingValues[K]): string;
  /** v1 keys read as this one, with how their value converts (docs/v2/library/settings.md, "v1 keys are aliases"). */
  aliases?: Readonly<Record<string, (raw: unknown) => unknown>>;
};

/** Any one definition, keeping its key and value types together. */
export type AnySettingDefinition = { [K in SettingKey]: SettingDefinition<K> }[SettingKey];

/** Values set at each stored layer: partial maps of key to raw value (checked as they are read). */
export type SettingLayers = Partial<Record<Exclude<SettingLayer, 'default'>, Readonly<Record<string, unknown>>>>;

export type ResolvedSetting<K extends SettingKey = SettingKey> = { value: SettingValues[K]; source: SettingLayer };

/** One preset as config lists it, checked against the registry. */
export type Preset = {
  id: string;
  name: string;
  for: string;
  highlights: readonly string[];
  values: Partial<SettingValues>;
};
