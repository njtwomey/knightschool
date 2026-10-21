import { regretSummary, REGRET_CAP, REGRET_WORDS, type Regret } from '@knightschool/core';
import { useEffect, useState } from 'react';
import { StaticBoard } from '@/components/board/static-board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useEnginePrefs } from '@/features/engine/prefs';
import { checkMisses, useMissChecks, type Miss, type MissCheck } from './regret';
import { useReview } from './store';

// Board arrows take a colour string, not a class: the same green the quiz uses for the course's move.
const COURSE_ARROW = 'rgb(21 128 61 / 0.85)';
const PLAYED_ARROW = 'rgb(220 38 38 / 0.8)';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const badgeVariant = (regret: Regret) =>
  regret.verdict === 'mistake' ? 'destructive' : regret.verdict === 'inaccuracy' ? 'outline' : 'secondary';

/**
 * After the quiz: every wrong move tried, and what the engine thinks it cost against the course's move, so a move that
 * is just as good (a memory slip) can be told from one that loses something (a real mistake). Checked one at a time
 * once the session is over, from the baked analysis where it covers the moves and the browser engine otherwise.
 */
export function MissList() {
  const misses = useReview((state) => state.misses);
  const checks = useMissChecks((state) => state.checks);
  const auto = useEnginePrefs((state) => state.auto);
  // The browser engine runs only when it is on in Settings, or when asked for here.
  const [live, setLive] = useState(auto);

  useEffect(() => {
    const controller = new AbortController();
    void checkMisses(misses, live, controller.signal);
    return () => controller.abort();
  }, [misses, live]);

  if (misses.length === 0) return null;
  const regrets = misses.map((miss) => {
    const check = checks[miss.key];
    return check?.status === 'done' ? check.regret : undefined;
  });
  const summary = regretSummary(regrets);
  const settled = misses.filter((miss) => {
    const status = checks[miss.key]?.status;
    return status === 'done' || status === 'failed' || status === 'skipped';
  }).length;
  const skipped = misses.some((miss) => checks[miss.key]?.status === 'skipped');
  const courses = new Set(misses.map((miss) => miss.openingId)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plural(misses.length, 'wrong move', 'wrong moves')}</CardTitle>
        <CardDescription className="grid gap-1" aria-live="polite">
          {summary.checked > 0 && (
            <span>
              {[
                summary.slips && `${summary.slips} as good or nearly`,
                summary.inaccuracies && plural(summary.inaccuracies, 'small inaccuracy', 'small inaccuracies'),
                summary.mistakes && plural(summary.mistakes, 'real mistake', 'real mistakes'),
              ]
                .filter(Boolean)
                .join(', ')}
              {summary.checked < misses.length && ` so far, of ${summary.checked} checked`}.{' '}
              {`Together they cost ${summary.totalCp} centipawns, ${summary.averageCp} a move on average.`}
            </span>
          )}
          {settled < misses.length && <span>Checking with the engine, one move at a time…</span>}
          <span>
            Red arrow: your move. Green: the course's. A loss under 30 centipawns is a slip of memory, not of chess.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {skipped && settled === misses.length && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Some moves are not in the analysis that comes with the app, and the engine is off in Settings.
            <Button size="sm" variant="outline" onClick={() => setLive(true)}>
              Check them in your browser
            </Button>
          </div>
        )}
        <ol className="grid gap-4">
          {misses.map((miss, index) => (
            <MissRow key={miss.key} miss={miss} index={index} check={checks[miss.key]} showCourse={courses > 1} />
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function MissRow({
  miss,
  index,
  check,
  showCourse,
}: {
  miss: Miss;
  index: number;
  check: MissCheck | undefined;
  showCourse: boolean;
}) {
  const from = (uci: string, color: string) => ({ startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color });
  return (
    <li className="flex flex-col gap-3 border-t pt-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start">
      <StaticBoard
        id={`miss-${index}`}
        source={{ epd: miss.epd }}
        orientation={miss.side}
        coordinates={false}
        arrows={[from(miss.playedUci, PLAYED_ARROW), from(miss.expectedUci, COURSE_ARROW)]}
        className="max-w-56 shrink-0 sm:w-32"
      />
      <div className="grid min-w-0 gap-1.5 text-sm">
        <p>
          You played <span className="font-medium">{miss.playedSan}</span>, the course plays{' '}
          <span className="font-medium">{miss.expectedSan}</span>.
        </p>
        {showCourse && <p className="text-xs text-muted-foreground">{miss.courseName}</p>}
        <Verdict check={check} />
      </div>
    </li>
  );
}

function Verdict({ check }: { check: MissCheck | undefined }) {
  if (!check || check.status === 'pending') {
    return (
      <div className="grid gap-1.5" aria-label="Checking">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }
  if (check.status === 'skipped') return <p className="text-muted-foreground">Not checked: the engine is off.</p>;
  if (check.status === 'failed') return <p className="text-muted-foreground">The engine could not check this one.</p>;
  const { regret } = check;
  return (
    <>
      <p className="flex flex-wrap items-center gap-2">
        <Badge variant={badgeVariant(regret)}>
          {regret.mate ? 'mate' : regret.cp >= REGRET_CAP ? `${REGRET_CAP}+ cp` : `${regret.cp} cp`}
        </Badge>
        <span>
          {regret.verdict === 'better'
            ? `The engine likes yours more, by ${regret.gainCp} centipawns: the course just chose another way.`
            : REGRET_WORDS[regret.verdict]}
          {regret.mate === 'allowed' && ' It allows a forced mate.'}
          {regret.mate === 'missed' && ' It misses a forced mate.'}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        {check.baked ? 'Searched ahead of time' : 'Searched in your browser'}
        {Number.isFinite(check.depth) && `, depth ${check.depth}`}
      </p>
    </>
  );
}
