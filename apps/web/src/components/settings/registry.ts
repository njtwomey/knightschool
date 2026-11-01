import { siteConfig } from '@/data/site-config';

/*
 * A small local example of the settings registry (docs/v2/settings.md, "One registry"): a handful of real keys from the
 * Keys table, declared the way core's `defineSetting` will declare them, so the settings components can be built and
 * shown before the registry itself exists. Ranges and defaults that config owns are read from the site config.
 */

export type SettingValue = boolean | number | string;

/** Where a value may come from, most particular first (settings.md, "Layers"). */
export const SETTING_LAYERS = ['session', 'opening', 'you', 'material', 'preset', 'default'] as const;
export type SettingLayer = (typeof SETTING_LAYERS)[number];
/** The layers a row can write to. */
export type WritableLayer = 'session' | 'opening' | 'you';

export type SettingStore = 'device' | 'learner' | 'secret';
export type SettingLevel = 'basic' | 'advanced';

export type SettingOption = { value: string; label: string; hint?: string };
export type SettingControl =
  | { kind: 'switch' }
  | { kind: 'slider'; min: number; max: number; step: number; marks?: number[] }
  | { kind: 'select'; options: SettingOption[] }
  | { kind: 'toggle'; options: SettingOption[] }
  | { kind: 'number'; min: number; max: number }
  | { kind: 'text'; placeholder?: string }
  | { kind: 'secret'; placeholder?: string };

export type SettingDef = {
  key: string;
  group: SettingGroupId;
  label: string;
  hint: string;
  control: SettingControl;
  default: SettingValue;
  level: SettingLevel;
  store: SettingStore;
  /** Other words a search should find it by ("delay" finds Speed of play). */
  synonyms?: string[];
  /** What the value means in practice, updated as the control moves. */
  explain?: (value: SettingValue) => string;
  /** How a value is named in sentences ("offered", "slow"); defaults from the control. */
  valueLabel?: (value: SettingValue) => string;
};

export type SettingGroupId = 'level' | 'review' | 'feedback' | 'board' | 'engine' | 'accounts';

export type SettingGroupDef = { id: SettingGroupId; title: string; description: string };

export const SETTING_GROUPS: SettingGroupDef[] = [
  { id: 'level', title: 'Your level', description: 'What you meet: rare lines, alternatives and traps.' },
  { id: 'review', title: 'Review', description: 'How many new moves join your reviews, and how much a review asks.' },
  { id: 'feedback', title: 'Feedback', description: 'How much the board tells you after a move, and how fast.' },
  { id: 'board', title: 'Board', description: 'How the board looks on this screen.' },
  { id: 'engine', title: 'Engine', description: 'The computer’s evaluation beside the board.' },
  {
    id: 'accounts',
    title: 'Accounts',
    description: 'Lichess and Chess.com, for your games and faster explorer answers.',
  },
];

const { newPerDay, sessionSize } = siteConfig.schedule;
const replyMs = siteConfig.timing.opponent ?? 500;
const SPEEDS: Record<string, number> = { slow: 1.5, normal: 1, fast: 0.6 };
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

