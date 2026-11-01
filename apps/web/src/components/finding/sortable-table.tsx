import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { nextSort, type SortState } from './sort';

/** Put on a control inside a row with a `RowLink`, so it keeps its own click above the stretched link. */
export const ABOVE_ROW_LINK = 'relative z-10';

/**
 * A link stretched over its row or card, so a click anywhere opens it while the row's own controls keep theirs. One
 * focus stop, named by its text. Never an `onClick` on a row.
 */
export function RowLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={cn(
        'font-medium text-foreground no-underline outline-none after:absolute after:inset-0 after:content-[""]',
        'focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring',
        className,
      )}
    >
      {children}
    </a>
  );
}

/** A sortable heading: a button with an arrow for the sort, `aria-sort` on the cell. */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  align?: 'left' | 'right';
}) {
  const active = sort?.key === sortKey ? sort.direction : null;
  const Icon = active === 'asc' ? ArrowUp : active === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <TableHead
      aria-sort={active === 'asc' ? 'ascending' : active === 'desc' ? 'descending' : undefined}
      className={align === 'right' ? 'text-right' : undefined}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className={cn('font-medium', align === 'right' ? '-mr-2.5 flex-row-reverse' : '-ml-2.5')}
      >
        {label}
        <Icon className={cn(!active && 'opacity-40')} aria-hidden />
      </Button>
    </TableHead>
  );
}

export type Column<R, K extends string = string> = {
  key: K;
  heading: string;
  /** How to compare two rows; a column without one does not sort. */
  compare?: (a: R, b: R) => number;
  cell: (row: R) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  /** Hidden in the phone card (the card's title already says it). */
  hideOnCard?: boolean;
};

export type SortableTableProps<R, K extends string> = {
  columns: Column<R, K>[];
  /** In the table's own order (study order, newest edit first). */
  rows: R[];
  rowKey: (row: R) => string;
  /** The row's address: its main column's text becomes the stretched link. */
  rowHref?: (row: R) => string;
  /** The column whose cell is the row's link and the card's title. */
  titleColumn: K;
  /** A column that is the table's own order: two states only. */
  ownOrder?: K;
  /** How ties are broken after the chosen column; the own order follows either way. */
  fallback?: (a: R, b: R) => number;
  /** Icon actions at the end of each row, above the row link. */
  actions?: (row: R) => ReactNode;
  /** Filters (filter toggles, a compact search box) above the table. */
  filters?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  label: string;
  className?: string;
};

/**
 * A table that sorts up, down, then back to its own order, with rows that are links; on a phone each row becomes a card
 * (docs/v2/components/sortable-table.md).
 */
export function SortableTable<R, K extends string>({
  columns,
  rows,
  rowKey,
  rowHref,
  titleColumn,
  ownOrder,
  fallback,
  actions,
  filters,
  empty = 'Nothing here.',
  loading,
  label,
  className,
}: SortableTableProps<R, K>) {
  const [sort, setSort] = useState<SortState<K>>(null);
  const sorted = useMemo(() => {
    const column = sort ? columns.find((c) => c.key === sort.key) : undefined;
    if (!column?.compare) return rows;
    const sign = sort!.direction === 'asc' ? 1 : -1;
    const order = new Map(rows.map((row, i) => [row, i]));
    return [...rows].sort(
      (a, b) => sign * column.compare!(a, b) || (fallback?.(a, b) ?? 0) || order.get(a)! - order.get(b)!,
    );
  }, [rows, columns, sort, fallback]);
  const onSort = (key: K) => setSort((current) => nextSort(current, key, ownOrder));
  // A sentence becomes the shared empty state; a page can pass its own, with an action.
  const emptyShown =
    typeof empty === 'string' ? (
      <EmptyState kind="no-match" size="part" text={empty} className="justify-center" />
    ) : (
      empty
    );

  const title = (row: R) => {
    const column = columns.find((c) => c.key === titleColumn)!;
    return rowHref ? <RowLink href={rowHref(row)}>{column.cell(row)}</RowLink> : column.cell(row);
  };
  const cell = (row: R, column: Column<R, K>) => (column.key === titleColumn ? title(row) : column.cell(row));

  return (
    <div className={cn('grid gap-3', className)}>
      {filters ? <div className="flex flex-wrap items-center gap-3">{filters}</div> : null}

      {/* Wide screens: the table. */}
      <div className="hidden rounded-md border md:block">
        <Table aria-label={label}>
          <TableHeader>
            <TableRow>
              {columns.map((column) =>
                column.compare ? (
                  <SortableHeader
                    key={column.key}
                    label={column.heading}
                    sortKey={column.key}
                    sort={sort}
                    onSort={onSort}
                    align={column.align}
                  />
                ) : (
                  <TableHead key={column.key} className={column.align === 'right' ? 'text-right' : undefined}>
                    {column.heading}
                  </TableHead>
                ),
              )}
              {actions ? <TableHead className="sr-only">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [0, 1, 2].map((i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                  {actions ? <TableCell /> : null}
                </TableRow>
              ))
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="py-6 text-center text-muted-foreground"
                >
                  {emptyShown}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((row) => (
                <TableRow key={rowKey(row)} className="relative">
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(column.align === 'right' && 'text-right tabular-nums', column.className)}
                    >
                      {cell(row, column)}
                    </TableCell>
                  ))}
                  {actions ? (
                    <TableCell className="w-0 text-right whitespace-nowrap">
                      <div className={cn('inline-flex gap-0.5', ABOVE_ROW_LINK)}>{actions(row)}</div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Phones: each row a card, never a table scrolling sideways. */}
      <ul className="grid gap-2 md:hidden" aria-label={label}>
        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)
        ) : sorted.length === 0 ? (
          <li className="rounded-lg border p-4 text-sm text-muted-foreground">{emptyShown}</li>
        ) : (
          sorted.map((row) => (
            <li
              key={rowKey(row)}
              className="relative grid gap-1.5 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">{title(row)}</div>
                {actions ? <div className={cn('flex shrink-0 gap-0.5', ABOVE_ROW_LINK)}>{actions(row)}</div> : null}
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
                {columns
                  .filter((column) => column.key !== titleColumn && !column.hideOnCard)
                  .map((column) => (
                    <div key={column.key} className="contents">
                      <dt className="text-muted-foreground">{column.heading}</dt>
                      <dd>{column.cell(row)}</dd>
                    </div>
                  ))}
              </dl>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
