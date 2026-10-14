import { formatMs, speedSummary } from '@knightschool/core';
import { Play, RotateCcw, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { to } from '@/router/location';
import { LINES_PER_RUN, useSpeed } from './store';

/** A stopwatch for the move in front of you, redrawn ten times a second only while a line is being played. */
function useClock(running: boolean, since: number): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [running]);
  return Math.max(0, now - since);
}

const Big = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-3xl font-semibold tabular-nums">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

/**
 * Speed: five lines from the courses you are learning, played from memory against the clock. The opponent answers
 * the instant you move, so the time is all yours. The result is the average time per move.
 */
export function SpeedPage() {
  const state = useSpeed();
  const { phase, queue, lineIndex, stepIndex, times, errors, lastMs, badge, results, turnStartedAt } = state;

  useEffect(() => {
    void useSpeed.getState().load();
    return () => useSpeed.getState().stop();
  }, []);
  // Load again if the store was reset while the page stayed open.
  useEffect(() => {
    if (useSpeed.getState().phase === 'idle') void useSpeed.getState().load();
  }, [phase]);

  const clock = useClock(phase === 'playing', turnStartedAt);

  if (phase === 'idle' || phase === 'loading') return <Skeleton className="mx-auto mt-6 h-[28rem] max-w-5xl" />;
  if (phase === 'error') {
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Speed could not start</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </Page>
    );
  }
  if (phase === 'summary') return <Summary />;

  const queued = queue[lineIndex];
  if (!queued) return null;
  const side = queued.content.opening.side;
  const steps = queued.steps;
  const finished = stepIndex >= steps.length;
  const epd = finished ? steps.at(-1)!.edge.to : steps[stepIndex]!.fromEpd;
  const previous = steps[Math.min(stepIndex, steps.length) - 1];
  const running = phase === 'playing';
  const soFar = speedSummary([
    ...results,
    { moves: times.length, errors, totalMs: times.reduce((sum, ms) => sum + ms, 0), slowestMs: 0 },
  ]);

  return (
    <Page className="gap-4 lg:grid-cols-[minmax(0,min(36rem,calc(100dvh-11rem)))_1fr]">
      <div className="grid content-start gap-3">
        <AppBoard
          id="speed"
          className="aspect-square w-full"
          epd={epd}
          orientation={side}
          interactive={running}
          onMove={(uci) => useSpeed.getState().submitMove(uci)}
          lastMove={previous?.edge.uci}
          badge={badge}
        />
        <div className="flex items-center gap-2">
          <BoardSettingsButton />
        </div>
      </div>

      <div className="grid content-start gap-4">
        <div className="flex items-center gap-3">
          <Progress value={(lineIndex / LINES_PER_RUN) * 100} className="flex-1" aria-label="Run progress" />
          <span className="text-sm text-muted-foreground" role="status">
            Line {lineIndex + 1} of {queue.length}
          </span>
        </div>

        {phase === 'ready' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Timer aria-hidden /> Speed
              </CardTitle>
              <CardDescription>
                {queue.length} lines, played from memory against the clock. The other side replies the instant you move,
                so every millisecond is yours. A wrong move is counted and the clock keeps running.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => useSpeed.getState().begin()}>
                <Play aria-hidden /> Start
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardDescription>{queued.content.opening.name}</CardDescription>
                <CardTitle className="text-5xl font-semibold tabular-nums">
                  {phase === 'between' ? 'Line done' : formatMs(clock)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {phase === 'between' ? (
                  <>
                    {results.at(-1) &&
                      `${formatMs(results.at(-1)!.totalMs / Math.max(1, results.at(-1)!.moves))} per move. `}
                    Next line coming up.
                  </>
                ) : (
                  <>Your move as {side}. The other side answers at once.</>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              <Big label="last move" value={formatMs(lastMs)} />
              <Big label="average so far" value={formatMs(soFar.averageMs)} />
              <Big label="wrong moves" value={String(soFar.errors)} />
            </div>
          </>
        )}
      </div>
    </Page>
  );
}

function Summary() {
  const results = useSpeed((state) => state.results);
  const summary = speedSummary(results);
  return (
    <Page className="max-w-3xl">
      <header className="grid gap-1">
        <h2 className="text-3xl font-semibold tracking-tight">Run done</h2>
        <p className="text-muted-foreground">
          {summary.averageMs === null
            ? 'No moves were played.'
            : `${formatMs(summary.averageMs)} per move on average, over ${summary.moves} moves.`}
        </p>
      </header>
      <div className="grid grid-cols-3 gap-3">
        <Big label="average per move" value={formatMs(summary.averageMs)} />
        <Big label="best line pace" value={formatMs(summary.bestLineMs)} />
        <Big label="wrong moves" value={String(summary.errors)} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table aria-label="Lines in this run">
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead className="text-right">Per move</TableHead>
                <TableHead className="text-right">Slowest</TableHead>
                <TableHead className="text-right">Wrong</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={`${result.courseId}/${result.lineId}`}>
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{result.lineName}</span>{' '}
                    <span className="text-xs text-muted-foreground">{result.courseName}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMs(result.totalMs / Math.max(1, result.moves))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMs(result.slowestMs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{result.errors}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void useSpeed.getState().load()}>
          <RotateCcw aria-hidden /> Another run
        </Button>
        <Button asChild variant="outline">
          <a href={to('/profile/stats')}>Stats</a>
        </Button>
      </div>
    </Page>
  );
}
