import { useState } from 'react';
import { nextSort, sortRows, type Compare, type Sort } from '@/lib/sort';

/**
 * A table's sort, kept in the component. `initial` is the table's own order (it need not be a column); a heading's
 * clicks go up, down and back to it (`nextSort`). Ties fall back to `fallback`. `SortableHeader` draws the headings.
 */
export function useSort<R, K extends string>(
  compare: Record<K, Compare<R>>,
  { initial, fallback }: { initial: Sort<NoInfer<K>>; fallback?: Compare<R> },
) {
  const [sort, setSort] = useState<Sort<K>>(initial);
  return {
    sort,
    sortBy: (key: K) => setSort((current) => nextSort(current, key, initial)),
    sorted: (rows: readonly R[]) => sortRows(rows, compare, sort, fallback),
  };
}
