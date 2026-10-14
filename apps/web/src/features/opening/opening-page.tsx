import { Page } from '@/components/page';
import { familyProgress, roleOf, type Role } from '@knightschool/core';
import { useEffect, useRef, useState } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoardPanel } from '@/features/browse/board-panel';
import { PositionDetails } from '@/features/browse/position-details';
import { currentEpd, useBrowse } from '@/features/browse/store';
import { percent, useProgress } from '@/features/courses/progress';
import { EngineStrip } from '@/features/engine/engine-strip';
import { useEnginePrefs } from '@/features/engine/prefs';
import { useEngine } from '@/features/engine/store';
import { ExplorerPanel } from '@/features/explorer/explorer-panel';
import { decodeMoves, encodeMoves } from '@/router/hash';
import { readHashState, setHashState, to } from '@/router/location';
import { CourseGroup } from './course-group';

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Left and right step through the line, Home and End jump to its ends. */
function useKeyboardNavigation() {
  const { stepBack, stepForward, toStart, toEnd } = useBrowse();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
      const action = { ArrowLeft: stepBack, ArrowRight: stepForward, Home: toStart, End: toEnd }[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepBack, stepForward, toStart, toEnd]);
}

const SECTIONS: { role: Role; title: string }[] = [
  { role: 'play', title: 'Play it' },
  { role: 'against', title: 'Play against it' },
  { role: 'motif', title: 'Motif' },
];

/** An opening: its courses grouped by playing it or playing against it, each with its variations, and a board to show them on. */
export function OpeningPage({ familyId, focusCourse }: { familyId: string; focusCourse?: string }) {
  const { families, contents, content, contentStatus, contentError, index, openingId, shownVariant, path } =
    useBrowse();
  const learned = useProgress((state) => state.learned);
  const autoEngine = useEnginePrefs((state) => state.auto);
  const [chosen, setRole] = useState<Role | null>(null);
  useKeyboardNavigation();

  // The engine is on by default; Settings turns it off.
  useEffect(() => {
    if (autoEngine) void useEngine.getState().turnOn();
    else useEngine.getState().turnOff();
  }, [autoEngine]);

  // The view lives in the URL hash: put it back once the opening has loaded, then keep the hash up to date.
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (contentStatus !== 'ready' || restored.current === familyId) return;
    restored.current = familyId;
    const hash = readHashState();
    if (hash.c || hash.m)
      useBrowse.getState().restoreView({ course: hash.c, variant: hash.v, moves: decodeMoves(hash.m) });
  }, [contentStatus, familyId]);
  useEffect(() => {
    if (restored.current !== familyId || contentStatus !== 'ready') return;
    const nothing = path.length === 0 && !shownVariant;
    setHashState(
      nothing
        ? {}
        : { c: openingId ?? undefined, v: shownVariant ?? undefined, m: encodeMoves(path.map((edge) => edge.uci)) },
    );
  }, [familyId, contentStatus, openingId, shownVariant, path]);

  const family = families.find((candidate) => candidate.id === familyId);
  const courses = family ? index.filter((course) => family.courses.includes(course.id)) : [];
  const roles = new Set(courses.map(roleOf));
  // The course a link points at decides the tab it opens on.
  const focused = courses.find((course) => course.id === focusCourse);
  const tab: Role =
    chosen ?? (focused ? roleOf(focused) : (SECTIONS.find((section) => roles.has(section.role))?.role ?? 'play'));
  const overall = familyProgress(courses, learned);

  // Arriving from a course link scrolls to that course.
  useEffect(() => {
    if (contentStatus === 'ready' && focusCourse)
      document.getElementById(`course-${focusCourse}`)?.scrollIntoView({ block: 'start' });
  }, [contentStatus, focusCourse]);

  return (
    <Page>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={to('/browse')}>Browse</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{family?.name ?? familyId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {contentStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this opening</AlertTitle>
          <AlertDescription>{contentError}</AlertDescription>
        </Alert>
      )}
      {contentStatus === 'loading' && <Skeleton className="h-96 w-full" />}
      {family && content && contentStatus === 'ready' && (
        <>
          <header className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-3xl font-semibold tracking-tight">{family.name}</h2>
                {family.eco && <Badge variant="outline">{family.eco}</Badge>}
              </div>
              <p className="max-w-3xl text-muted-foreground">{family.summary}</p>
              <div className="grid max-w-md gap-1">
                <Progress value={percent(overall.learned, overall.total)} aria-label="Opening progress" />
                <p className="text-xs text-muted-foreground">
                  {overall.learned} of {overall.total} moves learned across {courses.length}{' '}
                  {courses.length === 1 ? 'course' : 'courses'}
                </p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start">
            <div className="grid gap-3 lg:sticky lg:top-16">
              <BoardPanel content={content} />
              <EngineStrip />
              <PositionDetails content={content} />
              <ExplorerPanel epd={currentEpd(content, path)} />
            </div>

            <Tabs value={tab} onValueChange={(value) => setRole(value as Role)} className="min-w-0">
              {roles.size > 1 && (
                <TabsList>
                  {SECTIONS.filter((section) => roles.has(section.role)).map((section) => (
                    <TabsTrigger key={section.role} value={section.role}>
                      {section.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}
              {SECTIONS.filter((section) => roles.has(section.role)).map((section) => (
                <TabsContent key={section.role} value={section.role} className="grid gap-3">
                  {courses
                    .filter((course) => roleOf(course) === section.role && contents[course.id])
                    .map((course) => (
                      <CourseGroup
                        key={course.id}
                        content={contents[course.id]!}
                        cards={course.cards}
                        learned={learned[course.id] ?? 0}
                        focused={course.id === focusCourse}
                      />
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </>
      )}
    </Page>
  );
}
