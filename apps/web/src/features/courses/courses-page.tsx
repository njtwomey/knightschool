import {
  courseProgress,
  inStudyOrder,
  roleOf,
  type OpeningGroup,
  type OpeningIndexEntry,
  type Side,
  type Tier,
} from '@knightschool/core';
import { GitFork } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SIDE_FILTER_OPTIONS } from '@/components/filter-options';
import { FilterToggle } from '@/components/filter-toggle';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ABOVE_ROW_LINK, RowLink, SortableHeader, type SortColumn } from '@/components/sortable-table';
import { useSort } from '@/hooks/use-sort';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useCatalog } from '@/data/catalog-store';
import { useProgress } from '@/data/progress-store';
import { to } from '@/router/location';
import { courseHref } from '@/router/hrefs';

const TIER: Record<Tier, string> = { 1: 'Study first', 2: 'Next', 3: 'Alternative' };

type Row = {
  course: OpeningIndexEntry;
  order: number;
  opening: string;
  role: 'play' | 'against';
  learned: number;
  total: number;
};
type SortKey = 'order' | 'name' | 'side' | 'tier' | 'opening' | 'trigger' | 'lines' | 'learned';

const COLUMNS: SortColumn<SortKey>[] = [
  { key: 'name', label: 'Course' },
  { key: 'side', label: 'Side' },
  { key: 'tier', label: 'Tier' },
  { key: 'opening', label: 'Opening' },
  { key: 'trigger', label: 'Starts with' },
  { key: 'lines', label: 'Lines', className: 'text-right' },
  { key: 'learned', label: 'Learned' },
];

const compare: Record<SortKey, (a: Row, b: Row) => number> = {
  order: (a, b) => a.order - b.order,
  name: (a, b) => a.course.name.localeCompare(b.course.name),
  side: (a, b) => a.course.side.localeCompare(b.course.side),
  tier: (a, b) => a.course.tier - b.course.tier,
  opening: (a, b) => a.opening.localeCompare(b.opening),
  trigger: (a, b) => a.course.trigger.localeCompare(b.course.trigger),
  lines: (a, b) => a.course.lines.length - b.course.lines.length,
  learned: (a, b) => (a.total ? a.learned / a.total : 0) - (b.total ? b.learned / b.total : 0),
};

function rowsOf(index: OpeningIndexEntry[], openings: OpeningGroup[], learned: Record<string, number>): Row[] {
  return inStudyOrder(index).map((course, order) => {
    const progress = courseProgress([course], learned);
    return {
      course,
      order,
      opening: openings.find((candidate) => candidate.id === course.opening)?.name ?? course.opening,
      role: roleOf(course, openings),
      learned: progress.learned,
      total: progress.total,
    };
  });
}

/**
 * Every course as one plain table (/courses): a row per course, in study order to begin with, filtered by the side you
 * play and sorted by any column (click its heading). A row opens the course. Search is for searching; this is the list.
 */
export function CoursesPage() {
  const index = useCatalog((state) => state.index);
  const openings = useCatalog((state) => state.openings);
  const status = useCatalog((state) => state.indexStatus);
  const error = useCatalog((state) => state.indexError);
  const learned = useProgress((state) => state.learned);
  useEffect(() => {
    void useProgress.getState().refresh();
  }, []);
  const [side, setSide] = useState<Side | 'all'>('all');
  const { sort, sortBy, sorted } = useSort(compare, {
    initial: { key: 'order', descending: false },
    fallback: compare.order,
  });

  const rows = sorted(rowsOf(index, openings, learned).filter((row) => side === 'all' || row.course.side === side));
  const total = courseProgress(index, learned);

  return (
    <Page className="gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-muted-foreground">
            {index.length > 0
              ? `${index.length} courses, ${total.learned} of ${total.total} moves learned.`
              : 'Every course in one table.'}
          </p>
        </div>
        <FilterToggle value={side} onChange={setSide} options={SIDE_FILTER_OPTIONS} label="Which side you play" />
      </header>
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Could not load the courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status !== 'ready' && status !== 'error' && <Skeleton className="h-96" />}
      {status === 'ready' && (
        <div className="rounded-xl border">
          <Table>
            <SortableHeader columns={COLUMNS} sort={sort} onSort={sortBy} trailing={['Tree']} />
            <TableBody>
              {rows.map(({ course, opening, role, learned: done, total: all }) => {
                const share = all ? done / all : 0;
                return (
                  <TableRow key={course.id} className="relative">
                    <TableCell className="min-w-40 whitespace-normal font-medium">
                      <RowLink href={courseHref(course.id)}>{course.name}</RowLink>
                    </TableCell>
                    <TableCell className="capitalize">{course.side}</TableCell>
                    <TableCell>
                      <Badge variant={course.tier === 1 ? 'default' : 'outline'} className="font-normal">
                        {TIER[course.tier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-40 whitespace-normal text-sm">
                      {opening}{' '}
                      <span className="text-muted-foreground">({role === 'play' ? 'you play it' : 'you meet it'})</span>
                    </TableCell>
                    <TableCell className="min-w-32 whitespace-normal font-mono text-xs">
                      {course.trigger || 'the first move'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{course.lines.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {done}/{all}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm" className={`h-7 ${ABOVE_ROW_LINK}`}>
                        <a href={to(courseHref(course.id, 'tree'))} aria-label={`The tree of ${course.name}`}>
                          <GitFork aria-hidden /> Tree
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  );
}
