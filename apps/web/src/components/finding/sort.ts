export type SortDirection = 'asc' | 'desc';
export type SortState<K extends string> = { key: K; direction: SortDirection } | null;

/** Up, then down, then back to the table's own order; a column that is the table's own order has just two states. */
export function nextSort<K extends string>(current: SortState<K>, key: K, ownOrder?: K): SortState<K> {
  if (!current || current.key !== key) return { key, direction: 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return key === ownOrder ? { key, direction: 'asc' } : null;
}

/** The order every list reads in by default: alphabetical, ignoring case, with numbers in number order ("9.Nf3" before "10.Be3"). */
export const alphabetical = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
