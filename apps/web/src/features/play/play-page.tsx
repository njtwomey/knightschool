import { Page } from '@/components/page';
import { explainMove, type LineStep, numberedMove } from '@knightschool/core';
import { EcoLink } from '@/components/eco-link';
import { BookOpen, GitBranch, RotateCcw, Target, Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';
import { MoveList, type MoveListMove } from '@/components/move-list';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoveTags } from '@/components/move-tags';
import { RichText } from '@/components/rich-text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayBreadcrumbs } from '@/components/breadcrumbs/course-breadcrumbs';
import { CourseIntroCard } from '@/features/course/course-intro';
import { ExplorerPanel } from '@/features/explorer/explorer-panel';
import { arrowsOf, squareStylesOf, uciArrow } from '@/components/board/shapes';
import { encodeMoves } from '@/router/hash';
import { startFromAddress } from './resume';
import { ALL_BRANCHES, playView, usePlay, type PlayMode } from './store';
import { navigate, setHashState, to } from '@/router/location';
import { courseHref, lineHref, branchesHref, type UnitRef } from '@/router/hrefs';

const MODES: Record<PlayMode, { name: string; blurb: string; icon: typeof BookOpen }> = {
  learn: { name: 'Learn', blurb: 'You play both sides. Every move is shown first.', icon: BookOpen },
  drill: { name: 'Drill', blurb: 'The computer plays the other side. Recall your moves.', icon: Target },
  branches: {
    name: 'Every branch',
    blurb: 'The computer varies its replies each time. Know the answer to every one.',
    icon: GitBranch,
  },
};

const label = (step: LineStep, index: number) => numberedMove(index, step.edge.san);

type Props = { course: string; line: string; mode: PlayMode; unit?: UnitRef };

