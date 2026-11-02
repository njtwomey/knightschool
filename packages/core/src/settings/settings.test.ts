import { describe, expect, it } from 'vitest';
import { siteConfig } from '../testing/site-config';
import { checkPresets, settingsRegistry } from './registry';
import {
  checkSetting,
  customChanges,
  isCustom,
  matchesSetting,
  presetValues,
  readStoredSettings,
  resolveBelow,
  resolveSetting,
  settingRows,
  sourceWords,
  valueWords,
} from './resolve';
import type { SettingKey } from './types';

const registry = settingsRegistry(siteConfig);
const { byKey } = registry;

/** Every key in docs/v2/settings.md, "Keys". */
const KEYS: SettingKey[] = [
  'preset',
  'repertoire',
  'level.band',
  'level.coverageTarget',
  'level.includeRare',
  'level.includeAlternatives',
  'level.trapsAsDrills',
  'review.newPerDay',
  'review.sessionSize',
  'review.order',
  'review.retention',
  'review.movesPerQuestion',
  'review.grading',
  'learning.gatesRelaxed',
  'learning.startFrom',
  'feedback.explain',
  'feedback.evalAfter',
  'feedback.speed',
  'feedback.hints',
  'feedback.triesTable',
  'feedback.triesColumns',
  'feedback.triesRightMoves',
  'feedback.sounds',
  'computer.plays',
  'puzzles.rating',
  'puzzles.solver',
  'puzzles.showThemes',
  'puzzles.themes',
  'board.theme',
  'board.pieces',
  'board.coordinates',
  'board.legalMoves',
  'board.lastMove',
  'board.hoverSquare',
  'board.animation',
  'board.notation',
  'board.marksWhileStudying',
  'board.sizeCap',
  'display.previews',
  'display.previewDelay',
  'display.positionFeatures',
  'engine.on',
  'engine.depth',
  'engine.lines',
  'engine.bakedOnly',
  'explorer.minShare',
  'lichess.token',
  'lichess.username',
  'chessdotcom.username',
  'games.count',
  'games.fetchOnOpen',
  'progress.showStreak',
  'data.exportReminder',
  'access.reducedMotion',
  'access.highContrast',
  'access.largerPieces',
  'access.typedMoves',
  'access.squareCursor',
  'access.readMoves',
];