const defs: SettingDef[] = [
  {
    key: 'level.includeRare',
    group: 'level',
    label: 'Include rare lines',
    hint: 'Lines few players at your level reach.',
    control: { kind: 'switch' },
    default: false,
    level: 'basic',
    store: 'learner',
    synonyms: ['uncommon', 'unusual'],
    explain: (v) => (v ? 'Rare lines join your steps and reviews.' : 'Rare lines are shown, but never asked.'),
  },
  {
    key: 'level.includeAlternatives',
    group: 'level',
    label: 'Drill alternatives',
    hint: 'Second answers an opening lists beside its main move.',
    control: { kind: 'switch' },
    default: false,
    level: 'advanced',
    store: 'learner',
    explain: (v) => (v ? 'Alternatives are drilled like any line.' : 'Alternatives are shown, not drilled.'),
  },
  {
    key: 'review.newPerDay',
    group: 'review',
    label: 'New moves a day',
    hint: 'How many moves you have not seen before are added to your reviews each day.',
    control: { kind: 'slider', min: newPerDay.min, max: newPerDay.max, step: 1, marks: [5, 10, 20] },
    default: newPerDay.default,
    level: 'basic',
    store: 'learner',
    synonyms: ['daily', 'limit', 'cards'],
    explain: (v) => (v === 0 ? 'No new moves; only reviews.' : `About ${Number(v) * 7} new moves a week.`),
  },
  {
    key: 'review.sessionSize',
    group: 'review',
    label: 'Reviews per session',
    hint: 'How many moves one review session asks before it stops.',
    control: { kind: 'slider', min: sessionSize.min, max: sessionSize.max, step: 5, marks: [10, 20, 50] },
    default: sessionSize.default,
    level: 'advanced',
    store: 'learner',
    synonyms: ['length', 'long'],
    explain: (v) => `About ${Math.max(1, Math.round((Number(v) * 15) / 60))} minutes at 15 seconds a move.`,
  },
  {
    key: 'review.movesPerQuestion',
    group: 'review',
    label: 'Moves per question',
    hint: 'How far a review asks you to play from the position it shows.',
    control: {
      kind: 'select',
      options: [
        { value: '1', label: 'One move' },
        { value: '2', label: 'Two moves' },
        { value: '3', label: 'Three moves' },
        { value: '5', label: 'Five moves' },
        { value: 'rest', label: 'The rest of the line' },
      ],
    },
    default: '1',
    level: 'basic',
    store: 'learner',
    explain: (v) =>
      v === '1'
        ? 'Each question asks for one of your moves.'
        : v === 'rest'
          ? 'Each question plays on to the end of the line.'
          : `Each question asks for ${v} of your moves in a row.`,
  },
  {
    key: 'feedback.speed',
    group: 'feedback',
    label: 'Speed of play',
    hint: 'How quickly the computer replies and the next card appears.',
    control: {
      kind: 'toggle',
      options: [
        { value: 'slow', label: 'Slow', hint: 'Half as long again, to read each move.' },
        { value: 'normal', label: 'Normal' },
        { value: 'fast', label: 'Fast', hint: 'For moves you already know well.' },
      ],
    },
    default: 'normal',
    level: 'basic',
    store: 'learner',
    synonyms: ['delay', 'pace', 'quick', 'slow'],
    explain: (v) => `The computer replies after about ${seconds(replyMs * (SPEEDS[String(v)] ?? 1))}.`,
  },
  {
    key: 'feedback.explain',
    group: 'feedback',
    label: 'After a wrong move',
    hint: 'How much the board says when a move is not the one to play.',
    control: {
      kind: 'select',
      options: [
        { value: 'symbol', label: 'The symbol only' },
        { value: 'sentence', label: 'A sentence' },
        { value: 'refutation', label: 'A sentence and the refutation' },
      ],
    },
    default: 'sentence',
    level: 'basic',
    store: 'learner',
    synonyms: ['explanation', 'why', 'mistake'],
    explain: (v) =>
      v === 'symbol'
        ? 'You see ?! or ?, and nothing more.'
        : v === 'sentence'
          ? '"A mistake: after ...Nxg5 the knight is lost."'
          : 'The sentence, then the punishing moves to step through on the board.',
  },
  {
    key: 'feedback.evalAfter',
    group: 'feedback',
    label: 'Evaluation after answering',
    hint: 'Where the position stands once you have played.',
    control: {
      kind: 'toggle',
      options: [
        { value: 'off', label: 'Off' },
        { value: 'words', label: 'Words' },
        { value: 'both', label: 'Words and numbers' },
      ],
    },
    default: 'words',
    level: 'basic',
    store: 'learner',
    synonyms: ['eval', 'score', 'engine'],
    explain: (v) =>
      v === 'off'
        ? 'Nothing is said.'
        : v === 'words'
          ? '"White is a little better."'
          : '"White is a little better (+0.6)."',
  },
  {
    key: 'feedback.hints',
    group: 'feedback',
    label: 'Hint and Show me',
    hint: 'The two buttons that give away the piece, then the move.',
    control: { kind: 'switch' },
    default: true,
    level: 'basic',
    store: 'learner',
    synonyms: ['help', 'show'],
    valueLabel: (v) => (v ? 'offered' : 'not offered'),
    explain: (v) =>
      v ? 'Offered in every exercise; using one counts as help.' : 'Never offered: you play from memory.',
  },
  {
    key: 'feedback.triesTable',
    group: 'feedback',
    label: 'Tries table',
    hint: 'Every guess in a session, with what it cost.',
    control: {
      kind: 'select',
      options: [
        { value: 'live', label: 'Beside the board' },
        { value: 'end', label: 'Only at the end' },
        { value: 'off', label: 'Off' },
      ],
    },
    default: 'live',
    level: 'advanced',
    store: 'learner',
    synonyms: ['guesses', 'history'],
  },
  {
    key: 'feedback.sounds',
    group: 'feedback',
    label: 'Sounds',
    hint: 'A sound for a move, a right answer and a wrong one.',
    control: { kind: 'switch' },
    default: true,
    level: 'basic',
    store: 'device',
    synonyms: ['audio', 'mute'],
  },
  {
    key: 'board.coordinates',
    group: 'board',
    label: 'Coordinates',
    hint: 'Files and ranks along the edge of the board.',
    control: { kind: 'switch' },
    default: true,
    level: 'basic',
    store: 'device',
    synonyms: ['letters', 'numbers'],
  },
  {
    key: 'board.notation',
    group: 'board',
    label: 'Notation',
    hint: 'How pieces are written in moves.',
    control: {
      kind: 'toggle',
      options: [
        { value: 'letters', label: 'Letters' },
        { value: 'figurines', label: 'Figurines' },
      ],
    },
    default: 'letters',
    level: 'basic',
    store: 'device',
    explain: (v) => (v === 'letters' ? 'Moves read Nf3, Bc4.' : 'Moves read ♘f3, ♗c4.'),
  },
  {
    key: 'board.animation',
    group: 'board',
    label: 'Animate moves',
    hint: 'Pieces slide to their square instead of jumping.',
    control: { kind: 'switch' },
    default: true,
    level: 'advanced',
    store: 'device',
    synonyms: ['motion'],
  },
  {
    key: 'engine.on',
    group: 'engine',
    label: 'Engine',
    hint: 'The evaluation bar and the strip with the move’s cost.',
    control: { kind: 'switch' },
    default: true,
    level: 'basic',
    store: 'device',
    synonyms: ['stockfish', 'eval'],
  },
  {
    key: 'engine.lines',
    group: 'engine',
    label: 'Engine lines',
    hint: 'How many of the engine’s best moves are listed.',
    control: { kind: 'number', min: 1, max: 5 },
    default: 1,
    level: 'advanced',
    store: 'device',
    synonyms: ['multipv'],
    explain: (v) => (v === 1 ? 'Only the best move.' : `The best ${v} moves, each with its line.`),
  },
  {
    key: 'lichess.username',
    group: 'accounts',
    label: 'Lichess username',
    hint: 'Your games are read from Lichess’s public API; no password or token needed.',
    control: { kind: 'text', placeholder: 'Your Lichess name' },
    default: '',
    level: 'basic',
    store: 'learner',
    synonyms: ['games', 'account'],
  },
  {
    key: 'lichess.token',
    group: 'accounts',
    label: 'Lichess token',
    hint: 'Raises Lichess’s limits on explorer answers. Create one at lichess.org with no scopes.',
    control: { kind: 'secret', placeholder: 'lip_…' },
    default: '',
    level: 'advanced',
    store: 'secret',
    synonyms: ['api', 'key', 'rate limit'],
    explain: (v) =>
      v ? 'Explorer answers come faster and are limited less.' : 'Lichess answers without a token, more slowly.',
  },
];

