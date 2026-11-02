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

/** One day of practice for the activity calendar: answers, those right, and the answers in each mode. */
export type ActivityDayFacts = { date: string; answers: number; right: number; modes: Record<string, number> };

/**
 * The days practised, from the attempts log (docs/v2/components/activity-calendar.md): every graded answer in any
 * mode, by the learner's local day, oldest first. Watching a step (mode `watch`) is not an answer.
 */
export function activityDays(attempts: readonly { at: string; mode: string; result: string }[]): ActivityDayFacts[] {
  const days = new Map<string, ActivityDayFacts>();
  for (const attempt of attempts) {
    if (attempt.mode === 'watch') continue;
    const date = dayKey(new Date(attempt.at));
    const day = days.get(date) ?? { date, answers: 0, right: 0, modes: {} };
    day.answers += 1;
    if (attempt.result === 'right') day.right += 1;
    day.modes[attempt.mode] = (day.modes[attempt.mode] ?? 0) + 1;
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}