describe('the registry', () => {
  it('declares every key once, and only those', () => {
    expect(registry.definitions.map((d) => d.key).sort()).toEqual([...KEYS].sort());
  });

  it('gives every default a value its own schema accepts', () => {
    for (const definition of registry.definitions) {
      expect(definition.schema.safeParse(definition.default).success, definition.key).toBe(true);
    }
  });

  it('takes defaults and ranges that are config’s from config', () => {
    expect(byKey['review.newPerDay'].default).toBe(siteConfig.schedule.newPerDay.default);
    expect(byKey['review.newPerDay'].range).toEqual({
      min: siteConfig.schedule.newPerDay.min,
      max: siteConfig.schedule.newPerDay.max,
    });
    expect(byKey['review.sessionSize'].default).toBe(siteConfig.schedule.sessionSize.default);
    expect(byKey['review.retention'].default).toBe(siteConfig.schedule.retention);
    expect(byKey['puzzles.rating'].default).toEqual(siteConfig.puzzles.rating);
    expect(byKey['level.coverageTarget'].default).toBe(siteConfig.coverage.minShare);
    expect(byKey.preset.default).toBe(siteConfig.presets.default);
  });

  it('keeps the token secret and the board on this device', () => {
    expect(byKey['lichess.token'].store).toBe('secret');
    expect(byKey['board.theme'].store).toBe('device');
    expect(byKey['review.newPerDay'].store).toBe('learner');
  });

  it('orders definitions by group', () => {
    const groups = registry.definitions.map((d) => d.group);
    const order = registry.groups.map((g) => g.id as string);
    expect([...groups].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(groups);
  });
});

describe('resolveSetting', () => {
  const def = byKey['level.includeRare'];

  it('takes the most particular layer that has a value', () => {
    const layers = { preset: { 'level.includeRare': true }, material: { 'level.includeRare': false } };
    expect(resolveSetting(def, layers)).toEqual({ value: false, source: 'material' });
    expect(resolveSetting(def, { ...layers, you: { 'level.includeRare': true } })).toEqual({
      value: true,
      source: 'you',
    });
    expect(
      resolveSetting(def, { ...layers, you: { 'level.includeRare': true }, opening: { 'level.includeRare': false } }),
    ).toEqual({ value: false, source: 'opening' });
    expect(
      resolveSetting(def, { session: { 'level.includeRare': true }, opening: { 'level.includeRare': false } }),
    ).toEqual({ value: true, source: 'session' });
  });

  it('falls back to the preset, then the default', () => {
    expect(resolveSetting(def, { preset: { 'level.includeRare': true } })).toEqual({ value: true, source: 'preset' });
    expect(resolveSetting(def, {})).toEqual({ value: false, source: 'default' });
  });

  it('lets a bad value fall through instead of throwing', () => {
    expect(resolveSetting(def, { you: { 'level.includeRare': 'yes' }, preset: { 'level.includeRare': true } })).toEqual(
      { value: true, source: 'preset' },
    );
    expect(resolveSetting(byKey['feedback.speed'], { you: { 'feedback.speed': 'warp' } }).source).toBe('default');
  });

  it('clamps a number outside config’s range', () => {
    const { max } = siteConfig.schedule.newPerDay;
    expect(resolveSetting(byKey['review.newPerDay'], { you: { 'review.newPerDay': max + 100 } })).toEqual({
      value: max,
      source: 'you',
    });
    expect(checkSetting(byKey['puzzles.rating'], [0, 9999])).toEqual([
      siteConfig.puzzles.select.minRating,
      siteConfig.puzzles.select.maxRating,
    ]);
    expect(checkSetting(byKey['puzzles.rating'], [1500, 1000])).toBeUndefined();
  });

  it('ignores layers outside a setting’s scopes', () => {
    // Board look is never set per opening, and presets reach learner settings only.
    const theme = byKey['board.theme'];
    expect(resolveSetting(theme, { opening: { 'board.theme': 'blue' }, preset: { 'board.theme': 'tan' } }).source).toBe(
      'default',
    );
    // The repertoire is the learner's alone: no session or opening value.
    expect(resolveSetting(byKey.repertoire, { session: { repertoire: ['x'] } }).source).toBe('default');
  });

  it('starts below a layer for what a reset falls back to', () => {
    const layers = { you: { 'review.newPerDay': 15 }, preset: { 'review.newPerDay': 5 } };
    expect(resolveBelow(byKey['review.newPerDay'], layers, 'you')).toEqual({ value: 5, source: 'preset' });
  });
});

describe('presets', () => {
  it('config’s presets are all valid', () => {
    expect(checkPresets(siteConfig, registry)).toEqual([]);
    expect(registry.presets.map((p) => p.id)).toEqual(['getting-started', 'club', 'exam', 'relaxed']);
  });

  it('names each kind of problem', () => {
    const bad = {
      ...siteConfig,
      presets: {
        default: 'nope',
        list: [
          {
            id: 'odd',
            name: 'Odd',
            for: '',
            highlights: [],
            values: { 'no.such': 1, 'board.theme': 'blue', 'review.newPerDay': 'many' },
          },
        ],
      },
    };
    expect(checkPresets(bad, registry)).toEqual([
      'presets.default: no preset "nope"',
      'presets.odd.no.such: no such setting',
      'presets.odd.board.theme: a device setting, not a learner one',
      'presets.odd.review.newPerDay: "many" is not allowed',
    ]);
  });

  it('isCustom is true only when your own choice differs from the preset', () => {
    expect(presetValues(registry, 'getting-started')['review.newPerDay']).toBe(5);
    expect(isCustom(registry, {}, 'club')).toBe(false);
    expect(isCustom(registry, { 'review.newPerDay': 10 }, 'club')).toBe(false);
    expect(customChanges(registry, { 'review.newPerDay': 12, 'board.theme': 'blue', preset: 'club' }, 'club')).toEqual([
      'review.newPerDay',
    ]);
  });
});

describe('words and search', () => {
  it('says where a value came from', () => {
    expect(sourceWords('preset', { preset: 'Club player' })).toBe('From the Club player preset');
    expect(sourceWords('opening', { opening: 'Italian Game' })).toBe('Set for the Italian Game');
    expect(sourceWords('opening')).toBe('Set for this opening');
    expect(sourceWords('default')).toBe('Default');
  });

  it('names values and explains them', () => {
    expect(valueWords(byKey['feedback.hints'], false)).toBe('not offered');
    expect(valueWords(byKey['feedback.speed'], 'slow')).toBe('slow');
    expect(valueWords(byKey['board.coordinates'], true)).toBe('on');
    expect(byKey['review.newPerDay'].explain?.(10)).toBe('About 70 new moves a week.');
  });

  it('finds settings by label, hint, key and synonyms', () => {
    expect(matchesSetting(byKey['feedback.speed'], 'delay')).toBe(true);
    expect(settingRows(registry, 'rare').map((d) => d.key)).toContain('level.includeRare');
    expect(settingRows(registry, '', 'basic').every((d) => d.level === 'basic')).toBe(true);
    expect(settingRows(registry, '').some((d) => d.key === 'preset')).toBe(false);
  });
});

describe('stored learner settings', () => {
  it('reads registry rows, opening rows, and v1 names as aliases', () => {
    const stored = readStoredSettings(registry, {
      'review.sessionSize': '30',
      'opening:italian-game:level.includeRare': 'true',
      newCardsPerDay: '7',
      minPopularityPercent: '2',
      enrolled: '["italian-game"]',
      includeRareLines: 'true',
      'introduced:2026-11-02': '{"count":3}',
      'board.theme': '"blue"',
    });
    expect(stored.you).toEqual({
      'review.sessionSize': 30,
      'review.newPerDay': 7,
      'level.coverageTarget': 0.02,
      repertoire: ['italian-game'],
      'level.includeRare': true,
    });
    expect(stored.openings).toEqual({ 'italian-game': { 'level.includeRare': true } });
  });

  it('prefers the registry key over its v1 alias', () => {
    expect(readStoredSettings(registry, { 'review.newPerDay': '12', newCardsPerDay: '7' }).you).toEqual({
      'review.newPerDay': 12,
    });
  });
});
