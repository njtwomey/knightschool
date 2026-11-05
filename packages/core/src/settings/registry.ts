import { z } from 'zod';
import type { SiteConfig } from '../config/site-config';
import {
  SETTING_GROUPS,
  type AnySettingDefinition,
  type Preset,
  type SettingDefinition,
  type SettingGroupId,
  type SettingKey,
  type SettingScope,
} from './types';

/** Declares one setting (docs/v2/settings.md, "One registry"); the key's value type flows from `SettingValues`. */
export function defineSetting<K extends SettingKey>(definition: SettingDefinition<K>): SettingDefinition<K> {
  return definition;
}

export type SettingsRegistry = {
  /** Every setting, in the page's order (by group, then as declared). */
  definitions: readonly AnySettingDefinition[];
  byKey: { readonly [K in SettingKey]: SettingDefinition<K> };
  groups: typeof SETTING_GROUPS;
  /** The presets from config, each checked against the registry (bad values dropped; `checkPresets` names them). */
  presets: readonly Preset[];
  defaultPreset: string;
};

const LEARNER: readonly SettingScope[] = ['session', 'opening', 'you', 'material'];
const YOU: readonly SettingScope[] = ['you'];
const SESSION_YOU: readonly SettingScope[] = ['session', 'you'];
const OPENING_YOU: readonly SettingScope[] = ['opening', 'you', 'material'];

const int = (min: number, max: number) => z.number().int().min(min).max(max);
const percent = (share: number) => `${Math.round(share * 1000) / 10}%`;
const oneIn = (share: number) => (share > 0 ? `1 game in ${Math.round(1 / share)}` : 'every game');
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
const enumOf = <T extends string>(options: readonly { value: T }[]) =>
  z.enum(options.map((option) => option.value) as [T, ...T[]]);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Every learner setting, declared once with its schema, default, range, level, scopes, store, control and wording.
 * Defaults and ranges that are the site's rules come from config (docs/v2/config.md): `schedule.newPerDay`,
 * `schedule.sessionSize`, `schedule.retention`, `coverage.*`, `puzzles.rating` and `puzzles.select`, and `settings.*`.
 */
