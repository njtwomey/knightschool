import { ArrowDown, ArrowUp, ArrowUpDown, Copy, Eye, PenLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Page } from '@/components/page';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { courseHref } from '@/features/course/tabs';
import { navigate, to } from '@/router/location';
import { NewCourseDialog } from './course-form';
import { entryId, lastEdited, problemsFor, shortTime } from './helpers';
import { ImportContributionDialog } from './publish';
import { AuthorGate, CreateNotices, ExportButton, UndoButton } from './shell';
import { draftCourses, useAuthor, type DraftCourse } from './store';
import { createHref } from './tabs';

type Row = { course: DraftCourse; lines: number; edited: string; problems: string[] };
type SortKey = 'name' | 'side' | 'lines' | 'edited' | 'status';
const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'name', label: 'Course' },
  { key: 'side', label: 'Side' },
  { key: 'lines', label: 'Lines', className: 'text-right' },
  { key: 'edited', label: 'Last edited' },
  { key: 'status', label: 'Status' },
];
const compare: Record<SortKey, (a: Row, b: Row) => number> = {
  name: (a, b) => a.course.manifest.name.localeCompare(b.course.manifest.name),
  side: (a, b) => a.course.manifest.side.localeCompare(b.course.manifest.side),
  lines: (a, b) => a.lines - b.lines,
  edited: (a, b) => a.edited.localeCompare(b.edited),
  status: (a, b) => a.problems.length - b.problems.length,
};

/** Create (`/create`): the courses you write, in one table, with what you can do to them. */
export function CreatePage() {
  return (
    <AuthorGate>
      <CreateList />
    </AuthorGate>
  );
}

function CreateList() {
  const { rows, build } = useAuthor();
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: 'edited', descending: true });
  const data: Row[] = draftCourses(rows).map((course) => {
    const ids = [course.id, ...course.manifest.lines.map(entryId)];
    return {
      course,
      lines: course.manifest.lines.length,
      edited: lastEdited(rows, course),
      problems: problemsFor(build, ids).map((problem) => `${problem.id}: ${problem.message}`),
    };
  });
  const sorted = [...data].sort((a, b) => compare[sort.key](a, b) * (sort.descending ? -1 : 1));
  const sortBy = (key: SortKey) =>
    setSort((current) => ({ key, descending: current.key === key ? !current.descending : key === 'edited' }));

  return (
    <Page>
      <header className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2 className="text-3xl font-semibold tracking-tight">Create</h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Write your own courses: play the lines, branch, comment and tag the moves, order the path, and propose
              them for the app. They are kept in this browser and work like any other course.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NewCourseDialog />
            <ImportContributionDialog />
            <UndoButton />
            <ExportButton />
          </div>
        </div>
      </header>
      <CreateNotices />
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses yet. Start one with New course.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
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
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(({ course, lines, edited, problems }) => (
                <TableRow
                  key={course.id}
                  className="cursor-pointer"
                  onClick={(event) => {
                    if (
                      !(event.target as HTMLElement).closest(
                        'a, button, input, form, [role=dialog], [role=alertdialog], [role=option], [role=listbox]',
                      )
                    )
                      navigate(createHref(course.id));
                  }}
                >
                  <TableCell className="min-w-40 whitespace-normal font-medium">
                    <a href={to(createHref(course.id))} className="hover:underline">
                      {course.manifest.name}
                    </a>
                  </TableCell>
                  <TableCell className="capitalize">{course.manifest.side}</TableCell>
                  <TableCell className="text-right tabular-nums">{lines}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{shortTime(edited)}</TableCell>
                  <TableCell>
                    {problems.length === 0 ? (
                      <Badge variant="secondary">Ready</Badge>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" tabIndex={0}>
                            {problems.length} {problems.length === 1 ? 'problem' : 'problems'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">{problems.join(' ')}</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <RowActions course={course} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  );
}

/** Open, view as a learner, copy and delete one course. */
function RowActions({ course }: { course: DraftCourse }) {
  const name = course.manifest.name;
  return (
    <div className="flex justify-end gap-0.5">
      <Button asChild size="icon" variant="ghost" className="size-8" title="Open">
        <a href={to(createHref(course.id))} aria-label={`Open ${name}`}>
          <PenLine aria-hidden />
        </a>
      </Button>
      <Button asChild size="icon" variant="ghost" className="size-8" title="View as a learner">
        <a href={to(courseHref(course.id))} aria-label={`View ${name} as a learner`}>
          <Eye aria-hidden />
        </a>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        title="Make a copy"
        aria-label={`Copy ${name}`}
        onClick={() => void useAuthor.getState().duplicateCourse(course.id)}
      >
        <Copy aria-hidden />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" title="Delete" aria-label={`Delete ${name}`}>
            <Trash2 aria-hidden />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its lines go with it, unless another of your courses lists them. Undo brings it all back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void useAuthor.getState().deleteCourse(course.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
