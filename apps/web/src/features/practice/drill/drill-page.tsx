import { drillExercises, drillScope, numberedMove, scopePositions, type Score } from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { Square } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Try } from '@/components/chess/tries-table';
import { EvalWords } from '@/components/chess/eval-words';
import { PracticeBar } from '@/components/practice/practice-bar';
import type { PracticeConfig, PracticeSource } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { bakedScore } from '@/features/learn/model';
import { openingHref } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { loadProgress, practiceOpenings, type LearnerProgress } from '../progress';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { practiceSources, scopeOf, sourceOfScope, type PracticeScope } from '../sources';
import { nextStateOf } from '../today/next';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';

const ROOT = { label: 'Practice', href: to('/practice') };
const band = () => {
  const ratings = siteConfig.coverage.band.ratings;
  return `${ratings[0]} to ${ratings.at(-1)}`;
};

/**
 * Drill (docs/v2/pages/drill.md): every branch of an opening or a variation, the computer replying as players at the
 * band do among the opening's replies, the learner answering with the opening's move until the line ends.
 * `/practice/drill` is the set-up card; `/practice/drill/<opening>[/<variation>]` starts at once.
 */
export function DrillPage({ scope }: { scope?: PracticeScope }) {
  const data = useLoad(() => loadProgress(), []);
  const name = scope ? data.data?.openings.find((one) => one.opening.id === scope.opening)?.opening.name : undefined;
  const crumbs = [{ label: 'Drill', ...(scope ? { href: to('/practice/drill') } : {}) }];
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={ROOT} crumbs={name ? [...crumbs, { label: name }] : crumbs} />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <DrillView progress={data.data} scope={scope} />
      )}
    </main>
  );
}

type Running = { config: PracticeConfig; scope: PracticeScope; key: number };

/** The opening and variation a set-up drills: a fixed source's first opening of the learner's. */
function scopeFor(progress: LearnerProgress, config: PracticeConfig): PracticeScope | null {
  const scope = scopeOf(config.source);
  if (scope && progress.openings.some((one) => one.opening.id === scope.opening)) return scope;
  const first = practiceOpenings(progress)[0];
  return first ? { opening: first.opening.id } : null;
}

function DrillView({ progress, scope }: { progress: LearnerProgress; scope?: PracticeScope }) {
  const saved = readPracticeConfig('drill');
  const [running, setRunning] = useState<Running | null>(() =>
    scope ? { config: { ...saved, source: sourceOfScope(scope) }, scope, key: 0 } : null,
  );
  const sources = useMemo<PracticeSource[]>(
    () =>
      practiceSources(
        progress.openings.map((one) => one.opening),
        (s) => {
          const opening = progress.openings.find((one) => one.opening.id === s.opening)?.opening;
          return opening ? scopePositions(drillScope(opening, s.variation)).length : undefined;
        },
      ),
    [progress],
  );
  const start = (config: PracticeConfig) => {
    savePracticeConfig('drill', config);
    const next = scopeFor(progress, config);
    if (next) setRunning((last) => ({ config, scope: next, key: (last?.key ?? 0) + 1 }));
  };
  if (!running) {
    return <PracticeSetup mode="drill" initial={saved} sources={sources} only={['source']} onStart={start} />;
  }
  const one = progress.openings.find((candidate) => candidate.opening.id === running.scope.opening);
  if (!one) return <EmptyState kind="no-match" size="page" text="There is no such opening to drill." />;
  return (
    <DrillSession
      key={running.key}
      opening={one.opening}
      facts={one.facts}
      running={running}
      sources={sources}
      onStart={start}
    />
  );
}