export function settingsRegistry(config: SiteConfig): SettingsRegistry {
  const { schedule, coverage, puzzles, timing, settings: ranges } = config;
  const ratings = coverage.band.ratings;
  const bakedBand = `${ratings[0]}-${ratings[ratings.length - 1]}`;
  const presetNames = config.presets.list.map((preset) => ({ value: preset.id, label: preset.name, hint: preset.for }));

  const bandOptions = [
    { value: '400-1000', label: 'Under 1000' },
    { value: bakedBand, label: `${ratings[0]} to ${ratings[ratings.length - 1]}`, hint: 'Shipped with the site' },
    { value: '1600-2000', label: '1600 to 2000' },
    { value: '2000-2500', label: '2000 and up' },
  ].filter((option, i, all) => all.findIndex((other) => other.value === option.value) === i);

  const shareOptions = [0.1, 0.05, 0.02, 0.01]
    .concat([coverage.minShare])
    .filter((share, i, all) => all.indexOf(share) === i)
    .sort((a, b) => b - a)
    .map((share) => ({ value: share, label: oneIn(share) }));

  const explorerShares = [0, 0.005, 0.01, 0.02, 0.05]
    .concat([ranges.explorerMinShare])
    .filter((share, i, all) => all.indexOf(share) === i)
    .sort((a, b) => a - b)
    .map((share) => ({ value: share, label: share === 0 ? 'Show every reply' : percent(share) }));

  const order = [
    { value: 'due', label: 'Due first', hint: 'The most overdue moves come first' },
    { value: 'opening', label: 'By opening', hint: 'One opening at a time' },
    { value: 'mixed', label: 'Mixed', hint: 'Shuffled, so no opening runs together' },
  ] as const;
  const explainOptions = [
    { value: 'symbol', label: 'The symbol only' },
    { value: 'sentence', label: 'A sentence' },
    { value: 'refutation', label: 'A sentence and the refutation' },
  ] as const;
  const evalOptions = [
    { value: 'off', label: 'Off' },
    { value: 'words', label: 'Words' },
    { value: 'both', label: 'Words and numbers' },
  ] as const;
  const speedOptions = [
    { value: 'slow', label: 'Slow', hint: 'Longer pauses, to read each move' },
    { value: 'normal', label: 'Normal' },
    { value: 'fast', label: 'Fast', hint: 'For moves you already know well' },
  ] as const;
  const triesOptions = [
    { value: 'live', label: 'Beside the board' },
    { value: 'end', label: 'Only at the end' },
    { value: 'off', label: 'Off' },
  ] as const;
  const columns = [
    { value: 'grade', label: 'Grade' },
    { value: 'cost', label: 'Cost' },
    { value: 'time', label: 'Time' },
    { value: 'help', label: 'Help' },
  ] as const;
  const computerOptions = [
    { value: 'written', label: 'As written', hint: 'The replies the lines give, chosen at random' },
    {
      value: 'level',
      label: 'As your level plays',
      hint: 'Replies weighted by how often players at your level choose them',
    },
    {
      value: 'least-known',
      label: 'Least known first',
      hint: 'The branches holding the moves you know least come first',
    },
    { value: 'engine', label: 'The engine', hint: 'The strongest reply, which may leave the lines' },
  ] as const;
  const solverOptions = [
    { value: 'you', label: 'You', hint: 'Puzzles where your side wins something' },
    { value: 'opponent', label: 'The opponent', hint: 'Find what the other side threatens, so you see it coming' },
    { value: 'both', label: 'Both' },
  ] as const;
  const themesShown = [
    { value: 'before', label: 'Before solving' },
    { value: 'after', label: 'After solving' },
    { value: 'never', label: 'Never' },
  ] as const;
  const boardThemes = [
    { value: 'green', label: 'Green' },
    { value: 'tan', label: 'Tan' },
    { value: 'blue', label: 'Blue' },
    { value: 'slate', label: 'Slate' },
    { value: 'purple', label: 'Purple' },
  ] as const;
  const pieceSets = [
    { value: 'classic', label: 'Classic' },
    { value: 'bold', label: 'Bold outline' },
    { value: 'soft', label: 'Soft shadow' },
  ] as const;
  const notation = [
    { value: 'letters', label: 'Nf3', hint: 'Letters' },
    { value: 'figurines', label: '♘f3', hint: 'Figurines' },
  ] as const;
  const previews = [
    { value: 'off', label: 'Off' },
    { value: 'board', label: 'Small board' },
    { value: 'full', label: 'Board, name and counts' },
  ] as const;
  const features = [
    { value: 'off', label: 'Off' },
    { value: 'request', label: 'On request' },
    { value: 'always', label: 'Always while studying' },
  ] as const;
  const motion = [
    { value: 'system', label: 'As the system' },
    { value: 'on', label: 'Reduced' },
    { value: 'off', label: 'Full' },
  ] as const;
  const speeds = ranges.feedbackSpeeds;
  const minRating = puzzles.select.minRating;
  const maxRating = puzzles.select.maxRating;

  const definitions: AnySettingDefinition[] = [
    defineSetting({
      key: 'preset',
      group: 'preset',
      label: 'Preset',
      hint: 'Sets many values at once; anything you change afterwards is your own.',
      schema: z.string().refine((id) => config.presets.list.some((preset) => preset.id === id)),
      default: config.presets.default,
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'select', options: presetNames },
    }),
    defineSetting({
      key: 'repertoire',
      group: 'level',
      label: 'Your repertoire',
      hint: 'What you have ticked to learn: openings, variations, lines and steps.',
      synonyms: ['openings', 'enrolled'],
      schema: z.array(z.string().min(1)),
      default: [],
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'elsewhere', href: '/repertoire', text: 'See your repertoire' },
      explain: (ids) =>
        ids.length === 0
          ? 'Nothing ticked yet: practice draws on the openings you have started.'
          : `${ids.length} ticked: Today, Review, Drill and Puzzles draw on these alone.`,
      valueLabel: (ids) => `${ids.length} ticked`,
      aliases: { enrolled: (raw) => raw },
    }),
    defineSetting({
      key: 'level.band',
      group: 'level',
      label: 'Your rating band',
      hint: 'The players whose games decide which replies you meet.',
      synonyms: ['rating', 'elo', 'strength'],
      schema: enumOf(bandOptions),
      default: bakedBand,
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'select', options: bandOptions },
      explain: (band) =>
        band === bakedBand
          ? 'Answers come with the site, so they work offline.'
          : 'Answers for this band come from the Lichess explorer, online.',
    }),
    defineSetting({
      key: 'level.coverageTarget',
      group: 'level',
      label: 'Replies to answer',
      hint: 'How common a reply must be among players at your level before you learn an answer to it.',
      synonyms: ['coverage', 'popularity', 'common'],
      schema: z.number().min(0).max(1),
      default: coverage.minShare,
      level: 'advanced',
      scopes: OPENING_YOU,
      store: 'learner',
      control: { kind: 'select', options: shareOptions },
      explain: (share) => `Every reply played in at least ${oneIn(share)} gets an answer.`,
      aliases: { minPopularityPercent: (raw) => (typeof raw === 'number' ? raw / 100 : raw) },
    }),
    defineSetting({
      key: 'level.includeRare',
      group: 'level',
      label: 'Include rare lines',
      hint: 'Lines few players at your level reach.',
      synonyms: ['uncommon', 'unusual'],
      schema: z.boolean(),
      default: false,
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'switch' },
      explain: (on) => (on ? 'Rare lines join your steps and reviews.' : 'Rare lines are shown, but never asked.'),
      aliases: { includeRareLines: (raw) => raw },
    }),
    defineSetting({
      key: 'level.includeAlternatives',
      group: 'level',
      label: 'Drill alternatives',
      hint: 'Second answers an opening lists beside its main move.',
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: OPENING_YOU,
      store: 'learner',
      control: { kind: 'switch' },
      explain: (on) => (on ? 'Alternatives are drilled like any line.' : 'Alternatives are shown, not drilled.'),
    }),
    defineSetting({
      key: 'level.trapsAsDrills',
      group: 'level',
      label: 'Drill traps to spring',
      hint: 'Traps you can set for the other side, drilled like your lines.',
      synonyms: ['trap', 'trick'],
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: OPENING_YOU,
      store: 'learner',
      control: { kind: 'switch' },
      explain: (on) => (on ? 'Traps are drilled with your lines.' : 'Traps stay as extras to read.'),
    }),
    defineSetting({
      key: 'review.newPerDay',
      group: 'review',
      label: 'New moves a day',
      hint: 'How many moves you have not seen before are added to your reviews each day.',
      synonyms: ['daily', 'limit', 'cards'],
      schema: int(schedule.newPerDay.min, schedule.newPerDay.max),
      default: schedule.newPerDay.default,
      range: { min: schedule.newPerDay.min, max: schedule.newPerDay.max },
      level: 'basic',
      scopes: OPENING_YOU,
      store: 'learner',
      control: {
        kind: 'slider',
        min: schedule.newPerDay.min,
        max: schedule.newPerDay.max,
        step: 1,
        marks: [5, 10, 20],
      },
      explain: (n) => (n === 0 ? 'No new moves; only reviews.' : `About ${n * 7} new moves a week.`),
      aliases: { newCardsPerDay: (raw) => raw },
    }),
    defineSetting({
      key: 'review.sessionSize',
      group: 'review',
      label: 'Reviews per session',
      hint: 'How many moves one review session asks before it stops.',
      synonyms: ['length', 'long'],
      schema: int(schedule.sessionSize.min, schedule.sessionSize.max),
      default: schedule.sessionSize.default,
      range: { min: schedule.sessionSize.min, max: schedule.sessionSize.max },
      level: 'advanced',
      scopes: SESSION_YOU,
      store: 'learner',
      control: {
        kind: 'slider',
        min: schedule.sessionSize.min,
        max: schedule.sessionSize.max,
        step: 5,
        marks: [10, 20, 50],
      },
      explain: (n) => `About ${plural(Math.max(1, Math.round((n * 15) / 60)), 'minute')} at 15 seconds a move.`,
    }),
    defineSetting({
      key: 'review.order',
      group: 'review',
      label: 'Review order',
      hint: 'Which due moves come first in a review.',
      synonyms: ['sort', 'shuffle'],
      schema: enumOf(order),
      default: 'due',
      level: 'advanced',
      scopes: SESSION_YOU,
      store: 'learner',
      control: { kind: 'toggle', options: [...order] },
    }),
    defineSetting({
      key: 'review.retention',
      group: 'review',
      label: 'How much to remember',
      hint: 'The share of reviews you aim to get right; higher means more frequent reviews.',
      synonyms: ['retention', 'fsrs', 'interval'],
      schema: z.number().min(ranges.retention.min).max(ranges.retention.max),
      default: schedule.retention,
      range: ranges.retention,
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'slider', min: ranges.retention.min, max: ranges.retention.max, step: 0.01, unit: '%' },
      explain: (share) => `About ${Math.round(share * 100)} reviews in 100 answered right.`,
      valueLabel: (share) => `${Math.round(share * 100)}%`,
    }),
    defineSetting({
      key: 'review.movesPerQuestion',
      group: 'review',
      label: 'Moves per question',
      hint: 'How far a review asks you to play from the position it shows.',
      schema: int(0, 5),
      default: 1,
      level: 'basic',
      scopes: SESSION_YOU,
      store: 'learner',
      control: {
        kind: 'toggle',
        options: [
          ...[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
          { value: 0, label: 'Rest of the line', hint: 'Every move of yours to the end of the line' },
        ],
      },
      valueLabel: (n) => (n === 0 ? 'the rest of the line' : plural(n, 'move')),
      explain: (n) =>
        n === 1
          ? 'Each question asks for one of your moves.'
          : n === 0
            ? 'Each question plays on to the end of the line.'
            : `Each question asks for ${n} of your moves in a row.`,
    }),
    defineSetting({
      key: 'review.grading',
      group: 'review',
      label: 'Grading',
      hint: 'Whether the site grades each answer or you do, as in Anki.',
      synonyms: ['anki', 'grade'],
      schema: z.enum(['automatic', 'manual']),
      default: 'automatic',
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: {
        kind: 'toggle',
        options: [
          { value: 'automatic', label: 'Automatic' },
          { value: 'manual', label: 'By hand', hint: 'Not built yet: answers are graded automatically for now' },
        ],
      },
    }),
    defineSetting({
      key: 'learning.gatesRelaxed',
      group: 'learning',
      label: 'Relax the gates',
      hint: 'Locked steps and checkpoints become suggestions you can open at any time.',
      synonyms: ['lock', 'locked', 'gate', 'checkpoint'],
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: OPENING_YOU,
      store: 'learner',
      control: { kind: 'switch' },
      explain: (on) => (on ? 'Locked steps read "suggested later" and open unasked.' : 'Steps open in order.'),
    }),
    defineSetting({
      key: 'learning.startFrom',
      group: 'learning',
      label: 'Start a step from',
      hint: 'Where a step’s moves begin when you try them.',
      schema: z.enum(['branch', 'start']),
      default: 'branch',
      level: 'advanced',
      scopes: OPENING_YOU,
      store: 'learner',
      control: {
        kind: 'toggle',
        options: [
          { value: 'branch', label: 'Where it branches off' },
          { value: 'start', label: 'Move 1' },
        ],
      },
      explain: (from) =>
        from === 'branch' ? 'The moves before the branch are played for you.' : 'You play every move from the start.',
    }),
    defineSetting({
      key: 'feedback.explain',
      group: 'feedback',
      label: 'After a wrong move',
      hint: 'How much the board says when a move is not the one to play.',
      synonyms: ['explanation', 'why', 'mistake'],
      schema: enumOf(explainOptions),
      default: 'sentence',
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'select', options: [...explainOptions] },
      explain: (v) =>
        v === 'symbol'
          ? 'You see ?! or ?, and nothing more.'
          : v === 'sentence'
            ? 'A sentence on what the move gives away.'
            : 'The sentence, then the punishing moves to step through on the board.',
    }),
    defineSetting({
      key: 'feedback.evalAfter',
      group: 'feedback',
      label: 'Evaluation after answering',
      hint: 'Where the position stands once you have played.',
      synonyms: ['eval', 'score', 'engine'],
      schema: enumOf(evalOptions),
      default: 'words',
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'toggle', options: [...evalOptions] },
      explain: (v) =>
        v === 'off'
          ? 'Nothing is said.'
          : v === 'words'
            ? '"White is a little better."'
            : '"White is a little better (+0.6)."',
    }),
    defineSetting({
      key: 'feedback.speed',
      group: 'feedback',
      label: 'Speed of play',
      hint: 'How quickly the computer replies and the next question appears.',
      synonyms: ['delay', 'pace', 'quick', 'slow', 'fast', 'timing'],
      schema: enumOf(speedOptions),
      default: 'normal',
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'toggle', options: [...speedOptions] },
      explain: (v) => `The computer replies after about ${seconds(timing.opponent * speeds[v])}.`,
    }),
    defineSetting({
      key: 'feedback.hints',
      group: 'feedback',
      label: 'Hint and Show me',
      hint: 'The two buttons that give away the piece, then the move.',
      synonyms: ['help', 'show'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'switch' },
      valueLabel: (on) => (on ? 'offered' : 'not offered'),
      explain: (on) =>
        on ? 'Offered in every exercise; using one counts as help.' : 'Never offered: you play from memory.',
    }),
    defineSetting({
      key: 'feedback.triesTable',
      group: 'feedback',
      label: 'Tries table',
      hint: 'Every guess in a session, with what it cost.',
      synonyms: ['guesses', 'history'],
      schema: enumOf(triesOptions),
      default: 'live',
      level: 'advanced',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'toggle', options: [...triesOptions] },
    }),
    defineSetting({
      key: 'feedback.triesColumns',
      group: 'feedback',
      label: 'Tries table columns',
      hint: 'What the tries table shows for each guess.',
      synonyms: ['columns'],
      schema: z.array(enumOf(columns)),
      default: ['grade', 'cost', 'time', 'help'],
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'multi', options: [...columns] },
      valueLabel: (list) => (list.length === 0 ? 'none' : list.join(', ')),
    }),
    defineSetting({
      key: 'feedback.triesRightMoves',
      group: 'feedback',
      label: 'Right moves in the tries table',
      hint: 'List right answers as well as wrong ones.',
      schema: z.boolean(),
      default: true,
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'feedback.sounds',
      group: 'feedback',
      label: 'Sounds',
      hint: 'A sound for a move, a right answer and a wrong one.',
      synonyms: ['audio', 'mute'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'computer.plays',
      group: 'computer',
      label: 'The computer plays',
      hint: 'How the computer chooses its replies in a drill.',
      synonyms: ['opponent', 'replies', 'drill'],
      schema: enumOf(computerOptions),
      default: 'level',
      level: 'basic',
      scopes: LEARNER,
      store: 'learner',
      control: { kind: 'toggle', options: [...computerOptions] },
      explain: (v) =>
        v === 'written'
          ? 'Any reply the lines give, each as likely as the next.'
          : v === 'least-known'
            ? 'Every branch once, the ones with the moves you know least first.'
            : v === 'engine'
              ? 'The best reply, even off your lines: a stiffer test.'
              : 'The replies you will meet most often come up most often.',
    }),
    defineSetting({
      key: 'puzzles.rating',
      group: 'puzzles',
      label: 'Puzzle rating',
      hint: 'The range of puzzle ratings drawn most often; others come up less.',
      synonyms: ['hard', 'easy', 'difficulty'],
      schema: z.tuple([int(minRating, maxRating), int(minRating, maxRating)]).refine(([low, high]) => low <= high),
      default: [puzzles.rating[0], puzzles.rating[1]],
      range: { min: minRating, max: maxRating },
      level: 'basic',
      scopes: SESSION_YOU,
      store: 'learner',
      control: { kind: 'range', min: minRating, max: maxRating, step: 50 },
      valueLabel: ([low, high]) => `${low} to ${high}`,
      explain: ([low, high]) =>
        `Mostly puzzles rated ${low} to ${high}; each ${config.puzzles.ratingFalloff} points further out halves the chance.`,
    }),
    defineSetting({
      key: 'puzzles.solver',
      group: 'puzzles',
      label: 'Who solves',
      hint: 'Puzzles where your side wins something, or where you find what the other side threatens.',
      synonyms: ['threat', 'side'],
      schema: enumOf(solverOptions),
      default: 'you',
      level: 'advanced',
      scopes: SESSION_YOU,
      store: 'learner',
      control: { kind: 'toggle', options: [...solverOptions] },
    }),
    defineSetting({
      key: 'puzzles.showThemes',
      group: 'puzzles',
      label: 'Puzzle themes shown',
      hint: 'When a puzzle’s themes (fork, pin) are named.',
      synonyms: ['theme', 'tactic'],
      schema: enumOf(themesShown),
      default: 'after',
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'toggle', options: [...themesShown] },
    }),
    defineSetting({
      key: 'puzzles.themes',
      group: 'puzzles',
      label: 'Puzzle themes included',
      hint: 'Only puzzles with these themes come up.',
      schema: z.array(z.string().min(1)),
      default: [],
      level: 'advanced',
      scopes: SESSION_YOU,
      store: 'learner',
      control: { kind: 'elsewhere', href: '/practice/puzzles', text: 'Choose in the puzzle set-up' },
      valueLabel: (list) => (list.length === 0 ? 'all' : list.join(', ')),
    }),
    defineSetting({
      key: 'board.theme',
      group: 'board',
      label: 'Board colours',
      hint: 'The colours of the squares on every board.',
      synonyms: ['colour', 'color', 'theme'],
      schema: enumOf(boardThemes),
      default: 'green',
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'swatch', options: [...boardThemes] },
    }),
    defineSetting({
      key: 'board.pieces',
      group: 'board',
      label: 'Pieces',
      hint: 'How the pieces are drawn.',
      synonyms: ['piece set'],
      schema: enumOf(pieceSets),
      default: 'classic',
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'select', options: [...pieceSets] },
    }),
    defineSetting({
      key: 'board.coordinates',
      group: 'board',
      label: 'Coordinates',
      hint: 'The letters and numbers round the board.',
      synonyms: ['letters', 'numbers', 'files', 'ranks'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.legalMoves',
      group: 'board',
      label: 'Legal moves',
      hint: 'Dots on the squares a picked-up piece can go to.',
      synonyms: ['dots'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.lastMove',
      group: 'board',
      label: 'Last move',
      hint: 'Highlight the two squares of the last move.',
      schema: z.boolean(),
      default: true,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.hoverSquare',
      group: 'board',
      label: 'Square under the pointer',
      hint: 'Tint the square the pointer is over.',
      synonyms: ['hover'],
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.animation',
      group: 'board',
      label: 'Animation',
      hint: 'Pieces slide to their squares.',
      synonyms: ['motion', 'animate'],
      schema: z.boolean(),
      default: true,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.notation',
      group: 'board',
      label: 'Notation',
      hint: 'How moves are written: Nf3 or with a small knight.',
      synonyms: ['figurine', 'letters'],
      schema: enumOf(notation),
      default: 'letters',
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'toggle', options: [...notation] },
      valueLabel: (v) => (v === 'letters' ? 'letters' : 'figurines'),
      explain: (v) => (v === 'letters' ? 'Moves read Nf3, Bc4.' : 'Moves read ♘f3, ♗c4.'),
    }),
    defineSetting({
      key: 'board.marksWhileStudying',
      group: 'board',
      label: 'Marks while studying',
      hint: 'The author’s arrows and rings. Turn off for a clean board; they never show while you are tested.',
      synonyms: ['arrows', 'circles'],
      schema: z.boolean(),
      default: true,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'board.sizeCap',
      group: 'board',
      label: 'Largest board',
      hint: 'How wide a board may grow on a big screen.',
      synonyms: ['size', 'width', 'big'],
      schema: int(ranges.boardSizeCapRem.min, ranges.boardSizeCapRem.max),
      default: ranges.boardSizeCapRem.default,
      range: ranges.boardSizeCapRem,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: {
        kind: 'slider',
        min: ranges.boardSizeCapRem.min,
        max: ranges.boardSizeCapRem.max,
        step: 4,
        unit: 'rem',
      },
      explain: (rem) => `At most about ${rem * 16} pixels across.`,
    }),
    defineSetting({
      key: 'display.previews',
      group: 'display',
      label: 'Position previews',
      hint: 'What shows when the pointer rests on a move or a line.',
      synonyms: ['hover', 'preview', 'popup'],
      schema: enumOf(previews),
      default: 'board',
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'toggle', options: [...previews] },
    }),
    defineSetting({
      key: 'display.previewDelay',
      group: 'display',
      label: 'Preview delay',
      hint: 'How long the pointer rests before a preview opens; it closes in half the time.',
      synonyms: ['delay', 'hover'],
      schema: int(ranges.previewDelayMs.min, ranges.previewDelayMs.max),
      default: ranges.previewDelayMs.default,
      range: ranges.previewDelayMs,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: {
        kind: 'slider',
        min: ranges.previewDelayMs.min,
        max: ranges.previewDelayMs.max,
        step: 50,
        unit: 'ms',
      },
      explain: (ms) => `Opens after ${ms} ms and closes after ${Math.round(ms / 2)} ms.`,
    }),
    defineSetting({
      key: 'display.positionFeatures',
      group: 'display',
      label: 'Position features',
      hint: 'Notes on a position’s pawn structure, open files and weak squares.',
      synonyms: ['structure', 'features'],
      schema: enumOf(features),
      default: 'request',
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'toggle', options: [...features] },
    }),
    defineSetting({
      key: 'engine.on',
      group: 'engine',
      label: 'Engine',
      hint: 'Stockfish’s evaluation beside the board, in your browser. Never while you are tested.',
      synonyms: ['stockfish', 'eval', 'analysis'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'engine.depth',
      group: 'engine',
      label: 'Engine depth',
      hint: 'How far ahead the board’s analysis looks before it stops; deeper takes longer.',
      synonyms: ['depth', 'stockfish'],
      schema: int(ranges.engineDepth.min, ranges.engineDepth.max),
      default: ranges.engineDepth.default,
      range: ranges.engineDepth,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'slider', min: ranges.engineDepth.min, max: ranges.engineDepth.max, step: 1 },
      explain: (depth) => `Stops at depth ${depth}.`,
    }),
    defineSetting({
      key: 'engine.lines',
      group: 'engine',
      label: 'Lines',
      hint: 'How many of the engine’s best lines to show.',
      synonyms: ['multipv'],
      schema: int(ranges.engineLines.min, ranges.engineLines.max),
      default: ranges.engineLines.default,
      range: ranges.engineLines,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: {
        kind: 'toggle',
        options: Array.from({ length: ranges.engineLines.max - ranges.engineLines.min + 1 }, (_, i) => ({
          value: ranges.engineLines.min + i,
          label: String(ranges.engineLines.min + i),
        })),
      },
      explain: (n) => (n === 1 ? 'Only the best move.' : `The best ${n} moves, each with its line.`),
    }),
    defineSetting({
      key: 'engine.bakedOnly',
      group: 'engine',
      label: 'Shipped analysis only',
      hint: 'Use only the analysis that comes with the site, and never start the engine in your browser.',
      synonyms: ['battery', 'baked', 'offline'],
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'explorer.minShare',
      group: 'engine',
      label: 'Explorer cut-off',
      hint: 'Replies played less often than this fold under More in the explorer.',
      synonyms: ['explorer', 'rare', 'more'],
      schema: z.number().min(0).max(1),
      default: ranges.explorerMinShare,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'select', options: explorerShares },
    }),
    defineSetting({
      key: 'lichess.token',
      group: 'accounts',
      label: 'Lichess token',
      hint: 'Raises Lichess’s limits on explorer answers. Create one at lichess.org with no scopes.',
      synonyms: ['api', 'key', 'rate limit'],
      schema: z.string(),
      default: '',
      level: 'advanced',
      scopes: YOU,
      store: 'secret',
      control: { kind: 'secret', placeholder: 'lip_…' },
      valueLabel: (token) => (token ? 'set' : 'not set'),
      explain: (token) =>
        token ? 'Explorer answers come faster and are limited less.' : 'Lichess answers without a token, more slowly.',
    }),
    defineSetting({
      key: 'lichess.username',
      group: 'accounts',
      label: 'Lichess username',
      hint: 'Your games are read from Lichess’s public API; no password or token needed.',
      synonyms: ['games', 'account'],
      schema: z.string().max(60),
      default: '',
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'text', placeholder: 'Your Lichess name' },
    }),
    defineSetting({
      key: 'chessdotcom.username',
      group: 'accounts',
      label: 'Chess.com username',
      hint: 'Your games are read from Chess.com’s public API; no password needed.',
      synonyms: ['games', 'account', 'chess.com'],
      schema: z.string().max(60),
      default: '',
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'text', placeholder: 'Your Chess.com name' },
    }),
    defineSetting({
      key: 'games.count',
      group: 'accounts',
      label: 'Games to read',
      hint: 'How many of your most recent games are read from each site.',
      synonyms: ['games'],
      schema: int(ranges.gamesCount.min, ranges.gamesCount.max),
      default: ranges.gamesCount.default,
      range: ranges.gamesCount,
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'number', min: ranges.gamesCount.min, max: ranges.gamesCount.max },
      explain: (n) => `Your last ${n} games from each site.`,
    }),
    defineSetting({
      key: 'games.fetchOnOpen',
      group: 'accounts',
      label: 'Read new games on opening',
      hint: 'Check both sites for new games each time you open Knight School.',
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'progress.showStreak',
      group: 'progress',
      label: 'Show your streak',
      hint: 'The run of days you have practised, in the header and on Today.',
      synonyms: ['streak', 'days'],
      schema: z.boolean(),
      default: true,
      level: 'basic',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'data.exportReminder',
      group: 'progress',
      label: 'Remind me to export',
      hint: 'A reminder to download a copy of your data after 20 changes or 7 days.',
      synonyms: ['backup', 'export', 'copy'],
      schema: z.boolean(),
      default: true,
      level: 'advanced',
      scopes: YOU,
      store: 'learner',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'access.reducedMotion',
      group: 'accessibility',
      label: 'Reduce motion',
      hint: 'Fewer slides and fades.',
      synonyms: ['motion', 'animation'],
      schema: enumOf(motion),
      default: 'system',
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'toggle', options: [...motion] },
    }),
    defineSetting({
      key: 'access.highContrast',
      group: 'accessibility',
      label: 'High-contrast board',
      hint: 'Stronger square colours and outlines.',
      synonyms: ['contrast'],
      schema: z.boolean(),
      default: false,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'access.largerPieces',
      group: 'accessibility',
      label: 'Larger pieces',
      hint: 'Pieces fill more of their squares.',
      synonyms: ['size', 'big'],
      schema: z.boolean(),
      default: false,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'access.typedMoves',
      group: 'accessibility',
      label: 'Type moves',
      hint: 'Type a move such as Nf3 instead of dragging a piece.',
      synonyms: ['keyboard', 'type'],
      schema: z.boolean(),
      default: false,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'access.squareCursor',
      group: 'accessibility',
      label: 'Square cursor',
      hint: 'The arrow keys move a cursor over the squares while the board has focus.',
      synonyms: ['keyboard', 'arrow'],
      schema: z.boolean(),
      default: false,
      level: 'advanced',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
    defineSetting({
      key: 'access.readMoves',
      group: 'accessibility',
      label: 'Read moves aloud',
      hint: 'Each move is spoken as it is played.',
      synonyms: ['speech', 'screen reader', 'voice'],
      schema: z.boolean(),
      default: false,
      level: 'basic',
      scopes: YOU,
      store: 'device',
      control: { kind: 'switch' },
    }),
  ] as AnySettingDefinition[];

  const groupIndex = (id: SettingGroupId) => SETTING_GROUPS.findIndex((group) => group.id === id);
  const ordered = definitions
    .map((definition, i) => ({ definition, i }))
    .sort((a, b) => groupIndex(a.definition.group) - groupIndex(b.definition.group) || a.i - b.i)
    .map(({ definition }) => definition);
  const byKey = Object.fromEntries(
    ordered.map((definition) => [definition.key, definition]),
  ) as SettingsRegistry['byKey'];
  const partial: Omit<SettingsRegistry, 'presets'> = {
    definitions: ordered,
    byKey,
    groups: SETTING_GROUPS,
    defaultPreset: config.presets.default,
  };
  return { ...partial, presets: readPresets(config, byKey) };
}

