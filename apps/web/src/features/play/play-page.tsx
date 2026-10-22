import { explainMove, type LineStep, numberedMove } from '@knightschool/core';
import { BookOpen, GitBranch, RotateCcw, Undo2 } from 'lucide-react';
import { PlayBreadcrumbs } from '@/components/breadcrumbs/course-breadcrumbs';
import { useLineStepper } from '@/components/board/line-stepper';
import { arrowsOf, squareStylesOf, uciArrow } from '@/components/board/shapes';
import { StudyBoard } from '@/components/board/study-board';
import { EcoLink } from '@/components/eco-link';
import { MoveTags } from '@/components/move-tags';
import { Page } from '@/components/page';
import { RichText } from '@/components/rich-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseIntroCard } from '@/features/course/course-intro';
import { ExplorerPanel } from '@/features/explorer/explorer-panel';
import { branchesHref, courseHref, lineHref, type UnitRef } from '@/router/hrefs';
import { navigate, to } from '@/router/location';
import { CompleteCard } from './complete-card';
import { MODES } from './modes';
import { PlayPanel } from './play-panel';
import { ALL_BRANCHES, playView, usePlay, type PlayMode } from './store';
import { usePlayAddress } from './use-play-address';

const label = (step: LineStep, index: number) => numberedMove(index, step.edge.san);

type Props = { course: string; line: string; mode: PlayMode; unit?: UnitRef };

export function PlayPage({ course, line, mode, unit }: Props) {
  const state = usePlay();
  const { phase, content, steps, index, attempt, badge, opponentThinking, results, explore, scope, firstIndex } = state;

  usePlayAddress(course, line, mode, unit);

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
          <PlayPanel
            mode={state.mode}
            everyBranch={everyBranch}
            unit={scope !== null}
            instruction={instruction}
            explore={explore}
            upcomingNotes={upcomingNotes}
            upcomingTags={view.upcoming?.edge.annotation?.tags}
            steps={steps}
            index={index}
            firstIndex={firstIndex}
            stepping={stepping}
            onDrill={() => chooseMode('drill')}
          />

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
            <CompleteCard
              mode={state.mode}
              results={results}
              unit={scope !== null}
              everyBranch={everyBranch}
              next={
                next && {
                  name: next.name,
                  href: to(lineHref(course, next.id, state.mode === 'drill' ? 'drill' : 'learn')),
                }
              }
              backHref={scope ? pathHref : to(courseHref(course))}
              onDrill={() => chooseMode('drill')}
            />
          )}
        </div>
      </div>
    </Page>
  );
}
