import { courseProgress, relatedCourses, roleOf, type RelatedCourse } from '@knightschool/core';
import { useEffect, useRef, useState } from 'react';
import { Page } from '@/components/page';
import { RichText } from '@/components/rich-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Hint } from '@/components/hint';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { loadSearchIndex } from '@/data/content';
import { BoardPanel } from '@/features/browse/board-panel';
import { PositionDetails } from '@/features/browse/position-details';
import { currentEpd, useBrowse } from '@/features/browse/store';
import { EnrolButton } from '@/features/courses/enrol-button';
import { percent, useProgress } from '@/features/courses/progress';
import { EngineStrip } from '@/features/engine/engine-strip';
import { useEnginePrefs } from '@/features/engine/prefs';
import { useEngine } from '@/features/engine/store';
import { ExplorerPanel } from '@/features/explorer/explorer-panel';
import { decodeMoves, encodeMoves } from '@/router/hash';
import { readHashState, setHashState, to } from '@/router/location';
import { MotifChip } from '@/features/glossary/motif-chip';
import { useGlossary } from '@/features/glossary/use-glossary';
import { ECO_HINT, ROLE_HINT, SIDE_HINT, TIER_HINT } from '@/features/openings/explanations';
import { LinesTable } from './lines-table';

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

const TIER_NAME = { 1: 'Study first', 2: 'Study next', 3: 'Alternative or rare' } as const;

/**
 * One course: what it is for and the plan to take away, the board with the engine, and every line and trap grouped by how
 * much it matters. Beside it, the same opening from the other side, and the courses that reach the same positions.
 */
export function CoursePage({ courseId }: { courseId: string }) {
  const { content, contentStatus, contentError, index, openings, shownVariant, path } = useBrowse();
  const learned = useProgress((state) => state.learned);
  const autoEngine = useEnginePrefs((state) => state.auto);
  const [related, setRelated] = useState<RelatedCourse[]>([]);
  const definitions = useGlossary();
  useKeyboardNavigation();

  // The engine is on by default; Settings turns it off.
  useEffect(() => {
    if (autoEngine) void useEngine.getState().turnOn();
    else useEngine.getState().turnOff();
  }, [autoEngine]);

  // The view lives in the URL hash: put it back once the course has loaded, then keep the hash up to date.
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (contentStatus !== 'ready' || restored.current === courseId) return;
    restored.current = courseId;
    const hash = readHashState();
    if (hash.v || hash.m) useBrowse.getState().restoreView({ variant: hash.v, moves: decodeMoves(hash.m) });
  }, [contentStatus, courseId]);
  useEffect(() => {
    if (restored.current !== courseId || contentStatus !== 'ready') return;
    const nothing = path.length === 0 && !shownVariant;
    setHashState(nothing ? {} : { v: shownVariant ?? undefined, m: encodeMoves(path.map((edge) => edge.uci)) });
  }, [courseId, contentStatus, shownVariant, path]);

  // Courses that reach the same positions, found from the position index.
  useEffect(() => {
    if (!content || contentStatus !== 'ready') return;
    let cancelled = false;
    loadSearchIndex()
      .then((search) => {
        if (!cancelled) setRelated(relatedCourses(courseId, Object.keys(content.nodes), search, index));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [content, contentStatus, courseId, index]);

  const course = index.find((candidate) => candidate.id === courseId);
  const opening = openings.find((candidate) => candidate.id === course?.opening);
  const siblings = index.filter((other) => other.opening === course?.opening && other.id !== courseId);
  const role = course ? roleOf(course, openings) : 'play';
  const progress = course ? courseProgress([course], learned) : { learned: 0, total: 0 };

  return (
    <Page>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={to('/browse')}>Browse</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{course?.name ?? courseId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {contentStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Could not load this course</AlertTitle>
          <AlertDescription>{contentError}</AlertDescription>
        </Alert>
      )}
      {contentStatus === 'loading' && <Skeleton className="h-96 w-full" />}
      {course && content && contentStatus === 'ready' && (
        <>
          <header className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-3xl font-semibold tracking-tight">{course.name}</h2>
              {course.eco && (
                <Hint text={ECO_HINT}>
                  <Badge variant="outline">{course.eco}</Badge>
                </Hint>
              )}
              <Hint text={SIDE_HINT[course.side]}>
                <Badge variant="secondary">you play {course.side}</Badge>
              </Hint>
              <Hint text={ROLE_HINT[role]}>
                <Badge variant={role === 'play' ? 'default' : 'outline'}>
                  {role === 'play' ? 'playing it' : `playing against ${opening?.name ?? 'it'}`}
                </Badge>
              </Hint>
              <Hint text={TIER_HINT[course.tier]}>
                <Badge variant="outline">{TIER_NAME[course.tier]}</Badge>
              </Hint>
              <span className="ml-auto">
                <EnrolButton openingId={courseId} />
              </span>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              <RichText text={course.summary} />
            </p>
            {course.plans.length > 0 && (
              <ul className="grid max-w-3xl list-disc gap-1 pl-5 text-sm">
                {course.plans.map((plan) => (
                  <li key={plan}>
                    <RichText text={plan} />
                  </li>
                ))}
              </ul>
            )}
            {course.motifs.length > 0 && (
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                Ideas in this course:
                {course.motifs.map((motif) => (
                  <MotifChip key={motif} id={motif} entry={definitions?.find((entry) => entry.id === motif)} />
                ))}
              </p>
            )}
            {progress.total === 0 ? (
              <p className="max-w-md text-xs text-muted-foreground">
                A reading course: its lines are drilled in the courses they come from, so there is nothing to quiz here.
              </p>
            ) : (
              <div className="grid max-w-md gap-1">
                <Progress value={percent(progress.learned, progress.total)} aria-label="Course progress" />
                <p className="text-xs text-muted-foreground">
                  {progress.learned} of {progress.total} moves learned
                </p>
              </div>
            )}
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:items-start">
            <div className="grid gap-3 lg:sticky lg:top-16">
              <BoardPanel content={content} />
              <EngineStrip />
              <PositionDetails content={content} />
              <ExplorerPanel epd={currentEpd(content, path)} />
            </div>

            <div className="grid min-w-0 gap-3">
              <LinesTable content={content} />
              {(siblings.length > 0 || related.length > 0) && (
                <section className="grid gap-2 rounded-xl border bg-card p-3 text-sm">
                  <h3 className="font-semibold leading-tight">The same ground from the other side</h3>
                  <ul className="grid gap-1.5">
                    {siblings.map((other) => (
                      <li key={other.id}>
                        <a href={to(`/course/${other.id}`)} className="font-medium underline-offset-4 hover:underline">
                          {other.name}
                        </a>{' '}
                        <span className="text-muted-foreground">
                          {opening ? `in the same opening: you play ${other.side}` : ''}
                        </span>
                      </li>
                    ))}
                    {related
                      .filter((item) => !siblings.some((other) => other.id === item.course.id))
                      .slice(0, 4)
                      .map(({ course: other, shared }) => (
                        <li key={other.id}>
                          <a
                            href={to(`/course/${other.id}`)}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {other.name}
                          </a>{' '}
                          <span className="text-muted-foreground">
                            shares {shared} positions: you play {other.side}
                          </span>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
