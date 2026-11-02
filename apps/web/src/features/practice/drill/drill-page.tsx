import {
  branchExercise,
  drillBranches,
  drillExercises,
  drillScope,
  numberedMove,
  orderBranches,
  resumeBranch,
  scopePositions,
  type DrillBranch,
  type Exercise,
  type Score,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { Square, Swords } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Try } from '@/components/chess/tries-table';
import { EvalWords } from '@/components/chess/eval-words';
import { PracticeBar } from '@/components/practice/practice-bar';
import { COMPUTER_NAME, type PracticeConfig, type PracticeSource } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { bakedScore, cardStates } from '@/features/learn/model';
import { openingHref } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { mergeFacts, mergeOpenings } from '../merge';
import { playOnHref } from '../play-on/play-on-data';
import { loadProgress, practiceOpenings, type LearnerProgress, type OpeningProgress } from '../progress';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { practiceSources, scopeOf, sourceOfScope, type PracticeScope } from '../sources';
import { nextStateOf } from '../today/next';
import { openTry } from '../try-position';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';

const ROOT = { label: 'Practice', href: to('/practice') };
const band = () => {
  const ratings = siteConfig.coverage.band.ratings;
  return `${ratings[0]} to ${ratings.at(-1)}`;
};

/** The moves played in the address: `#m=e2e4,e7e5,...` from the start of the game (docs/v2/navigation/url-state.md). */
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
function readMoves(): string[] {
  const value = new URLSearchParams(window.location.hash.slice(1)).get('m') ?? '';
  return value.split(',').filter((move) => UCI.test(move));
}
function writeMoves(moves: readonly string[]) {
  const hash = moves.length ? `#m=${moves.join(',')}` : '';
  if (window.location.hash === hash || (!hash && !window.location.hash)) return;
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
}

/**
 * Drill (docs/v2/pages/drill.md): every branch of the openings, a variation or an opening once, the computer replying
 * as the learner chooses (as written, as the band plays, the least-known branches first, or the engine), the learner
 * answering with the opening's move until the branch ends. `/practice/drill` is the set-up card;
 * `/practice/drill/<opening>[/<variation>]` starts at once. `#m=` keeps the branch in progress, so a refresh resumes it.
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

type Running = { config: PracticeConfig; key: number; resume?: string[] };

/** The openings (each with a variation or not) a set-up drills: one, or every opening of the fixed source. */
function scopesFor(progress: LearnerProgress, source: string): { one: OpeningProgress; variation?: string }[] {
  const scope = scopeOf(source);
  if (scope) {
    const one = progress.openings.find((candidate) => candidate.opening.id === scope.opening);
    return one ? [{ one, ...(scope.variation ? { variation: scope.variation } : {}) }] : [];
  }
  const openings = source === 'everything' ? progress.openings : practiceOpenings(progress);
  return openings.map((one) => ({ one }));
}

function DrillView({ progress, scope }: { progress: LearnerProgress; scope?: PracticeScope }) {
  const saved = readPracticeConfig('drill');
  const [running, setRunning] = useState<Running | null>(() => {
    const resume = readMoves();
    if (scope) return { config: { ...saved, source: sourceOfScope(scope) }, key: 0, resume };
    // A refresh of a drill started from the set-up card comes back to the same source.
    return resume.length ? { config: saved, key: 0, resume } : null;
  });
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
    writeMoves([]);
    setRunning((last) => ({ config, key: (last?.key ?? 0) + 1 }));
  };
  if (!running) {
    return (
      <PracticeSetup
        mode="drill"
        initial={saved}
        sources={sources}
        only={['source', 'computerPlays']}
        onStart={start}
      />
    );
  }
  const scopes = scopesFor(progress, running.config.source);
  if (!scopes.length) return <EmptyState kind="no-match" size="page" text="There is no such opening to drill." />;
  return (
    <DrillSession
      key={running.key}
      progress={progress}
      scopes={scopes}
      running={running}
      sources={sources}
      onStart={start}
    />
  );
}

