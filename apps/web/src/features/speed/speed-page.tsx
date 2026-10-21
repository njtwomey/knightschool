import { formatMs, speedSummary } from '@knightschool/core';
import { useEffect } from 'react';
import { uciArrow } from '@/components/board/shapes';
import { StudyBoard } from '@/components/board/study-board';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PracticeBar, PracticeSetup } from '@/components/practice-setup';
import { saveConfig, savedConfig, type SpeedConfig } from '@/data/practice-config';
import { useCatalog } from '@/data/catalog-store';
import { to } from '@/router/location';
import { useSpeed } from './store';
import { FEEDBACK_DELAYS } from '@/lib/feedback';
import { profileHref } from '@/router/hrefs';
import { useNow } from '@/hooks/use-now';

const countdown = (ms: number) => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const Big = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-3xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

/**
 * What to call a line on screen: the opening first ("French Defence"), then the variation under it ("Advance Variation,
 * Ne7 System"), never the variation alone. A variation name that starts with the opening's own name loses that start.
 */
function useTitles() {
  const openings = useCatalog((state) => state.openings);
  return (content: { opening: { opening: string; name: string } }, lineName: string) => {
    const opening =
      openings.find((candidate) => candidate.id === content.opening.opening)?.name ?? content.opening.name;
    const firstWord = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z]/g, ' ')
        .trim()
        .split(' ')[0];
    const [head, ...rest] = lineName.split(': ');
    const variation = rest.length > 0 && firstWord(head!) === firstWord(opening) ? rest.join(': ') : lineName;
    return { opening, variation };
  };
}