/** Config's presets with every value checked; a bad one is left out (`checkPresets` names it for the build). */
function readPresets(config: SiteConfig, byKey: SettingsRegistry['byKey']): Preset[] {
  return config.presets.list.map((preset) => {
    const values: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(preset.values)) {
      const definition = (byKey as Record<string, AnySettingDefinition | undefined>)[key];
      if (!definition || definition.store !== 'learner') continue;
      const parsed = definition.schema.safeParse(raw);
      if (parsed.success) values[key] = parsed.data;
    }
    return { id: preset.id, name: preset.name, for: preset.for, highlights: preset.highlights, values };
  });
}

/** What is wrong with config's presets: an unknown key, a device or secret setting, a bad value, a missing default. */
export function checkPresets(config: SiteConfig, registry: Pick<SettingsRegistry, 'byKey'>): string[] {
  const problems: string[] = [];
  const ids = config.presets.list.map((preset) => preset.id);
  if (!ids.includes(config.presets.default)) problems.push(`presets.default: no preset "${config.presets.default}"`);
  ids.forEach((id, i) => {
    if (ids.indexOf(id) !== i) problems.push(`presets: "${id}" is listed twice`);
  });
  for (const preset of config.presets.list) {
    for (const [key, raw] of Object.entries(preset.values)) {
      const where = `presets.${preset.id}.${key}`;
      const definition = (registry.byKey as Record<string, AnySettingDefinition | undefined>)[key];
      if (!definition) problems.push(`${where}: no such setting`);
      else if (definition.store !== 'learner')
        problems.push(`${where}: a ${definition.store} setting, not a learner one`);
      else if (key === 'preset') problems.push(`${where}: a preset cannot set the preset`);
      else if (!definition.schema.safeParse(raw).success)
        problems.push(`${where}: ${JSON.stringify(raw)} is not allowed`);
    }
  }
  return problems;
}
