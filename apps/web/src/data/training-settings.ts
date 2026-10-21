import { DEFAULT_NEW_CARDS_PER_DAY, MIN_POPULARITY_FOR_CARD, type CardOptions } from '@knightschool/core';
import type { Storage } from '@knightschool/storage';
import { localDay } from '@/lib/days';

// Training choices live in the settings table, so they travel with an export.

const ENROLLED = 'enrolled';
const NEW_PER_DAY = 'newCardsPerDay';
const INCLUDE_RARE = 'includeRareLines';
const MIN_POPULARITY = 'minPopularityPercent';
const introducedKey = (day: string) => `introduced:${day}`;

/**
 * The courses being learned. Pass the ids of the courses that exist today (`known`) to drop any that have since been
 * renamed or removed: a stale id would otherwise make the quiz try to load a course that is not there.
 */
export async function getEnrolled(storage: Storage, known?: readonly string[]): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse((await storage.settings.get(ENROLLED)) ?? '[]');
    const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    return known ? ids.filter((id) => known.includes(id)) : ids;
  } catch {
    return [];
  }
}

export async function setEnrolled(storage: Storage, ids: string[], now: Date): Promise<void> {
  await storage.settings.set(ENROLLED, JSON.stringify(ids), now.toISOString());
}

export async function getNewPerDay(storage: Storage): Promise<number> {
  const value = Number(await storage.settings.get(NEW_PER_DAY));
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_NEW_CARDS_PER_DAY;
}

export async function setNewPerDay(storage: Storage, value: number, now: Date): Promise<void> {
  await storage.settings.set(NEW_PER_DAY, String(value), now.toISOString());
}

export async function getIntroducedToday(storage: Storage, now: Date): Promise<number> {
  return Number((await storage.settings.get(introducedKey(localDay(now)))) ?? 0) || 0;
}

export async function addIntroducedToday(storage: Storage, count: number, now: Date): Promise<void> {
  const total = (await getIntroducedToday(storage, now)) + count;
  await storage.settings.set(introducedKey(localDay(now)), String(total), now.toISOString());
}

/** Whether lines marked `rare` in a course earn cards. Off by default: they are met too seldom to be worth the time. */
export async function getIncludeRare(storage: Storage): Promise<boolean> {
  return (await storage.settings.get(INCLUDE_RARE)) === 'true';
}

export async function setIncludeRare(storage: Storage, value: boolean, now: Date): Promise<void> {
  await storage.settings.set(INCLUDE_RARE, String(value), now.toISOString());
}

/** The share of games (in percent) a sideline position must reach to earn a card. 0 means no cut. */
const DEFAULT_MIN_POPULARITY_PERCENT = MIN_POPULARITY_FOR_CARD * 100;

export async function getMinPopularityPercent(storage: Storage): Promise<number> {
  const stored = await storage.settings.get(MIN_POPULARITY);
  const value = stored === undefined ? NaN : Number(stored);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_MIN_POPULARITY_PERCENT;
}

export async function setMinPopularityPercent(storage: Storage, percent: number, now: Date): Promise<void> {
  await storage.settings.set(MIN_POPULARITY, String(percent), now.toISOString());
}

/** Everything that decides which positions earn cards, from the learner's settings. */
export async function getCardOptions(storage: Storage): Promise<CardOptions> {
  return {
    includeRare: await getIncludeRare(storage),
    minPopularity: (await getMinPopularityPercent(storage)) / 100,
  };
}
