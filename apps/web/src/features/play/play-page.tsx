import { Page } from '@/components/page';
import { explainMove, type LineStep } from '@knightschool/core';
import { BookOpen, Ellipsis, Eye, GitBranch, Lightbulb, RotateCcw, Target, Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/rich-text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { PlayBreadcrumbs } from '@/features/browse/breadcrumbs';
import { EngineLines } from '@/features/engine/engine-lines';
import { EvalBar } from '@/features/engine/eval-bar';
import { ExplorerPanel } from '@/features/explorer/explorer-panel';
import { arrowsOf, squareStylesOf } from '@/features/browse/shapes';
import { decodeMoves, encodeMoves } from '@/router/hash';
import { ALL_BRANCHES, playView, usePlay, type PlayMode } from './store';
import { navigate, readHashState, setHashState, to } from '@/router/location';

const MODES: Record<PlayMode, { name: string; blurb: string; icon: typeof BookOpen }> = {
  learn: { name: 'Learn', blurb: 'You play both sides. Every move is shown first.', icon: BookOpen },
  practice: { name: 'Practise', blurb: 'The computer plays the other side. Recall your moves.', icon: Target },
  branches: {
    name: 'Every branch',
    blurb: 'The computer varies its replies each time. Know the answer to every one.',
    icon: GitBranch,
  },
};

const arrowFor = (uci: string) => ({
  startSquare: uci.slice(0, 2),
  endSquare: uci.slice(2, 4),
  color: 'rgb(21 128 61 / 0.85)',
});
const label = (step: LineStep, index: number) =>
  `${Math.floor(index / 2) + 1}${index % 2 ? '...' : '.'} ${step.edge.san}`;

type Props = { course: string; line: string; mode: PlayMode };

/**
 * The line as a table of full moves. Moves played are solid and the latest is marked. In Learn the rest of the line is
 * shown dimmed, so you can see where it goes, and any move can be clicked to jump back to it; other modes show only what
 * has been played, so nothing is given away.
 */
function MoveTable({
  steps,
  index,
  learn,
  explore,
}: {
  steps: LineStep[];
  index: number;
  learn: boolean;
  /** Moves played off the line: the table follows them from where the line was left. */
  explore: { san: string }[];
}) {
  type Entry = { san: string; kind: 'played' | 'future' | 'explored'; jump?: number };
  const entries: Entry[] =
    explore.length > 0
      ? [
          ...steps.slice(0, index).map((step, i): Entry => ({ san: step.edge.san, kind: 'played', jump: i + 1 })),
          ...explore.map((move): Entry => ({ san: move.san, kind: 'explored' })),
        ]
      : steps.slice(0, learn ? steps.length : index).map((step, i): Entry => ({
          san: step.edge.san,
          kind: i < index ? 'played' : 'future',
          jump: learn ? i + 1 : undefined,
        }));
  const rows = Math.ceil(entries.length / 2);
  if (rows === 0) return <p className="text-sm text-muted-foreground">No moves yet.</p>;
  const lastExplored = explore.length > 0 ? entries.length - 1 : -1;
  const cell = (i: number) => {
    const entry = entries[i];
    if (!entry) return <TableCell />;
    const current = i === lastExplored || (explore.length === 0 && i === index - 1);
    const text = (
      <span
        className={
          entry.kind === 'explored'
            ? `rounded px-1 font-medium text-primary ${current ? 'bg-primary/15' : ''}`
            : current
              ? 'rounded bg-secondary px-1 font-medium'
              : entry.kind === 'played'
                ? 'px-1'
                : 'px-1 text-muted-foreground/60'
        }
      >
        {entry.san}
      </span>
    );
    return (
      <TableCell className="py-1 font-mono">
        {entry.jump !== undefined ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-auto px-0 font-mono hover:bg-transparent hover:underline"
            onClick={() => usePlay.getState().goTo(entry.jump!)}
          >
            {text}
          </Button>
        ) : (
          text
        )}
      </TableCell>
    );
  };
  return (
    <Table aria-label="The line">
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row}>
            <TableCell className="w-8 py-1 font-mono text-muted-foreground">{row + 1}.</TableCell>
            {cell(row * 2)}
            {cell(row * 2 + 1)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PlayPage({ course, line, mode }: Props) {
  const state = usePlay();
  const { phase, content, steps, index, attempt, badge, opponentThinking, results, explore } = state;

  useEffect(() => {
    // The moves played so far are in the URL hash, so a refresh carries on from the same move.
    void usePlay.getState().start(course, line, mode, decodeMoves(readHashState().m));
    return () => usePlay.getState().stop();
  }, [course, line, mode]);

  // If the store was reset while this page stayed open (a hot reload while developing does that), start again instead of
  // sitting on a loading skeleton until the page is refreshed.
  useEffect(() => {
    if (usePlay.getState().phase === 'idle')
      void usePlay.getState().start(course, line, mode, decodeMoves(readHashState().m));
  }, [phase, course, line, mode]);

  useEffect(() => {
    if (phase !== 'playing' && phase !== 'complete') return;
    setHashState({ m: index > 0 ? encodeMoves(steps.slice(0, index).map((step) => step.edge.uci)) : undefined });
  }, [phase, index, steps]);

  // Learn: the arrow keys go forward (playing the move shown) and back through the line. They do nothing when you are
  // recalling the line yourself. The mode is read from the store, since it can be switched on the page without the
  // address changing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      const play = usePlay.getState();
      if (play.mode !== 'learn') return;
      if (event.key === 'ArrowLeft') {
        if (play.explore) play.exploreBack();
        else play.goTo(play.index - 1);
      } else if (event.key === 'ArrowRight') {
        const upcoming = play.steps[play.index];
        if (!play.explore && upcoming && play.phase === 'playing') play.submitMove(upcoming.edge.uci);
      } else if (event.key === 'Home') {
        play.leaveExplore();
        play.goTo(0);
      } else if (event.key === 'End') {
        play.leaveExplore();
        play.goTo(play.steps.length);
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
  const drill = line === ALL_BRANCHES;
  const firstLine = variants.find((candidate) => candidate.kind === 'line') ?? variants[0]!;
  // In an every-branch drill the line is whichever one the moves so far belong to.
  const variant = drill
    ? (variants.find((candidate) => steps.slice(0, index).at(-1)?.edge.variants.includes(candidate.id)) ?? null)
    : variants.find((candidate) => candidate.id === line)!;
  const next = drill ? undefined : variants[variants.findIndex((candidate) => candidate.id === line) + 1];

  /**
   * Switching how you play changes the address, so a refresh or a shared link comes back to exactly this: the course,
   * the line and the mode are all in the path (/play/<course>/<line>/<learn | practice>, and /play/<course>/all/branches
   * for the every-branch drill).
   */
  function chooseMode(next: PlayMode) {
    if (next === 'branches') navigate(`/play/${course}/${ALL_BRANCHES}/branches`);
    else navigate(`/play/${course}/${drill ? firstLine.id : line}/${next}`);
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
  if (complete) instruction = 'Line complete.';
  else if (opponentThinking) instruction = `${other} replies…`;
  else if (view.expected && state.mode === 'learn') instruction = `Play ${label(view.upcoming!, index)}.`;
  else if (attempt.shown) instruction = 'The move is marked on the board. Play it to carry on.';
  else if (attempt.wrongTries > 0) instruction = 'Not that one. Try again, or use a hint.';
  else instruction = `Your move as ${side}.`;

  const exploring = state.mode === 'learn' && explore !== null && explore.length > 0;
  const shownEpd = exploring ? explore!.at(-1)!.epd : view.epd;

  return (
    <Page className="gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <PlayBreadcrumbs
          course={course}
          line={line}
          lineName={drill ? 'Every branch' : variant!.name}
          mode={state.mode}
        />
        {!drill && <Badge variant="outline">{variant!.eco}</Badge>}
        {!drill && variant!.kind === 'refutation' && <Badge variant="secondary">Trap</Badge>}
        {drill && variant && <Badge variant="outline">now in {variant.name}</Badge>}
      </div>

      <div className="board-columns grid gap-6 stacked:gap-4">
        {/* Stacked on a phone, the panel with the move to play follows the board and its buttons; the engine comes last. */}
        <div className="grid content-start gap-3 stacked:contents">
          <div className="flex gap-2">
            {state.mode === 'learn' && <EvalBar orientation={side} />}
            <AppBoard
              id="play"
              previewable
              className="aspect-square min-w-0 flex-1"
              epd={shownEpd}
              orientation={side}
              interactive={state.mode === 'learn' || (!complete && !opponentThinking && view.expected !== undefined)}
              onMove={(uci) => usePlay.getState().submitMove(uci)}
              lastMove={exploring ? explore!.at(-1)!.uci : view.lastEdge?.uci}
              lastMoveTone={exploring ? 'yellow' : 'red'}
              arrows={
                exploring
                  ? []
                  : [
                      ...(view.showExpected && view.expected ? [arrowFor(view.expected.uci)] : []),
                      ...arrowsOf(view.lastEdge?.annotation),
                    ]
              }
              squareStyles={exploring ? undefined : squareStylesOf(undefined, view.lastEdge?.annotation)}
              badge={badge}
              hintSquare={view.hintSquare}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BoardSettingsButton />
            <ToggleGroup
              type="single"
              variant="outline"
              value={state.mode === 'learn' || state.mode === 'practice' ? state.mode : ''}
              onValueChange={(value) => value && chooseMode(value as PlayMode)}
              aria-label="Learn or practise"
            >
              <ToggleGroupItem value="learn">
                <BookOpen aria-hidden /> Learn
              </ToggleGroupItem>
              <ToggleGroupItem value="practice">
                <Target aria-hidden /> Practise
              </ToggleGroupItem>
            </ToggleGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={state.mode === 'branches' ? 'secondary' : 'outline'}
                  size="icon"
                  aria-label="More ways to play"
                >
                  <Ellipsis aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>More ways to play</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={state.mode} onValueChange={(value) => chooseMode(value as PlayMode)}>
                  {(Object.keys(MODES) as PlayMode[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key} className="items-start">
                      <span className="grid gap-0.5">
                        <span className="font-medium">{MODES[key].name}</span>
                        <span className="text-xs text-muted-foreground">{MODES[key].blurb}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {state.mode === 'practice' && !complete && (
              <>
                <Button
                  variant="outline"
                  onClick={() => usePlay.getState().hint()}
                  disabled={attempt.hintUsed || attempt.shown || !view.expected}
                >
                  <Lightbulb aria-hidden /> Hint
                </Button>
                <Button
                  variant="outline"
                  onClick={() => usePlay.getState().show()}
                  disabled={attempt.shown || !view.expected}
                >
                  <Eye aria-hidden /> Show me
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => usePlay.getState().restart()} className="ml-auto">
              <RotateCcw aria-hidden /> Restart
            </Button>
          </div>
          {state.mode === 'practice' && !drill && (
            <p className="text-sm text-muted-foreground">
              Not sure of it yet?{' '}
              <Button variant="link" className="h-auto p-0" onClick={() => chooseMode('learn')}>
                <BookOpen aria-hidden /> Go back to learning this line
              </Button>
            </p>
          )}
          {state.mode === 'learn' && (
            <Card className="stacked:order-1">
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">Engine</CardTitle>
                {exploring && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => usePlay.getState().exploreBack()}>
                      <Undo2 aria-hidden /> Take back
                    </Button>
                    <Button size="sm" onClick={() => usePlay.getState().leaveExplore()}>
                      Back to the line
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <EngineLines epd={shownEpd} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-xl" aria-live="polite">
                  {exploring ? `Exploring: ${explore!.map((move) => move.san).join(' ')}` : instruction}
                </CardTitle>
                {state.mode === 'learn' && !drill && (
                  <Button size="sm" onClick={() => chooseMode('practice')}>
                    <Target aria-hidden /> Practise this line
                  </Button>
                )}
              </div>
              <CardDescription>
                {exploring
                  ? 'This is off the line. Watch the engine to see what it costs or gains, or click what people play.'
                  : state.mode === 'learn'
                    ? upcomingNotes.slice(0, 2).map((note) => <RichText key={note.text} text={`${note.text} `} />)
                    : MODES[state.mode].blurb}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {drill ? (
                <p className="text-xs text-muted-foreground">
                  {index} moves so far. Each run takes a different branch.
                </p>
              ) : (
                <div className="grid gap-1">
                  <Progress
                    value={(Math.min(index, steps.length) / steps.length) * 100}
                    aria-label="Progress through the line"
                  />
                  <p className="text-xs text-muted-foreground">
                    {Math.min(index, steps.length)} of {steps.length} moves
                  </p>
                </div>
              )}
              <MoveTable
                steps={steps}
                index={index}
                learn={state.mode === 'learn' && !drill}
                explore={exploring ? explore! : []}
              />
              {state.mode === 'learn' && !drill && (
                <p className="text-xs text-muted-foreground">
                  Right arrow plays the next move, left arrow goes back. Click a move to jump to it.
                </p>
              )}
            </CardContent>
          </Card>

          {notes.length > 0 && !complete && state.mode !== 'learn' && (
            <div className="grid gap-1.5 rounded-lg border bg-card p-4 text-sm">
              <p className="font-medium">{label(lastStep!, index - 1)}</p>
              {notes.slice(0, 2).map((note) => (
                <p key={note.text} className={note.source === 'author' ? '' : 'text-muted-foreground'}>
                  <RichText text={note.text} />
                </p>
              ))}
            </div>
          )}

          {state.mode === 'learn' && (
            <ExplorerPanel epd={shownEpd} onPlay={(uci) => usePlay.getState().exploreMove(uci)} />
          )}

          {complete && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {results.length === 0
                    ? 'You have played through the line.'
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
                  <Button onClick={() => chooseMode('practice')}>
                    <Target aria-hidden /> Now practise it
                  </Button>
                ) : (
                  <Button onClick={() => usePlay.getState().restart()}>
                    <RotateCcw aria-hidden /> {drill ? 'Another branch' : 'Practise again'}
                  </Button>
                )}
                {next && (
                  <Button asChild variant="outline">
                    <a href={to(`/play/${course}/${next.id}/${state.mode}`)}>Next: {next.name}</a>
                  </Button>
                )}
                <Button asChild variant="ghost">
                  <a href={to(`/course/${course}`)}>Back to the course</a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