/** A drill's exercises, each with what it needs to say where it is: its opening and the branch it follows. */
type Planned = { exercise: Exercise; opening: BuiltOpening; branch?: DrillBranch; prefix: string[] };

/**
 * The drill, worked out once when it starts: every branch of every opening in scope, ordered as `computerPlays` says
 * (the least-known first by how many of a branch's moves are not yet known, then by lapses); against the engine, one
 * run per opening that ends where the book does. With moves from the address, the branch they lie on comes first,
 * from where they stopped.
 */
function planDrill(
  progress: LearnerProgress,
  scopes: { one: OpeningProgress; variation?: string }[],
  config: PracticeConfig,
  resume: readonly string[] | undefined,
): Planned[] {
  const states = cardStates(progress.cards, progress.reviews);
  const lapses = new Map(progress.cards.map((card) => [card.id, card.lapses]));
  const startMoves = (opening: BuiltOpening) => opening.lines[0]?.moves.slice(0, opening.startPly) ?? ([] as string[]);
  if (config.computerPlays === 'engine') {
    return scopes.flatMap(({ one, variation }) => {
      const scope = drillScope(one.opening, variation);
      if (!Object.keys(scope.book).length) return [];
      const [run] = drillExercises(one.opening, scope, 1, variation);
      return [
        { exercise: { ...run!, responder: { kind: 'engine' } }, opening: one.opening, prefix: startMoves(one.opening) },
      ];
    });
  }
  const all = scopes.flatMap(({ one, variation }) => {
    const scope = drillScope(one.opening, variation);
    return drillBranches(one.opening, scope, one.facts?.counts).map((branch) => ({ one, scope, branch }));
  });
  const weakness = (branch: DrillBranch) =>
    branch.cards.filter((id) => !['known', 'mastered'].includes(states.get(id) ?? '')).length * 100 +
    branch.cards.reduce((sum, id) => sum + (lapses.get(id) ?? 0), 0);
  const how = config.source === 'hardest' ? 'least-known' : config.computerPlays;
  const order = orderBranches(
    all.map((item) => item.branch),
    how,
    Math.random,
    weakness,
  );
  let ordered = order.map((branch) => all.find((item) => item.branch === branch)!);
  let first: Planned | undefined;
  if (resume?.length) {
    for (const item of ordered) {
      const found = resumeBranch(item.one.opening, [item.branch], resume);
      if (!found) continue;
      first = {
        exercise: branchExercise(item.one.opening, item.scope, item.branch, {
          id: `drill:${item.one.opening.id}:${item.branch.moves.join('-')}`,
          from: found.from,
        }),
        opening: item.one.opening,
        branch: item.branch,
        prefix: [...startMoves(item.one.opening), ...item.branch.moves.slice(0, found.from)],
      };
      ordered = ordered.filter((other) => other !== item);
      break;
    }
  }
  const rest = ordered.map((item): Planned => ({
    exercise: branchExercise(item.one.opening, item.scope, item.branch, {
      id: `drill:${item.one.opening.id}:${item.branch.moves.join('-')}`,
    }),
    opening: item.one.opening,
    branch: item.branch,
    prefix: startMoves(item.one.opening),
  }));
  return first ? [first, ...rest] : rest;
}

