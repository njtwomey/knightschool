import { openMemoryStorage } from '@knightschool/storage/testing';
import { describe, expect, it } from 'vitest';
import {
  addIntroducedToday,
  getEnrolled,
  getIntroducedToday,
  getNewPerDay,
  lastDays,
  localDay,
  previousDay,
  setEnrolled,
  setNewPerDay,
} from './training-settings';

const now = new Date(2026, 9, 13, 23, 30); // local time, late evening

describe('training settings', () => {
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

  it('counts introductions per local day', async () => {
    const { storage } = await openMemoryStorage();
    expect(await getIntroducedToday(storage, now)).toBe(0);
    await addIntroducedToday(storage, 4, now);
    await addIntroducedToday(storage, 3, now);
    expect(await getIntroducedToday(storage, now)).toBe(7);
    expect(await getIntroducedToday(storage, new Date(2026, 9, 14, 0, 5))).toBe(0);
  });

  it('names the day by the local calendar', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('steps back over month and year ends and lists the last days oldest first', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(lastDays(3, new Date(2026, 2, 1, 12))).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
});
