import {
  type CourseUnit,
  type OpeningContent,
  type UnitProgress,
  type UnitState,
  type UnitStretch,
} from '@knightschool/core';
import {
  BookOpen,
  CircleCheck,
  CircleDot,
  GraduationCap,
  Lock,
  Circle,
  ListChecks,
  Swords,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { loadCoursePath, isPassed, type CoursePath } from '@/data/course-path';
import { CourseBreadcrumbs } from '@/features/browse/breadcrumbs';
import { useBrowse } from '@/features/browse/store';
import { lineHref } from '@/features/line/tabs';
import { to } from '@/router/location';
import { SessionStarters } from './session-starters';

const KIND: Record<CourseUnit['kind'], string> = {
  main: 'Main line',
  gambit: 'Gambit',
  sideline: 'Sideline',
  rare: 'Rare',
  'against-us': 'Trap to avoid',
  'for-us': 'Trap to spring',
};

const STATE: Record<UnitState, { name: string; icon: typeof Lock; blurb: string }> = {
  locked: { name: 'Locked', icon: Lock, blurb: 'Pass the unit it grows from first.' },
  unlocked: { name: 'Ready', icon: Circle, blurb: 'Nothing studied yet. Learn it next.' },
  learning: { name: 'Learning', icon: CircleDot, blurb: 'Some moves are in your quiz, not all of them sure yet.' },
  passed: { name: 'Passed', icon: CircleCheck, blurb: 'Every move right in each of its last two answers.' },
  graduated: { name: 'Graduated', icon: GraduationCap, blurb: 'Every move is now asked a week or more apart.' },
};

/** One move of a stretch as shown: its number, its SAN, and whether it is one of the unit's own moves. */
type ShownMove = { ply: number; san: string; core: boolean };

/** The SAN of a stretch's moves, from the position where it starts. */
function stretchMoves(content: OpeningContent, stretch: UnitStretch): { lead: ShownMove[]; own: ShownMove[] } {
  const moves: ShownMove[] = [];
  let epd = content.opening.rootEpd;
  stretch.moves.forEach((uci, ply) => {
    const edge = content.nodes[epd]?.moves.find((candidate) => candidate.uci === uci);
    if (!edge) return;
    moves.push({ ply, san: edge.san, core: stretch.plies.includes(ply) });
    epd = edge.to;
  });
  return { lead: moves.slice(0, stretch.from), own: moves.slice(stretch.from) };
}

const numbered = (move: ShownMove, first: boolean) =>
  move.ply % 2 === 0
    ? `${move.ply / 2 + 1}.${move.san}`
    : first
      ? `${Math.floor(move.ply / 2) + 1}...${move.san}`
      : move.san;

/** The position at the end of a unit's first stretch, for the board. */
function endOf(content: OpeningContent, stretch: UnitStretch): { epd: string; lastMove?: string } {
  let epd = content.opening.rootEpd;
  for (const uci of stretch.moves) epd = content.nodes[epd]?.moves.find((edge) => edge.uci === uci)?.to ?? epd;
  return { epd, lastMove: stretch.moves.at(-1) };
}

/** A unit's stretch as numbered moves, the unit's own moves in bold, after the last two moves that lead to it. */
function StretchMoves({
  content,
  stretch,
  progress,
}: {
  content: OpeningContent;
  stretch: UnitStretch;
  progress?: UnitProgress;
}) {
  const { lead, own } = stretchMoves(content, stretch);
  const passedPlies = new Set(
    stretch.plies.filter((_, i) => progress?.moves[i]?.passed || progress?.moves[i]?.graduated),
  );
  return (
    <p className="font-mono text-sm leading-relaxed">
      {lead.length > 0 && (
        <span className="text-muted-foreground">
          {lead.length > 2 && '… '}
          {lead.slice(-2).map((move, i) => `${numbered(move, i === 0)} `)}
        </span>
      )}
      {own.map((move, i) => (
        <span
          key={move.ply}
          className={move.core ? `font-semibold ${passedPlies.has(move.ply) ? 'text-primary' : ''}` : ''}
        >
          {numbered(move, i === 0)}{' '}
        </span>
      ))}
    </p>
  );
}

/** What a unit is: the first move that makes it different from what came before. */
function headline(content: OpeningContent, unit: CourseUnit, units: CourseUnit[]): string {
  const first = unit.stretches[0]!;
  const { own } = stretchMoves(content, first);
  const opener = own[0];
  if (unit.index === 0) return 'From the start';
  if (unit.prerequisites.length === 0)
    return opener ? `When ${numbered(opener, true)} is played, open from the start` : 'Open from the start';
  if (unit.side) return `Other replies after unit ${unitNumber(units, unit.prerequisites[0])}`;
  if (unit.branch && opener) return `When ${numbered(opener, true)} is played`;
  return `Carries on from unit ${unitNumber(units, unit.prerequisites[0])}`;
}

const unitNumber = (units: CourseUnit[], id: string | undefined) =>
  (units.find((unit) => unit.id === id)?.index ?? 0) + 1;

/**
 * The Path tab of a course: the course cut into units of about four of your moves, in the order to study them, each
 * with its state and buttons to learn and drill just that unit. Locked units say what opens them. Traps and quizzes
 * that belong with a unit are listed as extras, never required.
 */
export function CoursePathPage({ course }: { course: string }) {
  const { content, contentStatus, contentError, index } = useBrowse();
  const entry = index.find((candidate) => candidate.id === course);
  const [path, setPath] = useState<CoursePath | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const ready = content?.opening.id === course && contentStatus === 'ready' ? content : null;
  useEffect(() => {
    if (!ready) return;
    let live = true;
    loadCoursePath(ready)
      .then((loaded) => live && setPath(loaded))
      .catch((error: unknown) => live && setFailure(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [ready]);

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
  const side = ready.opening.side;
  const board = shown ? endOf(ready, shown.stretches[0]!) : null;

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
            {board && shown && (
              <aside className="hidden gap-2 lg:sticky lg:top-20 lg:grid" aria-label="The picked unit's position">
                <AppBoard
                  id="path-board"
                  className="aspect-square w-full"
                  epd={board.epd}
                  orientation={side}
                  interactive={false}
                  lastMove={board.lastMove}
                />
                <p className="text-sm">
                  <span className="font-medium">Unit {shown.index + 1}</span>{' '}
                  <span className="text-muted-foreground">ends here{shown.side ? ' (its first branch)' : ''}.</span>
                </p>
              </aside>
            )}
          </div>
        </>
      )}
    </Page>
  );
}

function UnitRow({
  content,
  unit,
  units,
  progress,
  selected,
  onSelect,
}: {
  content: OpeningContent;
  unit: CourseUnit;
  units: CourseUnit[];
  progress: UnitProgress | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const state = progress?.state ?? 'locked';
  const { name: stateName, icon: StateIcon, blurb } = STATE[state];
  const variants = content.opening.variants;
  const lineName = variants.find((variant) => variant.id === unit.line)?.name ?? unit.line;
  const course = content.opening.id;
  const waiting = (progress?.waitingFor ?? []).map((id) => units.find((other) => other.id === id)!).filter(Boolean);
  const quizzes = unit.quizzes.flatMap((id) => content.quizzes.find((quiz) => quiz.id === id) ?? []);
  const traps = unit.traps.flatMap((id) => variants.find((variant) => variant.id === id) ?? []);
  const ref = { n: unit.n };
  // Where each stretch's moves begin in the unit's list of moves.
  const starts = unit.stretches.map((_, i) =>
    unit.stretches.slice(0, i).reduce((sum, stretch) => sum + stretch.plies.length, 0),
  );

  return (
    <li
      className={`grid gap-2 rounded-xl border bg-card p-3 ${selected ? 'ring-2 ring-ring' : ''} ${state === 'locked' ? 'opacity-80' : ''}`}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button')) onSelect();
      }}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold tabular-nums"
          aria-hidden
          title={`Unit id ${unit.id}, for course.yaml units:`}
        >
          {unit.index + 1}
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h3 className="font-semibold leading-tight">
            <span className="sr-only">Unit {unit.index + 1}: </span>
            {lineName}
          </h3>
          <p className="text-sm text-muted-foreground">{headline(content, unit, units)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{KIND[unit.kind]}</Badge>
          <Badge
            variant={state === 'locked' ? 'outline' : state === 'unlocked' ? 'secondary' : 'default'}
            title={blurb}
          >
            <StateIcon aria-hidden /> {stateName}
          </Badge>
        </div>
      </div>

      <div className="grid gap-1 pl-11">
        {unit.stretches.map((stretch, i) => {
          const slice = progress && {
            ...progress,
            moves: progress.moves.slice(starts[i], starts[i]! + stretch.plies.length),
          };
          return <StretchMoves key={i} content={content} stretch={stretch} progress={slice} />;
        })}
        <p className="text-xs text-muted-foreground">
          {unit.cards.length} {unit.cards.length === 1 ? 'move' : 'moves'} of yours
          {progress &&
            progress.introduced > 0 &&
            `: ${progress.moves.filter((move) => move.passed || move.graduated).length} passed, ${progress.introduced} in your quiz`}
          {unit.stretches.length > 1 && `, in ${unit.stretches.length} short branches`}.
        </p>
        {state === 'locked' && waiting.length > 0 && (
          <p className="text-sm">
            <Lock className="mr-1 inline size-3.5" aria-hidden />
            Opens when you pass{' '}
            {waiting.map((other, i) => (
              <span key={other.id}>
                {i > 0 && ' and '}
                unit {other.index + 1} ({variants.find((variant) => variant.id === other.line)?.name ?? other.line})
              </span>
            ))}
            .
          </p>
        )}
        {(quizzes.length > 0 || traps.length > 0) && (
          <Extras>
            {traps.map((trap) => (
              <li key={trap.id}>
                <Swords className="mr-1 inline size-3.5" aria-hidden />
                <a className="underline-offset-4 hover:underline" href={to(lineHref(course, trap.id, 'about'))}>
                  {trap.whose === 'for-us' ? 'Trap to spring' : 'Trap to avoid'}: {trap.name}
                </a>
              </li>
            ))}
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <ListChecks className="mr-1 inline size-3.5" aria-hidden />
                Question: {quiz.prompt}
              </li>
            ))}
          </Extras>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant={state === 'unlocked' ? 'default' : 'outline'}>
            <a href={to(lineHref(course, unit.line, 'learn', ref))}>
              <BookOpen aria-hidden /> Learn
            </a>
          </Button>
          <Button asChild size="sm" variant={state === 'learning' ? 'default' : 'outline'}>
            <a href={to(lineHref(course, unit.line, 'drill', ref))}>
              <Target aria-hidden /> Drill
            </a>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Supplementary material: shown with the unit, never needed to pass it. */
function Extras({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-lg bg-muted/50 p-2 text-sm">
      <p className="text-xs font-medium text-muted-foreground">Extras, not needed to pass</p>
      <ul className="grid gap-1">{children}</ul>
    </div>
  );
}
