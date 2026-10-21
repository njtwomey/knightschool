import {
  courseProgress,
  inStudyOrder,
  roleOf,
  type OpeningGroup,
  type OpeningIndexEntry,
  type Side,
  type Tier,
} from '@knightschool/core';
import { ArrowDown, ArrowUp, ArrowUpDown, GitFork } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBrowse } from '@/features/browse/store';
import { courseHref } from '@/features/course/tabs';
import { useProgress } from '@/features/courses/progress';
import { navigate, to } from '@/router/location';

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

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
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
 * play and sorted by any column (click its heading). A row opens the course. Browse is for searching; this is the list.
 */
export function CoursesPage() {
  const index = useBrowse((state) => state.index);
  const openings = useBrowse((state) => state.openings);
  const status = useBrowse((state) => state.indexStatus);
  const error = useBrowse((state) => state.indexError);
  const learned = useProgress((state) => state.learned);
  useEffect(() => {
    void useProgress.getState().refresh();
  }, []);
  const [side, setSide] = useState<Side | 'both'>('both');
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'order', descending: false });

  const rows = rowsOf(index, openings, learned)
    .filter((row) => side === 'both' || row.course.side === side)
    .sort((a, b) => (sort.descending ? -1 : 1) * compare[sort.key](a, b) || a.order - b.order);
  const total = courseProgress(index, learned);
  // A heading sorts by its column; again reverses it; a third time goes back to the study order.
  const sortBy = (key: SortKey) =>
    setSort((current) =>
      current.key !== key
        ? { key, descending: false }
        : current.descending
          ? { key: 'order', descending: false }
          : { key, descending: true },
    );

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
        <ToggleGroup
          type="single"
          variant="outline"
          value={side}
          onValueChange={(value) => value && setSide(value as Side | 'both')}
          aria-label="Which side you play"
        >
          <ToggleGroupItem value="white" className="px-3">
            White
          </ToggleGroupItem>
          <ToggleGroupItem value="black" className="px-3">
            Black
          </ToggleGroupItem>
          <ToggleGroupItem value="both" className="px-3">
            Both
          </ToggleGroupItem>
        </ToggleGroup>
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
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => {
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
                        onClick={() => sortBy(column.key)}
                      >
                        {column.label}
                        <Icon className={active ? '' : 'opacity-40'} aria-hidden />
                      </Button>
                    </TableHead>
                  );
                })}
                <TableHead>
                  <span className="sr-only">Tree</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ course, opening, role, learned: done, total: all }) => {
                const share = all ? done / all : 0;
                return (
                  <TableRow
                    key={course.id}
                    className="cursor-pointer"
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest('a, button')) navigate(courseHref(course.id));
                    }}
                  >
                    <TableCell className="min-w-40 whitespace-normal font-medium">
                      <a href={to(courseHref(course.id))} className="hover:underline">
                        {course.name}
                      </a>
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
                      <Button asChild variant="ghost" size="sm" className="h-7">
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
