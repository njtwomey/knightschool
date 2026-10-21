import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Sort } from '@/lib/sort';
import { to } from '@/router/location';

/** A sortable column: the key its comparator has, its heading, and classes for its cell (such as `text-right`). */
export type SortColumn<K extends string> = { key: K; label: string; className?: string };

/** The header row of a sortable table: a button per column, the active one with its arrow, then any plain headings. */
export function SortableHeader<K extends string>({
  columns,
  sort,
  onSort,
  trailing = [],
}: {
  columns: readonly SortColumn<K>[];
  sort: Sort<K>;
  onSort: (key: K) => void;
  /** Headings after the sortable ones, read only by screen readers (an actions column, say). */
  trailing?: readonly string[];
}) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => {
          const active = sort.key === column.key;
          const Icon = active ? (sort.descending ? ArrowDown : ArrowUp) : ArrowUpDown;
          return (
            <TableHead
              key={column.key}
              className={column.className}
              aria-sort={active ? (sort.descending ? 'descending' : 'ascending') : undefined}
            >
              <Button
                variant="ghost"
                size="sm"
                className={`-ml-2 h-7 px-2 font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}
                onClick={() => onSort(column.key)}
              >
                {column.label}
                <Icon className={active ? '' : 'opacity-40'} aria-hidden />
              </Button>
            </TableHead>
          );
        })}
        {trailing.map((label) => (
          <TableHead key={label}>
            <span className="sr-only">{label}</span>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/**
 * Lifts a cell's controls above a `RowLink`, so they still get their own clicks. Put it on anything interactive in a
 * row (or card) that has a stretched link.
 */
export const ABOVE_ROW_LINK = 'relative z-10';

/**
 * The link that makes a whole row (or card) open a page: its box is stretched over the nearest `relative` ancestor, so a
 * click anywhere in the row follows it, while the row's own buttons and links (marked `ABOVE_ROW_LINK`) keep theirs. The
 * row is still one link for the keyboard and for screen readers. With `onClick` instead of `href`, it picks the row.
 */
export function RowLink({
  href,
  onClick,
  label,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  /** Names the row when its text alone would not. */
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const stretched =
    'outline-none after:absolute after:inset-0 after:content-[""] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50';
  return href !== undefined ? (
    <a href={to(href)} aria-label={label} className={cn('font-medium hover:underline', stretched, className)}>
      {children}
    </a>
  ) : (
    <Button
      variant="link"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-auto justify-start p-0 text-left text-base font-semibold whitespace-normal text-foreground focus-visible:ring-0',
        stretched,
        className,
      )}
    >
      {children}
    </Button>
  );
}
