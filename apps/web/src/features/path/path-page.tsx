import { type UnitState } from '@knightschool/core';
import { useMemo, useState } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { loadCoursePath, isPassed } from '@/data/course-path';
import { CourseBreadcrumbs } from '@/components/breadcrumbs/course-breadcrumbs';
import { useCatalog } from '@/data/catalog-store';
import { SessionStarters } from './session-starters';
import { useAsync } from '@/hooks/use-async';

import { STATE } from './unit-state';
import { UnitBoard } from './unit-board';
import { UnitRow } from './unit-row';

/**
 * The Path tab of a course: the course cut into units of about four of your moves, in the order to study them, each
 * with its state and buttons to learn and drill just that unit. Locked units say what opens them. Traps and quizzes
 * that belong with a unit are listed as extras, never required.
 */
export function CoursePathPage({ course }: { course: string }) {
  const { content, contentStatus, contentError, index } = useCatalog();
  const entry = index.find((candidate) => candidate.id === course);
  const [picked, setPicked] = useState<string | null>(null);

  const ready = content?.opening.id === course && contentStatus === 'ready' ? content : null;
  const { data: path, error: failure } = useAsync(ready ? () => loadCoursePath(ready) : null, [ready]);

  const units = useMemo(() => path?.units ?? [], [path]);
  // The unit to show on the board: the one picked, else the first one not yet passed.
  const current = useMemo(
    () =>
      units.find((unit) => !isPassed(path?.progress.get(unit.id)) && path?.progress.get(unit.id)?.state !== 'locked'),
    [units, path],
  );
  const shown = units.find((unit) => unit.id === picked) ?? current ?? units[0];

  if (contentStatus === 'error' || failure)
    return (
      <Page>
        <CourseBreadcrumbs course={course} tab="path" />
        <Alert variant="destructive">
          <AlertTitle>Could not load this course</AlertTitle>
          <AlertDescription>{contentError ?? failure}</AlertDescription>
        </Alert>
      </Page>
    );
  if (!ready || !path || !entry)
    return (
      <Page>
        <CourseBreadcrumbs course={course} tab="path" />
        <Skeleton className="h-96 w-full" />
      </Page>
    );

  const counts = Object.fromEntries(
    (Object.keys(STATE) as UnitState[]).map((state) => [
      state,
      units.filter((unit) => path.progress.get(unit.id)?.state === state).length,
    ]),
  ) as Record<UnitState, number>;
  const done = counts.passed + counts.graduated;

  return (
    <Page>
      <CourseBreadcrumbs course={course} tab="path" />
      <header className="grid gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">{entry.name}: the path</h2>
        {units.length === 0 ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            A reading course: its lines are drilled in the courses they come from, so there is no path to follow here.
          </p>
        ) : (
          <>
            <p className="max-w-2xl text-sm text-muted-foreground">
              The course in {units.length} units of about four of your moves, main line first. A unit opens when the one
              it grows from is passed: each of its moves right in your last two answers.
            </p>
            <div className="grid max-w-md gap-1">
              <Progress value={units.length ? (done / units.length) * 100 : 0} aria-label="Units passed" />
              <p className="text-xs text-muted-foreground">
                {done} of {units.length} units passed
                {counts.graduated > 0 && ` (${counts.graduated} graduated)`}, {counts.learning} being learned,{' '}
                {counts.unlocked} ready, {counts.locked} locked.
              </p>
            </div>
            {!path.saved && (
              <p className="text-xs text-muted-foreground">
                Your progress could not be read in this tab, so every unit is shown as new.
              </p>
            )}
          </>
        )}
      </header>

      {units.length > 0 && (
        <>
          <SessionStarters content={ready} path={path} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            <ol className="grid gap-2" aria-label="Units in study order">
              {units.map((unit) => (
                <UnitRow
                  key={unit.id}
                  content={ready}
                  unit={unit}
                  units={units}
                  progress={path.progress.get(unit.id)}
                  selected={unit.id === shown?.id}
                  onSelect={() => setPicked(unit.id)}
                />
              ))}
            </ol>
            {shown && (
              <aside className="hidden lg:sticky lg:top-20 lg:grid" aria-label="The picked unit's position">
                <UnitBoard key={shown.id} content={ready} unit={shown} />
              </aside>
            )}
          </div>
        </>
      )}
    </Page>
  );
}
