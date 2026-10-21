import { courseProgress, inStudyOrder, roleOf, type Side, type Tier } from '@knightschool/core';
import { GitFork } from 'lucide-react';
import { Fragment, useEffect } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBrowse } from '@/features/browse/store';
import { courseHref } from '@/features/course/tabs';
import { useProgress } from '@/features/courses/progress';
import { to } from '@/router/location';

const TIER: Record<Tier, string> = { 1: 'Study first', 2: 'Next', 3: 'Alternative' };
const SIDES: { side: Side; title: string }[] = [
  { side: 'white', title: 'You play White' },
  { side: 'black', title: 'You play Black' },
];

/**
 * Every course as one plain table (/courses), for seeing at a glance what there is and how it hangs together: grouped
 * by the side you play, then by tier and study order, with the opening each belongs to, the moves it starts from, how
 * many lines it has and how far through it you are. Browse is for searching; this is the list.
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
  const total = courseProgress(index, learned);

  return (
    <Page className="gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <p className="text-muted-foreground">
          {index.length > 0
            ? `${index.length} courses, ${total.learned} of ${total.total} moves learned.`
            : 'Every course, by the side you play.'}
        </p>
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
                <TableHead>Course</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Opening</TableHead>
                <TableHead>Starts with</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead>Learned</TableHead>
                <TableHead>
                  <span className="sr-only">Tree</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SIDES.map(({ side, title }) => {
                const courses = inStudyOrder(index.filter((course) => course.side === side)).sort(
                  (a, b) => a.tier - b.tier,
                );
                return (
                  <Fragment key={side}>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableCell colSpan={7} className="py-2 font-semibold">
                        {title} <span className="font-normal text-muted-foreground">({courses.length})</span>
                      </TableCell>
                    </TableRow>
                    {courses.map((course) => {
                      const progress = courseProgress([course], learned);
                      const share = progress.total ? progress.learned / progress.total : 0;
                      const opening = openings.find((candidate) => candidate.id === course.opening);
                      const role = roleOf(course, openings);
                      return (
                        <TableRow key={course.id}>
                          <TableCell className="min-w-40 whitespace-normal font-medium">
                            <a href={to(courseHref(course.id))} className="hover:underline">
                              {course.name}
                            </a>
                          </TableCell>
                          <TableCell>
                            <Badge variant={course.tier === 1 ? 'default' : 'outline'} className="font-normal">
                              {TIER[course.tier]}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-40 whitespace-normal text-sm">
                            {opening?.name ?? course.opening}{' '}
                            <span className="text-muted-foreground">
                              ({role === 'play' ? 'you play it' : 'you meet it'})
                            </span>
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
                                {progress.learned}/{progress.total}
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
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Page>
  );
}