export function PlayPage({ course, line, mode, unit }: Props) {
  const state = usePlay();
  const { phase, content, steps, index, attempt, badge, opponentThinking, results, explore, scope, firstIndex } = state;
  // The address names the unit; the effects below must not restart for a new object with the same contents.
  const unitKey = unit ? `${unit.n}/${unit.first ?? ''}-${unit.last ?? ''}` : '';

  useEffect(() => {
    // The moves played so far are in the URL hash, so a refresh carries on from the same move (and the same part).
    void startFromAddress(course, line, mode, unit);
    return () => usePlay.getState().stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, line, mode, unitKey]);

  // If the store was reset while this page stayed open (a hot reload while developing does that), start again instead of
  // sitting on a loading skeleton until the page is refreshed.
  useEffect(() => {
    if (usePlay.getState().phase === 'idle') void startFromAddress(course, line, mode, unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, course, line, mode, unitKey]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'complete') return;
    setHashState({
      m: index > 0 ? encodeMoves(steps.slice(0, index).map((step) => step.edge.uci)) : undefined,
      p: scope && scope.part > 0 ? String(scope.part) : undefined,
    });
  }, [phase, index, steps, scope]);

  // Learn: the steps (and the arrow keys) go forward by playing the move shown, and back through the line or the moves
  // explored off it. They are not there when you are recalling the line yourself.
  const learning = state.mode === 'learn';
  const exploring = learning && explore !== null && explore.length > 0;
  const stepping = learning && line !== ALL_BRANCHES;
  const stepper = useLineStepper({
    length: steps.length,
    index,
    min: firstIndex,
    keys: stepping,
    setIndex: (target) => usePlay.getState().goTo(target),
    first: () => {
      usePlay.getState().leaveExplore();
      usePlay.getState().goTo(0);
    },
    prev: () => (exploring ? usePlay.getState().exploreBack() : usePlay.getState().goTo(index - 1)),
    next: () => {
      const upcoming = steps[index];
      if (!explore && upcoming && phase === 'playing') usePlay.getState().submitMove(upcoming.edge.uci);
    },
    last: () => {
      usePlay.getState().leaveExplore();
      usePlay.getState().goTo(steps.length);
    },
    atStart: index <= firstIndex && !exploring,
    atEnd: phase === 'complete' || !steps[index] || exploring,
  });

  if (phase === 'error') {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Could not open this line</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </Page>
    );
  }
  const view = playView(state);
  if (!content || !view || phase === 'idle' || phase === 'loading') {
    return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  }

  const variants = content.opening.variants;
  const everyBranch = line === ALL_BRANCHES;
  const firstLine = variants.find((candidate) => candidate.kind === 'line') ?? variants[0]!;
  // In an every-branch drill the line is whichever one the moves so far belong to.
  const variant = everyBranch
    ? (variants.find((candidate) => steps.slice(0, index).at(-1)?.edge.variants.includes(candidate.id)) ?? null)
    : variants.find((candidate) => candidate.id === line)!;
  const next =
    everyBranch || scope ? undefined : variants[variants.findIndex((candidate) => candidate.id === line) + 1];
  const pathHref = to(courseHref(course, 'path'));
  const unitName = scope ? `Unit ${scope.unit.index + 1}` : undefined;

  /**
   * Switching how you play changes the address, so a refresh or a shared link comes back to exactly this: the course,
   * the line and the tab are all in the path (/play/<course>/<line>/<learn | drill>, and /play/<course>/all/branches
   * for the every-branch drill).
   */
  function chooseMode(next: PlayMode) {
    if (next === 'branches') navigate(branchesHref(course));
    else navigate(lineHref(course, everyBranch ? firstLine.id : line, next, unit));
  }
  const side = content.opening.side;
  const other = side === 'white' ? 'Black' : 'White';
  const complete = phase === 'complete';
  const lastStep = steps[index - 1];
  const notes = lastStep ? explainMove(lastStep.fromEpd, lastStep.edge.uci, { edge: lastStep.edge }) : [];
  // Learning: the reason for the move about to be played sits in the heading card, before it is played.
  const upcomingNotes =
    state.mode === 'learn' && view.upcoming && !complete && !explore
      ? explainMove(view.upcoming.fromEpd, view.upcoming.edge.uci, { edge: view.upcoming.edge })
      : [];
  const clean = results.filter((result) => result.rating === 'easy' || result.rating === 'good').length;
  const helped = results.filter((result) => result.rating === 'hard').length;
  const missed = results.filter((result) => result.rating === 'again').length;

  let instruction: string;
  if (complete) instruction = scope ? 'Unit complete.' : 'Line complete.';
  else if (opponentThinking) instruction = `${other} replies…`;
  else if (view.expected && state.mode === 'learn') instruction = `Play ${label(view.upcoming!, index)}.`;
  else if (attempt.shown) instruction = 'The move is marked on the board. Play it to carry on.';
  else if (attempt.wrongTries > 0) instruction = 'Not that one. Try again, or use a hint.';
  else instruction = `Your move as ${side}.`;

  const shownEpd = exploring ? explore!.at(-1)!.epd : view.epd;

  return (
    <Page className="gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <PlayBreadcrumbs
          course={course}
          line={line}
          lineName={everyBranch ? 'Every branch' : variant!.name}
          tab={state.mode}
        />
        {!everyBranch && <EcoLink eco={variant!.eco} course={course} line={variant!.id} />}
        {!everyBranch && variant!.kind === 'refutation' && <Badge variant="secondary">Trap</Badge>}
        {everyBranch && variant && <Badge variant="outline">now in {variant.name}</Badge>}
        {scope && (
          <Badge variant="outline" asChild>
            <a href={pathHref} title="Back to the course's path">
              {unitName} of the path
              {scope.parts.length > 1 ? `, branch ${scope.part + 1} of ${scope.parts.length}` : ''}
            </a>
          </Badge>
        )}
      </div>

      <div className="board-columns grid gap-6 stacked:gap-4">
        {/* Stacked on a phone, the panel with the move to play follows the board and its buttons; the engine comes last. */}
        <StudyBoard
          id="play"
          previewable
          className="stacked:contents"
          epd={shownEpd}
          orientation={side}
          interactive={learning || (!complete && !opponentThinking && view.expected !== undefined)}
          onMove={(uci) => usePlay.getState().submitMove(uci)}
          lastMove={exploring ? explore!.at(-1)!.uci : view.lastEdge?.uci}
          lastMoveTone={exploring ? 'yellow' : 'red'}
          arrows={
            exploring
              ? []
              : [
                  ...(view.showExpected && view.expected ? [uciArrow(view.expected.uci)] : []),
                  ...arrowsOf(view.lastEdge?.annotation),
                ]
          }
          squareStyles={exploring ? undefined : squareStylesOf(undefined, view.lastEdge?.annotation)}
          badge={badge}
          hintSquare={view.hintSquare}
          stepper={stepping ? stepper : null}
          controls={{
            evalBar: learning,
            hint:
              state.mode === 'drill' && !complete
                ? {
                    onHint: () => usePlay.getState().hint(),
                    disabled: attempt.hintUsed || attempt.shown || !view.expected,
                  }
                : undefined,
            show:
              state.mode === 'drill' && !complete
                ? { onShow: () => usePlay.getState().show(), disabled: attempt.shown || !view.expected }
                : undefined,
          }}
          actions={
            <>
              {!everyBranch && (
                <Button variant="outline" onClick={() => chooseMode('branches')} title={MODES.branches.blurb}>
                  <GitBranch aria-hidden /> Every branch
                </Button>
              )}
              <Button variant="ghost" onClick={() => usePlay.getState().restart()} className="ml-auto">
                <RotateCcw aria-hidden /> Restart
              </Button>
            </>
          }
          engine={
            learning && {
              view: 'lines',
              actions: exploring && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => usePlay.getState().exploreBack()}>
                    <Undo2 aria-hidden /> Take back
                  </Button>
                  <Button size="sm" onClick={() => usePlay.getState().leaveExplore()}>
                    Back to the line
                  </Button>
                </div>
              ),
            }
          }
          below={
            state.mode === 'drill' &&
            !everyBranch && (
              <p className="text-sm text-muted-foreground">
                Not sure of it yet?{' '}
                <Button variant="link" className="h-auto p-0" onClick={() => chooseMode('learn')}>
                  <BookOpen aria-hidden /> Go back to learning this {scope ? 'unit' : 'line'}
                </Button>
              </p>
            )
          }
        />

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-xl" aria-live="polite">
                  {exploring ? `Exploring: ${explore!.map((move) => move.san).join(' ')}` : instruction}
                </CardTitle>
                {state.mode === 'learn' && !everyBranch && (
                  <Button size="sm" onClick={() => chooseMode('drill')}>
                    <Target aria-hidden /> Drill this {scope ? 'unit' : 'line'}
                  </Button>
                )}
              </div>
              <CardDescription>
                {exploring
                  ? 'This is off the line. Watch the engine to see what it costs or gains, or click what people play.'
                  : state.mode === 'learn'
                    ? [
                        ...upcomingNotes.slice(0, 2).map((note) => <RichText key={note.text} text={`${note.text} `} />),
                        <MoveTags key="tags" tags={view.upcoming?.edge.annotation?.tags} />,
                      ]
                    : MODES[state.mode].blurb}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {everyBranch ? (
                <p className="text-xs text-muted-foreground">
                  {index} moves so far. Each run takes a different branch.
                </p>
              ) : (
                <div className="grid gap-1">
                  <Progress
                    value={
                      ((Math.min(index, steps.length) - firstIndex) / Math.max(1, steps.length - firstIndex)) * 100
                    }
                    aria-label={scope ? 'Progress through the unit' : 'Progress through the line'}
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.min(index, steps.length) - firstIndex} of {steps.length - firstIndex} moves
                    {firstIndex > 0 && ', after the moves that lead here'}
                  </p>
                </div>
              )}
              <MoveList
                layout="table"
                label="The line"
                empty="No moves yet."
                moves={
                  exploring
                    ? [
                        ...steps.slice(0, index).map((step, ply): MoveListMove => ({ ply, san: step.edge.san })),
                        ...explore!.map((move, i): MoveListMove => ({
                          ply: index + i,
                          san: move.san,
                          state: 'explored',
                        })),
                      ]
                    : steps.slice(0, stepping ? steps.length : index).map((step, ply): MoveListMove => ({
                        ply,
                        san: step.edge.san,
                        state: ply < index ? 'played' : 'future',
                      }))
                }
                current={exploring ? index + explore!.length - 1 : index - 1}
                onSelect={stepping ? (ply) => usePlay.getState().goTo(ply + 1) : undefined}
              />
              {state.mode === 'learn' && !everyBranch && (
                <p className="text-xs text-muted-foreground">
                  Right arrow plays the next move, left arrow goes back. Click a move to jump to it.
                </p>
              )}
            </CardContent>
          </Card>

          {(notes.length > 0 || Boolean(lastStep?.edge.annotation?.tags?.length)) &&
            !complete &&
            state.mode !== 'learn' && (
              <div className="grid gap-1.5 rounded-lg border bg-card p-4 text-sm">
                <p className="font-medium">
                  {label(lastStep!, index - 1)} <MoveTags tags={lastStep!.edge.annotation?.tags} />
                </p>
                {notes.slice(0, 2).map((note) => (
                  <p key={note.text} className={note.source === 'author' ? '' : 'text-muted-foreground'}>
                    <RichText text={note.text} />
                  </p>
                ))}
              </div>
            )}

          <CourseIntroCard
            key={`${course}:${state.mode}`}
            name={content.opening.name}
            summary={content.opening.summary}
            about={content.opening.about}
            side={side}
            variant={variant}
            defaultOpen={false}
          />

          {state.mode === 'learn' && (
            <ExplorerPanel epd={shownEpd} onPlay={(uci) => usePlay.getState().exploreMove(uci)} />
          )}

          {complete && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {results.length === 0
                    ? `You have played through the ${scope ? 'unit' : 'line'}.`
                    : `${clean} of ${results.length} moves right first time`}
                </CardTitle>
                <CardDescription>
                  {results.length > 0 && state.mode !== 'learn' && `${helped} with help, ${missed} to see again. `}
                  {state.mode === 'learn'
                    ? 'The moves are now in your quiz.'
                    : 'Your answers are saved and scheduled for the quiz.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {state.mode === 'learn' ? (
                  <Button onClick={() => chooseMode('drill')}>
                    <Target aria-hidden /> Now drill it
                  </Button>
                ) : (
                  <Button onClick={() => usePlay.getState().restart()}>
                    <RotateCcw aria-hidden /> {everyBranch ? 'Another branch' : 'Drill again'}
                  </Button>
                )}
                {next && (
                  <Button asChild variant="outline">
                    <a href={to(lineHref(course, next.id, state.mode === 'drill' ? 'drill' : 'learn'))}>
                      Next: {next.name}
                    </a>
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <a href={scope ? pathHref : to(courseHref(course))}>Back to the {scope ? 'path' : 'course'}</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
