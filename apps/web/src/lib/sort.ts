// How a table sorts: by a column, up or down, and back to the table's own order on the third click.

export type Compare<R> = (a: R, b: R) => number;

/** A table's sort: which key, and whether it is reversed. */
export type Sort<K extends string> = { key: K; descending: boolean };

/**
 * The sort after a click on a column's heading. A new column sorts up; a second click reverses it; a third goes back to
 * the table's own order (`initial`). A column that is already the table's own order has just the two directions: its
 * first click reverses the default, its second puts the default back.
 */
export function nextSort<K extends string>(current: Sort<K>, key: K, initial: Sort<K>): Sort<K> {
  if (current.key !== key) return key === initial.key ? initial : { key, descending: false };
  const first = key === initial.key ? initial.descending : false;
  return current.descending === first ? { key, descending: !first } : initial;
}

/** The rows in the order of `sort`; ties fall back to `fallback`, then to the order they came in. */
export function sortRows<R, K extends string>(
  rows: readonly R[],
  compare: Record<K, Compare<R>>,
  sort: Sort<K>,
  fallback?: Compare<R>,
): R[] {
  const sign = sort.descending ? -1 : 1;
  return [...rows].sort((a, b) => sign * compare[sort.key](a, b) || (fallback?.(a, b) ?? 0));
}