function DrillSession({
  progress,
  scopes,
  running,
  sources,
  onStart,
}: {
  progress: LearnerProgress;
  scopes: { one: OpeningProgress; variation?: string }[];
  running: Running;
  sources: PracticeSource[];
  onStart: (config: PracticeConfig) => void;
}) {
  const planned = useMemo(
    () => planDrill(progress, scopes, running.config, running.resume),
    // Worked out once per session: the key changes on Start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const exercises = useMemo(() => planned.map((item) => item.exercise), [planned]);
  // Worked out once per session, like the plan.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const opening = useMemo(() => mergeOpenings(scopes.map((s) => s.one.opening)), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const facts = useMemo(() => mergeFacts(scopes.map((s) => s.one.facts)), []);
  const [stopped, setStopped] = useState<{ results: ExerciseResult[]; tries: Try[] } | null>(null);
  const session = useExerciseSession({ exercises, opening, facts, save: 'moves' });
  const ended = useEndings(session, facts);
  const current = planned[session.index];
  const names = scopes.map(({ one, variation }) => {
    const variationName = variation ? one.opening.variations.find((v) => v.id === variation)?.name : undefined;
    return variationName ? `${one.opening.name}: ${variationName}` : one.opening.name;
  });
  const replies =
    running.config.computerPlays === 'engine'
      ? 'the engine replying'
      : running.config.computerPlays === 'written'
        ? 'replies as the lines give them'
        : running.config.computerPlays === 'least-known'
          ? 'the branches you know least first'
          : `replies as ${band()} players play`;
  const summary = `${names.join(', ')}, every branch, ${replies}`;

  // The address keeps the moves of the branch in progress, so a refresh resumes it.
  useEffect(() => {
    if (session.done || stopped || !current || running.config.computerPlays === 'engine') return writeMoves([]);
    writeMoves([...current.prefix, ...session.played.map((move) => move.uci)]);
  }, [session.played, session.done, stopped, current, running.config.computerPlays]);

  if (!planned.length) {
    const first = scopes[0]!.one.opening;
    return (
      <EmptyState
        kind="not-covered"
        size="page"
        text="Nothing to drill here: these lines have no moves of yours that come back in reviews."
        action={{ label: `Open the ${first.name}`, href: openingHref(first.id) }}
      />
    );
  }
  if (session.done || stopped) {
    return (
      <DrillSummary
        results={stopped?.results ?? session.results}
        tries={stopped?.tries ?? session.tries}
        running={running}
        sources={sources}
        onStart={onStart}
      />
    );
  }
  const opponent = lastReply(session, facts);
  const previous = planned[session.results.length - 1];
  return (
    <div className="grid gap-4">
      <PracticeBar
        mode="drill"
        config={running.config}
        sources={sources}
        only={['source', 'computerPlays']}
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
              {scopes.length > 1 && current ? (
                <span className="font-normal text-muted-foreground">, {current.opening.name}</span>
              ) : null}
            </p>
            {opponent ? <p className="text-muted-foreground">{opponent}</p> : null}
            {ended && previous ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                <span>
                  The last branch left you: <EvalWords score={ended} />
                </span>
                {previous.branch?.line ? (
                  <Button asChild variant="link" size="sm" className="h-auto px-0">
                    <a href={playOnHref(previous.opening.id, previous.branch.line)}>
                      <Swords aria-hidden /> Play on from there
                    </a>
                  </Button>
                ) : null}
              </div>
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
function lastReply(session: Session, facts?: OpeningFacts): string | null {
  const i = session.played.findLastIndex((move) => !move.mine);
  if (i < 0 || !session.exercise) return null;
  const move = session.played[i]!;
  const before = i === 0 ? session.exercise.start : session.played[i - 1]!.epd;
  const counts = facts?.counts[before];
  const games = counts?.moves.find((m) => m.uci === move.uci)?.games;
  const side = session.exercise.side === 'white' ? 'Black' : 'White';
  const label = numberedMove((session.exercise.startPly ?? 0) + i, move.san);
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
      sentence={`${clean} with no mistakes; ${firstTime} of your moves right first time. ${COMPUTER_NAME[running.config.computerPlays].replace(/^./, (c) => c.toUpperCase())}.`}
      figures={[
        { value: String(results.length), label: 'branches played' },
        { value: String(clean), label: 'with no mistakes' },
        { value: String(firstTime), label: 'moves right first time' },
      ]}
      tries={tries}
      onSelectTry={openTry(tries)}
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
      again={{ config: running.config, sources, only: ['source', 'computerPlays'], onStart }}
    />
  );
}