/** Between lines of a fixed run: what is coming next and a five second countdown, with a way to skip the wait. */
function BetweenDialog() {
  const { phase, queue, lineIndex, betweenEndsAt } = useSpeed();
  const open = phase === 'between';
  const now = useNow(open);
  const titles = useTitles();
  const next = queue[lineIndex + 1];
  const nextTitles = next ? titles(next.content, next.lineName) : undefined;
  const left = Math.max(0, betweenEndsAt - now);
  const total = FEEDBACK_DELAYS.betweenLines;
  return (
    <Dialog open={open && !!next} modal={false}>
      {open && <div className="fixed inset-x-0 top-[3.25rem] bottom-0 z-40 bg-black/55 backdrop-blur-sm" />}
      <DialogContent showCloseButton={false} overlay={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogDescription>Next up</DialogDescription>
          <DialogTitle className="text-2xl leading-tight">{nextTitles?.opening}</DialogTitle>
          <p className="text-lg font-medium">{nextTitles?.variation}</p>
          <DialogDescription>You play {next?.content.opening.side}.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <p className="text-center text-5xl font-semibold tabular-nums" aria-live="off">
            {Math.ceil(left / 1000)}
          </p>
          <Progress value={(left / total) * 100} aria-label="Time until the next line" />
        </div>
        <DialogFooter>
          <Button onClick={() => useSpeed.getState().startNow()}>Start now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const begin = (config: SpeedConfig) => {
  saveConfig('speed', config);
  void useSpeed.getState().start(config);
};

/**
 * Speed: lines from your courses played from memory against the clock. The opponent answers the instant you move, so
 * the time is all yours. A run is a set of lines, scored by the average time per move, or a fixed time, scored by how
 * many moves you make. It opens on the set-up card.
 */
export function SpeedPage() {
  const state = useSpeed();
  const { phase, config, queue, lineIndex, stepIndex, times, errors, hints, hintLevel, lastMs, badge, results } = state;

  // A new run starts with its set-up.
  useEffect(() => {
    useSpeed.getState().reset();
    return () => useSpeed.getState().stop();
  }, []);

  const now = useNow(phase === 'playing');
  const titles = useTitles();

  if (phase === 'idle') {
    return (
      <Page className="max-w-xl gap-4 py-8">
        <PracticeSetup mode="speed" initial={savedConfig('speed')} onStart={begin} />
      </Page>
    );
  }
  if (phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'error') {
    return (
      <Page className="max-w-xl gap-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Speed could not start</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
        <PracticeSetup mode="speed" initial={config} onStart={begin} startLabel="Try again" />
      </Page>
    );
  }
  if (phase === 'summary') return <Summary />;

  const queued = queue[Math.max(lineIndex, 0)];
  if (!queued) return null;
  const timed = config.run === 'timed';
  const side = queued.content.opening.side;
  const steps = queued.steps;
  const finished = stepIndex >= steps.length;
  const epd = finished ? steps.at(-1)!.edge.to : steps[stepIndex]!.fromEpd;
  const previous = steps[Math.min(stepIndex, steps.length) - 1];
  const running = phase === 'playing';
  const upNext = phase === 'between' ? queue[lineIndex + 1] : queued;
  const shown = titles((upNext ?? queued).content, (upNext ?? queued).lineName);
  const expected = !finished ? steps[stepIndex]!.edge.uci : undefined;
  const clock = Math.max(0, now - state.turnStartedAt);
  const remaining = state.deadline - now;
  const soFar = speedSummary([
    ...results,
    { moves: times.length, errors, hints, totalMs: times.reduce((sum, ms) => sum + ms, 0), slowestMs: 0 },
  ]);

  return (
    <Page className="gap-4">
      <BetweenDialog />
      <PracticeBar mode="speed" config={config} onStart={begin} />
      <div className="board-columns grid gap-6">
        <StudyBoard
          id="speed"
          epd={epd}
          orientation={side}
          interactive={running}
          onMove={(uci) => useSpeed.getState().submitMove(uci)}
          lastMove={previous?.edge.uci}
          lastMoveTone="red"
          badge={badge}
          hintSquare={running && expected && hintLevel >= 1 ? expected.slice(0, 2) : null}
          arrows={running && expected && hintLevel === 2 ? [uciArrow(expected)] : []}
          controls={{
            // Two steps, as in Play and the quiz: the piece first, then the move. Both are counted.
            hint: running
              ? { onHint: () => useSpeed.getState().hint(), disabled: hintLevel > 0 || finished }
              : undefined,
            show: running
              ? { onShow: () => useSpeed.getState().show(), disabled: hintLevel === 2 || finished }
              : undefined,
          }}
        />

        <div className="grid content-start gap-4">
          <div className="flex items-center gap-3">
            {timed ? (
              <Progress
                value={
                  phase === 'between' ? 0 : Math.min(100, (1 - Math.max(0, remaining) / (config.seconds * 1000)) * 100)
                }
                className="flex-1"
                aria-label="Time used"
              />
            ) : (
              <Progress
                value={(Math.max(lineIndex, 0) / queue.length) * 100}
                className="flex-1"
                aria-label="Run progress"
              />
            )}
            <span className="text-sm text-muted-foreground" role="status">
              {timed ? `${config.seconds} seconds` : `Line ${Math.max(lineIndex, 0) + 1} of ${queue.length}`}
            </span>
          </div>

          {
            <>
              <Card>
                <CardHeader>
                  <CardDescription>
                    {phase === 'between' ? 'Up next, playing ' : 'Playing '}
                    {upNext?.content.opening.side ?? side}
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold leading-tight">{shown.opening}</CardTitle>
                  <p className="text-lg font-medium">{shown.variation}</p>
                  <p className="text-5xl font-semibold tabular-nums">
                    {phase === 'between' ? 'Get ready' : timed ? countdown(remaining) : formatMs(clock)}
                  </p>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {phase === 'between' ? (
                    <>
                      {results.at(-1) &&
                        `Last line: ${formatMs(results.at(-1)!.totalMs / Math.max(1, results.at(-1)!.moves))} per move. `}
                      {upNext && 'Starting in a moment.'}
                    </>
                  ) : timed ? (
                    <>This move: {formatMs(clock)}. Hints are counted, and the clock keeps running.</>
                  ) : (
                    <>
                      The other side answers at once. Stuck? Hint marks the piece and Show me the move: each is counted,
                      and the clock keeps running.
                    </>
                  )}
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Big
                  label={timed ? 'moves made' : 'last move'}
                  value={timed ? String(soFar.moves) : formatMs(lastMs)}
                />
                <Big label="average so far" value={formatMs(soFar.averageMs)} />
                <Big label="wrong moves" value={String(soFar.errors)} />
                <Big label="hints used" value={String(soFar.hints)} />
              </div>
            </>
          }
        </div>
      </div>
    </Page>
  );
}

function Summary() {
  const results = useSpeed((state) => state.results);
  const config = useSpeed((state) => state.config);
  const summary = speedSummary(results);
  const timed = config.run === 'timed';
  const titles = useTitles();
  const courses = useCatalog((state) => state.index);
  const titleOfResult = (result: (typeof results)[number]) =>
    titles(
      {
        opening: {
          opening: courses.find((course) => course.id === result.courseId)?.opening ?? '',
          name: result.courseName,
        },
      },
      result.lineName,
    );
  return (
    <Page className="max-w-3xl">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">{timed ? 'Time is up' : 'Run done'}</h2>
        <p className="text-muted-foreground">
          {summary.moves === 0
            ? 'No moves were played.'
            : timed
              ? `${summary.moves} moves in ${config.seconds} seconds, ${formatMs(summary.averageMs)} per move on average.`
              : `${formatMs(summary.averageMs)} per move on average, over ${summary.moves} moves.`}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {timed ? (
          <Big label="moves made" value={String(summary.moves)} />
        ) : (
          <Big label="average per move" value={formatMs(summary.averageMs)} />
        )}
        {timed ? (
          <Big label="average per move" value={formatMs(summary.averageMs)} />
        ) : (
          <Big label="best line pace" value={formatMs(summary.bestLineMs)} />
        )}
        <Big label="wrong moves" value={String(summary.errors)} />
        <Big label="hints used" value={String(summary.hints)} />
      </div>
      <PracticeSetup mode="speed" initial={config} onStart={begin} title="Another run" startLabel="Again" />
      <Card>
        <CardContent className="pt-6">
          <Table aria-label="Lines in this run">
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead className="text-right">Moves</TableHead>
                <TableHead className="text-right">Per move</TableHead>
                <TableHead className="text-right">Slowest</TableHead>
                <TableHead className="text-right">Wrong</TableHead>
                <TableHead className="text-right">Hints</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, i) => (
                <TableRow key={`${result.courseId}/${result.lineId}/${i}`}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{titleOfResult(result).opening}</span>{' '}
                    <span className="text-muted-foreground">{titleOfResult(result).variation}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{result.moves}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMs(result.totalMs / Math.max(1, result.moves))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMs(result.slowestMs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{result.errors}</TableCell>
                  <TableCell className="text-right tabular-nums">{result.hints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={to(profileHref('stats'))}>Stats</a>
        </Button>
      </div>
    </Page>
  );
}