function DrillSession({
  opening,
  facts,
  running,
  sources,
  onStart,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  running: Running;
  sources: PracticeSource[];
  onStart: (config: PracticeConfig) => void;
}) {
  const variation = running.scope.variation;
  const variationName = variation ? (opening.variations.find((v) => v.id === variation)?.name ?? variation) : undefined;
  const exercises = useMemo(
    () => drillExercises(opening, drillScope(opening, variation), siteConfig.practice.drillRuns, variation),
    [opening, variation],
  );
  const empty = !Object.keys(exercises[0]?.grader.kind === 'exact' ? (exercises[0].grader.book ?? {}) : {}).length;
  const [stopped, setStopped] = useState<{ results: ExerciseResult[]; tries: Try[] } | null>(null);
  const session = useExerciseSession({ exercises: empty ? [] : exercises, opening, facts, save: 'moves' });
  const summary = `${variationName ? `${opening.name}: ${variationName}` : opening.name}, every branch, replies as ${band()} players play`;
  const ended = useEndings(session, facts);

  if (empty) {
    return (
      <EmptyState
        kind="not-covered"
        size="page"
        text="Nothing to drill here: these lines have no moves of yours that come back in reviews."
        action={{ label: `Open the ${opening.name}`, href: openingHref(opening.id) }}
      />
    );
  }
  if (session.done || stopped) {
    const results = stopped?.results ?? session.results;
    return (
      <DrillSummary
        results={results}
        tries={stopped?.tries ?? session.tries}
        running={running}
        sources={sources}
        onStart={onStart}
      />
    );
  }
  const opponent = lastReply(session, opening, facts);
  return (
    <div className="grid gap-4">
      <PracticeBar
        mode="drill"
        config={running.config}
        sources={sources}
        only={['source']}
        summary={summary}
        progress={{ done: session.results.length, total: session.total }}
        onStart={onStart}
      />
      <ExerciseBoard
        session={session}
        aside={
          <div className="grid gap-1 text-sm">
            <p className="font-medium">
              Branch {Math.min(session.index + 1, session.total)} of {session.total}
            </p>
            {opponent ? <p className="text-muted-foreground">{opponent}</p> : null}
            {ended ? (
              <p className="text-muted-foreground">
                The last branch left you: <EvalWords score={ended} />
              </p>
            ) : null}
          </div>
        }
        footer={
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStopped({ results: session.results, tries: session.tries })}
            >
              <Square aria-hidden /> Stop
            </Button>
          </div>
        }
      />
    </div>
  );
}

type Session = ReturnType<typeof useExerciseSession>;

/** "Black chose 3...Nf6, played in 41% of games at your band", for the opponent's last move. */
function lastReply(session: Session, opening: BuiltOpening, facts?: OpeningFacts): string | null {
  const i = session.played.findLastIndex((move) => !move.mine);
  if (i < 0 || !session.exercise) return null;
  const move = session.played[i]!;
  const before = i === 0 ? session.exercise.start : session.played[i - 1]!.epd;
  const counts = facts?.counts[before];
  const games = counts?.moves.find((m) => m.uci === move.uci)?.games;
  const side = session.exercise.side === 'white' ? 'Black' : 'White';
  const label = numberedMove(opening.startPly + i, move.san);
  if (!counts?.games || !games) return `${side} chose ${label}.`;
  return `${side} chose ${label}, played in ${Math.round((games / counts.games) * 100)}% of games at your band.`;
}

/** Where each finished branch left the learner, from the shipped evaluations. */
function useEndings(session: Session, facts?: OpeningFacts): Score | null {
  const [score, setScore] = useState<Score | null>(null);
  const seen = useRef(0);
  useEffect(() => {
    if (session.results.length === seen.current) return;
    seen.current = session.results.length;
    setScore(bakedScore(facts, session.epd));
  }, [session.results.length, session.epd, facts]);
  return score;
}

function DrillSummary({
  results,
  tries,
  running,
  sources,
  onStart,
}: {
  results: ExerciseResult[];
  tries: Try[];
  running: Running;
  sources: PracticeSource[];
  onStart: (config: PracticeConfig) => void;
}) {
  const next = useLoad(async () => nextStateOf(await loadProgress()), [results.length]);
  const clean = results.filter((r) => r.right && !r.hint).length;
  const firstTime = tries.filter((t, i) => t.grade === 'book' && tries[i - 1]?.ply !== t.ply).length;
  return (
    <SessionSummary
      mode="drill"
      headline={`Drill done: ${results.length} ${results.length === 1 ? 'branch' : 'branches'}`}
      sentence={`${clean} with no mistakes; ${firstTime} of your moves right first time.`}
      figures={[
        { value: String(results.length), label: 'branches played' },
        { value: String(clean), label: 'with no mistakes' },
        { value: String(firstTime), label: 'moves right first time' },
      ]}
      tries={tries}
      {...(next.data
        ? {
            next: {
              state: next.data,
              form: 'with-alternatives' as const,
              alternatives: [
                { label: 'Back to Today', href: to('/today'), hint: 'What to do next, and what is due.' },
                { label: 'Practise something else', href: to('/practice'), hint: 'Every practice mode.' },
              ],
            },
          }
        : {})}
      again={{ config: running.config, sources, only: ['source'], onStart }}
    />
  );
}
