import { describe, expect, it } from 'vitest';
import { lastDays, localDay, previousDay } from './days';

describe('local days', () => {
  it('names the day by the local calendar', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('steps back over month and year ends and lists the last days oldest first', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(lastDays(3, new Date(2026, 2, 1, 12))).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
});
