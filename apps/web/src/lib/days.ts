// Local calendar days as 'YYYY-MM-DD', which is what "per day" and "today" mean to the learner.

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
