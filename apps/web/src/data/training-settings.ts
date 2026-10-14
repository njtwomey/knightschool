import { DEFAULT_NEW_CARDS_PER_DAY, MIN_POPULARITY_FOR_CARD, type CardOptions } from '@knightschool/core';
import type { Storage } from '@knightschool/storage';

// Training choices live in the settings table, so they travel with an export.

const ENROLLED = 'enrolled';
const NEW_PER_DAY = 'newCardsPerDay';
const INCLUDE_RARE = 'includeRareLines';
const MIN_POPULARITY = 'minPopularityPercent';
const introducedKey = (day: string) => `introduced:${day}`;

/** The learner's local calendar day, which is what "per day" means to them. */
export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day before a local calendar day ("2026-03-01" gives "2026-02-28"). */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return localDay(new Date(y, m - 1, d - 1));
}

/** The last `count` local days ending today, oldest first. */
export function lastDays(count: number, now: Date): string[] {
  const days = [localDay(now)];
  while (days.length < count) days.unshift(previousDay(days[0]!));
  return days;
}

export async function getEnrolled(storage: Storage): Promise<string[]> {
  try {
    const parsed: unknown = JSON.parse((await storage.settings.get(ENROLLED)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
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
export const DEFAULT_MIN_POPULARITY_PERCENT = MIN_POPULARITY_FOR_CARD * 100;

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
