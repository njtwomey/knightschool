import { Page } from '@/components/page';
import { guessSummary, nextCourses, planIntroductions, type OpeningIndexEntry } from '@knightschool/core';
import { ArrowRight, Play, Telescope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BoardThumb } from '@/components/board/board-thumb';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { loadOpening } from '@/data/content';
import { useStorage } from '@/data/storage';
import { getCardOptions, getEnrolled, getIntroducedToday, getNewPerDay } from '@/data/training-settings';
import { useCatalog } from '@/data/catalog-store';
import { CourseCard } from '@/features/search/course-card';
import { percent, useProgress } from '@/data/progress-store';
import { to } from '@/router/location';
import { courseHref } from '@/router/hrefs';
import { errorText } from '@/lib/errors';

type Row = { course: OpeningIndexEntry; due: number; fresh: number };

/** Due counts per enrolled course, and how many new cards today's allowance would add. */
async function loadRows(index: OpeningIndexEntry[]): Promise<Row[]> {
  const storage = useStorage.getState().storage!.storage;
  const now = new Date();
  const enrolled = (await getEnrolled(storage)).flatMap((id) => index.find((entry) => entry.id === id) ?? []);
  const quota = Math.max(0, (await getNewPerDay(storage)) - (await getIntroducedToday(storage, now)));
  const contents = await Promise.all(enrolled.map((entry) => loadOpening(entry.id)));
  const courses = await Promise.all(
    contents.map(async (content) => ({
      content,
      cards: await storage.cards.byOpening(content.opening.id),
      reviews: await storage.reviews.byOpening(content.opening.id),
    })),
  );
  const fresh = planIntroductions(courses, quota, now, await getCardOptions(storage));
  return Promise.all(
    enrolled.map(async (course) => ({
      course,
      due: await storage.cards.countDue(now.toISOString(), course.id),
      fresh: fresh.filter((card) => card.openingId === course.id).length,
    })),
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function OverviewPage() {
  const status = useStorage((state) => state.status);
  const storage = useStorage((state) => state.storage);
  const { index, openings, prerequisites, indexStatus } = useCatalog();
  const learned = useProgress((state) => state.learned);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [guess, setGuess] = useState<ReturnType<typeof guessSummary> | null>(null);

  useEffect(() => {
    if (!storage || indexStatus !== 'ready') return;
    let cancelled = false;
    void useProgress.getState().refresh();
    loadRows(index)
      .then((loaded) => !cancelled && setRows(loaded))
      .catch((caught: unknown) => !cancelled && setFailure(errorText(caught)));
    return () => {
      cancelled = true;
    };
  }, [storage, index, indexStatus]);

  // How Name That Opening went this week, for its card.
  useEffect(() => {
    if (!storage) return;
    let cancelled = false;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    storage.storage.guessAttempts
      .since(since)
      .then((attempts) => !cancelled && setGuess(guessSummary(attempts)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const due = rows?.reduce((sum, row) => sum + row.due, 0) ?? 0;
  const fresh = rows?.reduce((sum, row) => sum + row.fresh, 0) ?? 0;
  const total = due + fresh;
  const known = Object.values(learned).reduce((sum, n) => sum + n, 0);
  // The next courses in the study order whose prerequisites you have started.
  const suggestions = nextCourses(
    index.filter((course) => !rows?.some((row) => row.course.id === course.id)),
    prerequisites,
    learned,
    2,
  );
  const unavailable = status === 'paused' || status === 'unavailable' || status === 'error';

  return (
    <Page className="gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-3xl font-semibold tracking-tight">Overview</h2>
          <p className="text-muted-foreground">
            {rows === null
              ? 'Checking what is due…'
              : total > 0
                ? `${total} moves to go over today.`
                : 'You are all caught up.'}
          </p>
        </div>
        {rows && rows.length > 0 && (
          <Button asChild size="lg" disabled={total === 0}>
            <a href={to('/quiz')}>
              <Play aria-hidden /> {total === 0 ? 'Nothing due' : `Start the quiz (${total})`}
            </a>
          </Button>
        )}
      </header>

      {unavailable && (
        <Alert variant={status === 'paused' ? 'default' : 'destructive'}>
          <AlertDescription>
            {status === 'paused'
              ? 'Knight School is open in another tab, so your progress is paused here. Open Settings to use it in this tab.'
              : 'Your progress cannot be saved in this browser, so the quiz is unavailable. Courses still work.'}
          </AlertDescription>
        </Alert>
      )}
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
      {!rows && !failure && !unavailable && <Skeleton className="h-40" />}

      <a
        href={to('/name')}
        className="group flex items-center gap-4 rounded-xl border bg-card p-4 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <Telescope className="size-8 shrink-0 text-muted-foreground" aria-hidden />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-semibold leading-tight">Name That Opening</h3>
          <p className="text-sm text-muted-foreground">
            Ten positions: say which opening and variation they come from.
            {guess && guess.total > 0
              ? ` This week: ${guess.total} answered, ${Math.round((guess.accuracy ?? 0) * 100)}% score.`
              : ''}
          </p>
        </div>
        <span className="flex items-center gap-1 text-sm font-medium">
          Play <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </a>

      {rows && rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Due now" value={due} note="from earlier days" />
            <Stat label="New today" value={fresh} note="moves you have not seen" />
            <Stat label="Moves learned" value={known} />
            <Stat label="Courses" value={rows.length} />
          </div>
          <section className="grid gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Your courses</h3>
            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map(({ course, due: courseDue, fresh: courseFresh }) => (
                <li key={course.id}>
                  <a
                    href={to(courseHref(course.id))}
                    className="group flex gap-3 rounded-xl border bg-card p-3 outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <div className="w-20 shrink-0">
                      <BoardThumb id={`today-${course.id}`} epd={course.keyEpd} side={course.side} />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <h4 className="font-semibold leading-tight">{course.name}</h4>
                      <Progress
                        value={percent(learned[course.id] ?? 0, course.cards)}
                        aria-label={`${course.name} progress`}
                      />
                      <p className="text-xs text-muted-foreground">
                        {learned[course.id] ?? 0} of {course.cards} learned · {courseDue} due · {courseFresh} new
                      </p>
                      <span className="mt-auto flex items-center gap-1 text-sm font-medium">
                        Open course{' '}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {rows && rows.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Start your first course</CardTitle>
            <CardDescription>
              Choose an opening, learn its lines, and Knight School schedules the moves so you see each one just before
              you would forget it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href={to('/search')}>Find an opening</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <section className="grid gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {rows && rows.length > 0 ? 'Next in your study order' : 'Where to start'}
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {suggestions.map((course) => (
              <CourseCard key={course.id} course={course} openings={openings} learned={learned} />
            ))}
          </div>
        </section>
      )}
    </Page>
  );
}