export const SETTINGS: Record<string, SettingDef> = Object.fromEntries(defs.map((def) => [def.key, def]));
export const settingsOf = (group: SettingGroupId): SettingDef[] => defs.filter((def) => def.group === group);
export const groupOf = (id: SettingGroupId): SettingGroupDef => SETTING_GROUPS.find((group) => group.id === id)!;

/** A value as words, for sources, resets and "what changes" lists. */
export function valueLabel(def: SettingDef, value: SettingValue): string {
  if (def.valueLabel) return def.valueLabel(value);
  const { control } = def;
  if (control.kind === 'switch') return value ? 'on' : 'off';
  if (control.kind === 'select' || control.kind === 'toggle')
    return (control.options.find((option) => option.value === value)?.label ?? String(value)).toLowerCase();
  if (control.kind === 'secret') return value ? 'set' : 'not set';
  if (control.kind === 'text') return value ? String(value) : 'none';
  return String(value);
}

/** Whether a setting matches the search words, on its label, hint, key and synonyms. */
export function matchesSetting(def: SettingDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [def.label, def.hint, def.key, ...(def.synonyms ?? [])].join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/** A preset: a named bundle of learner setting values (settings.md, "Presets"; config owns the real table). */
export type Preset = {
  id: string;
  name: string;
  /** Who it is for. */
  for: string;
  values: Record<string, SettingValue>;
  /** The values that matter most, in words, for its card. */
  highlights: string[];
};

export const PRESETS: Preset[] = [
  {
    id: 'getting-started',
    name: 'Getting started',
    for: 'New players',
    values: {
      'review.newPerDay': 5,
      'feedback.explain': 'refutation',
      'feedback.evalAfter': 'words',
      'feedback.speed': 'slow',
      'feedback.hints': true,
    },
    highlights: ['5 new moves a day', 'Full explanations after a wrong move', 'Slower play, to read each move'],
  },
  {
    id: 'club',
    name: 'Club player',
    for: 'Rated 1000 to 1600',
    values: {
      'review.newPerDay': 10,
      'feedback.explain': 'sentence',
      'feedback.evalAfter': 'words',
      'feedback.speed': 'normal',
      'feedback.hints': true,
    },
    highlights: ['10 new moves a day', 'A sentence after a wrong move', 'The computer plays what your level plays'],
  },
  {
    id: 'exam',
    name: 'Exam',
    for: 'Testing yourself honestly',
    values: {
      'review.newPerDay': 10,
      'feedback.explain': 'symbol',
      'feedback.evalAfter': 'off',
      'feedback.hints': false,
      'feedback.triesTable': 'end',
    },
    highlights: ['No Hint or Show me', 'The tries table only at the end', 'No evaluation after answering'],
  },
  {
    id: 'relaxed',
    name: 'Relaxed',
    for: 'Browsing and studying',
    values: {
      'review.newPerDay': newPerDay.max,
      'level.includeRare': true,
      'feedback.explain': 'refutation',
      'feedback.evalAfter': 'both',
      'feedback.hints': true,
    },
    highlights: [`Up to ${newPerDay.max} new moves a day`, 'Rare lines included', 'Everything shown'],
  },
];

export const presetOf = (id: string): Preset => PRESETS.find((preset) => preset.id === id) ?? PRESETS[1]!;

/** The values set in each layer; the preset and default layers are filled from the preset and the registry. */
export type LayerValues = Partial<Record<Exclude<SettingLayer, 'preset' | 'default'>, Record<string, SettingValue>>>;

export type Resolved = { value: SettingValue; source: SettingLayer };

/** Looks a value up from the given layer down to the default; the first layer that has one wins. */
export function resolveSetting(
  def: SettingDef,
  layers: LayerValues,
  presetId: string,
  from: SettingLayer = 'session',
): Resolved {
  for (const layer of SETTING_LAYERS.slice(SETTING_LAYERS.indexOf(from))) {
    if (layer === 'default') break;
    const value = layer === 'preset' ? presetOf(presetId).values[def.key] : layers[layer]?.[def.key];
    if (value !== undefined) return { value, source: layer };
  }
  return { value: def.default, source: 'default' };
}

/** The layer below a written one, for the reset ("Reset to the Club player preset (10)"). */
export function resolveBelow(def: SettingDef, layers: LayerValues, presetId: string, layer: SettingLayer): Resolved {
  const below = SETTING_LAYERS[SETTING_LAYERS.indexOf(layer) + 1] ?? 'default';
  return resolveSetting(def, layers, presetId, below);
}

/** Where a value came from, as the row's small grey line. */
export function sourceText(source: SettingLayer, presetId: string): string {
  switch (source) {
    case 'session':
      return 'This session';
    case 'opening':
      return 'Set for this opening';
    case 'you':
      return 'Your choice';
    case 'material':
      return 'Set by the opening’s author';
    case 'preset':
      return `From the ${presetOf(presetId).name} preset`;
    default:
      return 'Default';
  }
}

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
  return own !== undefined && own !== resolveBelow(def, layers, presetId, layer).value;
}
