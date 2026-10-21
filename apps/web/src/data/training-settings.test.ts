import { openMemoryStorage } from '@knightschool/storage/testing';
import { describe, expect, it } from 'vitest';
import {
  addIntroducedToday,
  getCardOptions,
  getEnrolled,
  getMinPopularityPercent,
  getIntroducedToday,
  getNewPerDay,
  setEnrolled,
  setMinPopularityPercent,
  setNewPerDay,
} from './training-settings';

const now = new Date(2026, 9, 13, 23, 30); // local time, late evening

describe('training settings', () => {
  it('drops enrolled courses that no longer exist', async () => {
    const { storage } = await openMemoryStorage();
    await setEnrolled(storage, ['italian-game', 'vs-e5-italian', 'qgd'], now);
    expect(await getEnrolled(storage, ['vs-e5-italian', 'qgd', 'london'])).toEqual(['vs-e5-italian', 'qgd']);
    expect(await getEnrolled(storage)).toEqual(['italian-game', 'vs-e5-italian', 'qgd']);
  });

  it('keeps the enrolled openings, ignoring a damaged value', async () => {
    const { storage } = await openMemoryStorage();
    expect(await getEnrolled(storage)).toEqual([]);
    await setEnrolled(storage, ['italian-game', 'caro-kann'], now);
    expect(await getEnrolled(storage)).toEqual(['italian-game', 'caro-kann']);
    await storage.settings.set('enrolled', '{"not":"a list"}', now.toISOString());
    expect(await getEnrolled(storage)).toEqual([]);
    await storage.settings.set('enrolled', 'garbage', now.toISOString());
    expect(await getEnrolled(storage)).toEqual([]);
  });

  it('defaults to ten new cards a day and accepts a choice, including none', async () => {
    const { storage } = await openMemoryStorage();
    expect(await getNewPerDay(storage)).toBe(10);
    await setNewPerDay(storage, 0, now);
    expect(await getNewPerDay(storage)).toBe(0);
    await storage.settings.set('newCardsPerDay', '-3', now.toISOString());
    expect(await getNewPerDay(storage)).toBe(10);
  });

  it('cuts sidelines below 5% by default, accepts another share or none, and ignores a damaged value', async () => {
    const { storage } = await openMemoryStorage();
    expect(await getMinPopularityPercent(storage)).toBe(5);
    expect(await getCardOptions(storage)).toEqual({ includeRare: false, minPopularity: 0.05 });
    await setMinPopularityPercent(storage, 0, now);
    expect(await getMinPopularityPercent(storage)).toBe(0);
    await setMinPopularityPercent(storage, 10, now);
    expect((await getCardOptions(storage)).minPopularity).toBeCloseTo(0.1);
    await storage.settings.set('minPopularityPercent', 'lots', now.toISOString());
    expect(await getMinPopularityPercent(storage)).toBe(5);
    await storage.settings.set('minPopularityPercent', '250', now.toISOString());
    expect(await getMinPopularityPercent(storage)).toBe(5);
  });

  it('counts introductions per local day', async () => {
    const { storage } = await openMemoryStorage();
    expect(await getIntroducedToday(storage, now)).toBe(0);
    await addIntroducedToday(storage, 4, now);
    await addIntroducedToday(storage, 3, now);
    expect(await getIntroducedToday(storage, now)).toBe(7);
    expect(await getIntroducedToday(storage, new Date(2026, 9, 14, 0, 5))).toBe(0);
  });
});
