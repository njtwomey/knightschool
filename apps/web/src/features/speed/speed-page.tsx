import { formatMs, speedSummary } from '@knightschool/core';
import { Lightbulb, Play, RotateCcw, Settings2, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
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
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBrowse } from '@/features/browse/store';
import { to } from '@/router/location';
import { SPEED_DELAYS, useSpeed, type SpeedConfig } from './store';

/** A stopwatch redrawn ten times a second, only while a line is being played. */
function useNow(running: boolean): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

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
  const openings = useBrowse((state) => state.openings);
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
  const total = SPEED_DELAYS.betweenLines;
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

/** The choices for a run, in a window that opens whenever a new run is started. */
function SetupDialog() {
  const phase = useSpeed((state) => state.phase);
  const config = useSpeed((state) => state.config);
  const index = useBrowse((state) => state.index);
  const set = (change: Partial<SpeedConfig>) => useSpeed.getState().setConfig({ ...config, ...change });

  return (
    // Not modal, with the dimming drawn below the header, so the navigation stays usable while the window is open.
    <Dialog open={phase === 'setup'} modal={false}>
      {phase === 'setup' && (
        <div className="fixed inset-x-0 top-[3.25rem] bottom-0 z-40 bg-black/55 backdrop-blur-sm" />
      )}
      <DialogContent
        showCloseButton={false}
        overlay={false}
        className="sm:max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer aria-hidden /> Set up a speed run
          </DialogTitle>
          <DialogDescription>
            Play lines you know from memory against the clock. The other side answers the instant you move.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label>What kind of run</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={config.mode}
              onValueChange={(mode) => mode && set({ mode: mode as SpeedConfig['mode'] })}
              className="justify-self-start"
            >
              <ToggleGroupItem value="lines">A set of lines</ToggleGroupItem>
              <ToggleGroupItem value="timed">Against the clock</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-sm text-muted-foreground">
              {config.mode === 'lines'
                ? 'Play each line through to the end. You get your average time per move.'
                : 'Lines keep coming until the time is up. How many moves can you make?'}
            </p>
          </div>

          {config.mode === 'lines' ? (
            <div className="grid gap-2">
              <Label>How many lines</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(config.lines)}
                onValueChange={(value) => value && set({ lines: Number(value) as SpeedConfig['lines'] })}
                className="justify-self-start"
              >
                {[3, 5, 10].map((n) => (
                  <ToggleGroupItem key={n} value={String(n)}>
                    {n} lines
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label>How long</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={String(config.seconds)}
                onValueChange={(value) => value && set({ seconds: Number(value) as SpeedConfig['seconds'] })}
                className="justify-self-start"
              >
                {[30, 60, 120].map((n) => (
                  <ToggleGroupItem key={n} value={String(n)}>
                    {n === 60 ? '1 minute' : n === 120 ? '2 minutes' : `${n} seconds`}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="speed-source">Lines from</Label>
            <Select value={config.source} onValueChange={(source) => set({ source })}>
              <SelectTrigger id="speed-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">The courses I am learning</SelectItem>
                <SelectItem value="all">Everything</SelectItem>
                {index.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button size="lg" onClick={() => void useSpeed.getState().prepare()}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Speed: lines from your courses played from memory against the clock. The opponent answers the instant you move, so
 * the time is all yours. A run is a set of lines, scored by the average time per move, or a fixed time, scored by how
 * many moves you make.
 */
export function SpeedPage() {
  const state = useSpeed();
  const { phase, config, queue, lineIndex, stepIndex, times, errors, hints, hintLevel, lastMs, badge, results } = state;

  // A new run starts with its set-up.
  useEffect(() => {
    if (useSpeed.getState().phase === 'idle') useSpeed.getState().openSetup();
    return () => useSpeed.getState().stop();
  }, []);
  useEffect(() => {
    if (useSpeed.getState().phase === 'idle') useSpeed.getState().openSetup();
  }, [phase]);

  const now = useNow(phase === 'playing');
  const titles = useTitles();

  if (phase === 'idle' || phase === 'setup') {
    return (
      <Page>
        <SetupDialog />
        <Skeleton className="mx-auto h-[28rem] w-full max-w-5xl" />
      </Page>
    );
  }
  if (phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'error') {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Speed could not start</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
        <div>
          <Button onClick={() => useSpeed.getState().openSetup()}>Change the set-up</Button>
        </div>
      </Page>
    );
  }
  if (phase === 'summary') return <Summary />;

  const queued = queue[Math.max(lineIndex, 0)];
  if (!queued) return null;
  const timed = config.mode === 'timed';
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
    <Page className="gap-4 lg:grid-cols-[minmax(0,min(36rem,calc(100dvh-11rem)))_1fr]">
      <BetweenDialog />
      <div className="grid content-start gap-3">
        <AppBoard
          id="speed"
          className="aspect-square w-full"
          epd={epd}
          orientation={side}
          interactive={running}
          onMove={(uci) => useSpeed.getState().submitMove(uci)}
          lastMove={previous?.edge.uci}
          lastMoveTone="red"
          badge={badge}
          hintSquare={running && expected && hintLevel >= 1 ? expected.slice(0, 2) : null}
          arrows={
            running && expected && hintLevel === 2
              ? [{ startSquare: expected.slice(0, 2), endSquare: expected.slice(2, 4), color: 'rgb(21 128 61 / 0.85)' }]
              : []
          }
        />
        <div className="flex items-center gap-2">
          <BoardSettingsButton />
          {running && (
            <Button variant="outline" onClick={() => useSpeed.getState().hint()} disabled={hintLevel === 2 || finished}>
              <Lightbulb aria-hidden /> {hintLevel === 0 ? 'Hint' : 'Show the move'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid content-start gap-4">
        <div className="flex items-center gap-3">
          {timed ? (
            <Progress
              value={
                phase === 'ready' ? 0 : Math.min(100, (1 - Math.max(0, remaining) / (config.seconds * 1000)) * 100)
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

        {phase === 'ready' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Timer aria-hidden /> {timed ? 'Against the clock' : 'Speed'}
              </CardTitle>
              <CardDescription>
                {timed
                  ? `${config.seconds} seconds. Make as many right moves as you can; the next line starts the moment one ends.`
                  : `${queue.length} lines, played from memory. Your average time per move is the score.`}{' '}
                The other side replies the instant you move. A wrong move is counted and the clock keeps running.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-0.5 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">First line</p>
                <p className="text-xl font-semibold leading-tight">{shown.opening}</p>
                <p className="font-medium">{shown.variation}</p>
                <p className="text-sm text-muted-foreground">
                  You play {side}.{!timed && ' The other lines follow on their own.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={() => useSpeed.getState().begin()}>
                  <Play aria-hidden /> Start
                </Button>
                <Button size="lg" variant="outline" onClick={() => useSpeed.getState().openSetup()}>
                  <Settings2 aria-hidden /> Change the set-up
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                    The other side answers at once. Use Hint if you are stuck: it is counted, and the clock keeps
                    running.
                  </>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Big label={timed ? 'moves made' : 'last move'} value={timed ? String(soFar.moves) : formatMs(lastMs)} />
              <Big label="average so far" value={formatMs(soFar.averageMs)} />
              <Big label="wrong moves" value={String(soFar.errors)} />
              <Big label="hints used" value={String(soFar.hints)} />
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

function Summary() {
  const results = useSpeed((state) => state.results);
  const config = useSpeed((state) => state.config);
  const summary = speedSummary(results);
  const timed = config.mode === 'timed';
  const titles = useTitles();
  const courses = useBrowse((state) => state.index);
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
        <Button onClick={() => void useSpeed.getState().prepare()}>
          <RotateCcw aria-hidden /> Same again
        </Button>
        <Button variant="outline" onClick={() => useSpeed.getState().openSetup()}>
          <Settings2 aria-hidden /> Change the set-up
        </Button>
        <Button asChild variant="ghost">
          <a href={to('/profile/stats')}>Stats</a>
        </Button>
      </div>
    </Page>
  );
}
