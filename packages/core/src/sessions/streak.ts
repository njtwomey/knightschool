/** A date's day in the learner's own time zone, `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const dayNumber = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86_400_000);
};

export type StreakFacts = { days: number; longest: number; doneToday: boolean; since?: string };

/**
 * Days in a row with at least one answer (docs/v2/components/streak.md), from the times of the answers. Today not yet
 * practised does not break the streak until the day is over.
 */
export function practiceStreak(times: readonly string[], now: Date): StreakFacts {
  const days = [...new Set(times.map((time) => dayNumber(dayKey(new Date(time)))))].sort((a, b) => a - b);
  const today = dayNumber(dayKey(now));
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1]! + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const doneToday = days.at(-1) === today;
  const last = days.at(-1);
  if (last === undefined || last < today - 1) return { days: 0, longest, doneToday: false };
  let current = 1;
  for (let i = days.length - 1; i > 0 && days[i] === days[i - 1]! + 1; i--) current += 1;
  const first = days[days.length - current]!;
  const since = new Date(first * 86_400_000);
  return {
    days: current,
    longest,
    doneToday,
    since: `${since.getUTCFullYear()}-${String(since.getUTCMonth() + 1).padStart(2, '0')}-${String(since.getUTCDate()).padStart(2, '0')}`,
  };
}
