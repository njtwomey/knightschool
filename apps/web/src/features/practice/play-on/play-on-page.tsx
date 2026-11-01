import {
  judgeDeviation,
  numberedMove,
  replay,
  START_FEN,
  winningChances,
  type Score,
  type Side,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { ArrowRight, Flag, Grid2x2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '@/components/board/board';
import { EvalWords } from '@/components/chess/eval-words';
import { MoveRun } from '@/components/chess/move-run';
import { FilterToggle, type FilterOption } from '@/components/finding/filter-toggle';
import { ExercisePanel } from '@/components/practice/exercise-panel';
import { PracticeBar } from '@/components/practice/practice-bar';
import { TOLERANCE_NAME, type PracticeConfig, type PracticeSource } from '@/components/practice/practice-config';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { loadCatalog, loadFacts, loadOpening, type Catalog } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { writeBoardHash } from '@/pages/board/board-hash';
import { navigate, to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';
import { playOnHref, playOnStarts, scoreOf, startExercise, type PlayOnStart } from './play-on-data';

const ROOT = { label: 'Practice', href: to('/practice') };
const SIDE: Record<Side, string> = { white: 'White', black: 'Black' };
type Verdict = 'kept' | 'gave away' | 'gained';
/**
 * The verdict in words: kept means kept what there was, so from a level start it is the balance that was kept, and from
 * a worse one the learner held on.
 */
function verdictWords(verdict: Verdict, from: Score | null, side: Side): string {
  if (verdict === 'gained') return 'You gained ground';
  if (verdict === 'gave away') return 'You gave it away';
  const chance = from ? (side === 'white' ? 1 : -1) * winningChances(from) : 0;
  const equal = siteConfig.judge.evalWords.equal;
  return chance > equal ? 'You kept your advantage' : chance < -equal ? 'You held on' : 'You kept the balance';
}

const savedConfig = () =>
  readPracticeConfig('play-on', {
    playOnMoves: siteConfig.opponent.playOnMoves,
    playOnTolerance: siteConfig.opponent.playOnTolerance,
  });

const leaveFromHash = () => new URLSearchParams(window.location.hash.slice(1)).get('leave') === 'early';

function Shell({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={ROOT} crumbs={crumbs} />
      {children}
    </main>
  );
}

const sourcesOf = (catalog: Catalog): PracticeSource[] =>
  catalog.openings.map((o) => ({ id: `opening:${o.id}`, name: o.name, group: 'opening' as const, count: o.lines }));

/** The opening a set-up plays on from: the one chosen, else the first in the catalogue. */
const openingOf = (config: PracticeConfig, catalog: Catalog) =>
  config.source.startsWith('opening:') ? config.source.slice(8) : catalog.openings[0]?.id;

/**
 * Play on (docs/v2/pages/play-on.md): `/practice/play-on` is the set-up card; `/practice/play-on/<opening>` and
 * `/practice/play-on/<opening>/lines/<line>` start at once. `#leave=early` is the variant where the computer leaves the
 * book partway through the line.
 */
export function PlayOnPage({ opening, line }: { opening?: string; line?: string }) {
  const catalog = useLoad(loadCatalog, []);
  const crumbs = [{ label: 'Play on', href: opening ? playOnHref() : undefined }];
  if (catalog.error) return <Shell crumbs={crumbs}>{<p className="text-destructive">{catalog.error}</p>}</Shell>;
  if (!catalog.data) return <Shell crumbs={crumbs}>{<p className="text-muted-foreground">Loading…</p>}</Shell>;
  const sources = sourcesOf(catalog.data);
  const start = (config: PracticeConfig) => {
    savePracticeConfig('play-on', config);
    const id = openingOf(config, catalog.data!);
    if (id) navigate(`/practice/play-on/${id}${window.location.hash}`);
  };
  if (!opening) {
    return (
      <Shell crumbs={crumbs}>
        <PracticeSetup mode="play-on" initial={savedConfig()} sources={sources} onStart={start} />
      </Shell>
    );
  }
  const name = catalog.data.openings.find((o) => o.id === opening)?.name ?? opening;
  return (
    <Shell crumbs={[...crumbs, { label: name }]}>
      <PlayOnLoader key={`${opening}/${line ?? ''}`} id={opening} line={line} sources={sources} onStart={start} />
    </Shell>
  );
}

function PlayOnLoader({
  id,
  line,
  sources,
  onStart,
}: {
  id: string;
  line?: string;
  sources: PracticeSource[];
  onStart: (config: PracticeConfig) => void;
}) {
  const data = useLoad(async () => {
    const [opening, facts, store] = await Promise.all([
      loadOpening(id),
      loadFacts(id).catch(() => undefined),
      learnerStore(),
    ]);
    return { opening, facts, cards: new Set((await store.cards.all()).map((card) => card.id)) };
  }, [id]);
  const [leave, setLeave] = useState(leaveFromHash);
  const [round, setRound] = useState(0);
  if (data.error) return <p className="text-destructive">{data.error}</p>;
  if (!data.data) return <p className="text-muted-foreground">Loading…</p>;
  const config: PracticeConfig = { ...savedConfig(), source: `opening:${id}` };
  return (
    <PlayOnSession
      key={`${leave}-${round}`}
      {...data.data}
      line={line}
      leave={leave}
      config={config}
      sources={sources}
      onLeave={(next) => {
        setLeave(next);
        window.history.replaceState(null, '', next ? '#leave=early' : window.location.pathname);
      }}
      onStart={(next) => {
        onStart(next);
        setRound((r) => r + 1);
      }}
    />
  );
}

const LEAVE_OPTIONS: FilterOption<'end' | 'early'>[] = [
  { value: 'end', label: 'From the end of the line' },
  {
    value: 'early',
    label: 'Leave the book early',
    hint: 'The computer plays a popular reply your opening does not cover, partway through the line',
  },
];

type Outcome = { start: PlayOnStart; verdict: Verdict | null; result: ExerciseResult };

function PlayOnSession({
  opening,
  facts,
  cards,
  line,
  leave,
  config,
  sources,
  onLeave,
  onStart,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  cards: Set<string>;
  line?: string;
  leave: boolean;
  config: PracticeConfig;
  sources: PracticeSource[];
  onLeave: (leave: boolean) => void;
  onStart: (config: PracticeConfig) => void;
}) {
  const starts = useMemo(
    () => playOnStarts(opening, facts, cards, { leave, only: line ? [line] : undefined }),
    [opening, facts, cards, leave, line],
  );
  const [at, setAt] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [session] = useState(() => crypto.randomUUID());
  const header = (
    <div className="grid gap-2">
      <PracticeBar
        mode="play-on"
        config={config}
        sources={sources}
        onStart={onStart}
        summary={
          leave
            ? `The computer leaves the book in the ${opening.name}; judged ${siteConfig.opponent.deviationJudgeAfter} moves later`
            : undefined
        }
        progress={at < starts.length ? { done: at, total: starts.length } : undefined}
      />
      <FilterToggle
        label="Where play starts"
        showLabel={false}
        size="sm"
        value={leave ? 'early' : 'end'}
        options={LEAVE_OPTIONS}
        onChange={(value) => onLeave(value === 'early')}
      />
    </div>
  );
  if (starts.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          kind="no-match"
          text={
            leave
              ? 'No line here has a popular reply the opening leaves unanswered.'
              : 'No line of this opening ends in a position to play on from.'
          }
        />
      </>
    );
  }
  if (at >= starts.length) {
    const count = (verdict: Verdict) => outcomes.filter((o) => o.verdict === verdict).length;
    return (
      <>
        {header}
        <SessionSummary
          mode="play-on"
          headline={`Play on done: ${outcomes.length} ${outcomes.length === 1 ? 'position' : 'positions'}`}
          sentence={`Kept the advantage in ${count('kept') + count('gained')} of ${outcomes.length}.`}
          figures={[
            { value: String(count('kept')), label: 'kept' },
            { value: String(count('gained')), label: 'gained' },
            { value: String(count('gave away')), label: 'gave away' },
          ]}
          free
          again={{ config, sources, onStart }}
        />
      </>
    );
  }
  const start = starts[at]!;
  return (
    <>
      {header}
      <PlayOnRun
        key={`${at}-${start.line}`}
        opening={opening}
        facts={facts}
        start={start}
        config={config}
        session={session}
        last={at === starts.length - 1}
        onDone={(outcome) => setOutcomes((list) => [...list, outcome])}
        onNext={() => setAt((i) => i + 1)}
      />
    </>
  );
}

/** One position played on, then judged: kept, gained or gave away, from the start's evaluation to the end's. */
function PlayOnRun({
  opening,
  facts,
  start,
  config,
  session: sessionId,
  last,
  onDone,
  onNext,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  start: PlayOnStart;
  config: PracticeConfig;
  session: string;
  last: boolean;
  onDone: (outcome: Outcome) => void;
  onNext: () => void;
}) {
  const exercise = useMemo(() => startExercise(opening, start, config), [opening, start, config]);
  const exercises = useMemo(() => [exercise], [exercise]);
  const session = useExerciseSession({ exercises, opening, facts, save: 'none' });
  const result = session.results[0];
  const [judged, setJudged] = useState<{ from: Score | null; to: Score | null; verdict: Verdict | null } | null>(null);
  const reported = useRef(false);
  const side = opening.side;
  const learnerMoves = exercise.learnerMoves ?? config.playOnMoves;

  useEffect(() => {
    if (!result || reported.current) return;
    reported.current = true;
    const end = replay(start.epd, result.moves).at(-1)?.epd ?? start.epd;
    void (async () => {
      let from: Score | null = null;
      let after: Score | null = null;
      try {
        from = await scoreOf(facts, start.epd);
        after = await scoreOf(facts, end);
      } catch {
        // No engine: the moves were graded; the verdict is left unsaid.
      }
      const verdict = from && after ? judgeDeviation(from, after, side, siteConfig.judge.grades.good) : null;
      setJudged({ from, to: after, verdict });
      onDone({ start, verdict, result });
      const store = await learnerStore();
      await store.attempts.add({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        session: sessionId,
        mode: 'play-on',
        ref: exercise.id,
        result: result.shown ? 'shown' : !result.right || verdict === 'gave away' ? 'wrong' : 'right',
        tries: result.attempt.tries,
        ms: result.ms,
        hint: result.hint,
        shown: result.shown,
      });
    })();
  }, [result]);

  const exitWords = start.exit
    ? `${SIDE[side === 'white' ? 'black' : 'white']} played ${numberedMove(start.exit.ply, start.exit.san)}, ${Math.round(
        start.exit.share * 100,
      )}% of games at your level; your opening does not cover it`
    : null;

  if (!result) {
    const mine = session.played.filter((move) => move.mine).length;
    const left = learnerMoves - mine;
    return (
      <ExerciseBoard
        session={session}
        prompt={<p className="font-medium">Your move: keep {SIDE[side]}’s position</p>}
        aside={
          <ExercisePanel
            mode="play-on"
            prompt={
              start.exit
                ? `Off the book: keep ${SIDE[side]}’s position for ${learnerMoves} moves`
                : `Play on from the end of ${start.lineName}: keep ${SIDE[side]}’s edge for ${learnerMoves} moves`
            }
            context={
              <>
                {exitWords ? <span className="block">{exitWords}.</span> : null}
                {left} {left === 1 ? 'move' : 'moves'} left; any move that loses no more than{' '}
                {TOLERANCE_NAME[config.playOnTolerance]} passes. The computer plays what players at your level play,
                then the engine.
              </>
            }
          />
        }
      />
    );
  }

  return <PlayOnAfter start={start} result={result} judged={judged} side={side} last={last} onNext={onNext} />;
}

function PlayOnAfter({
  start,
  result,
  judged,
  side,
  last,
  onNext,
}: {
  start: PlayOnStart;
  result: ExerciseResult;
  judged: { from: Score | null; to: Score | null; verdict: Verdict | null } | null;
  side: Side;
  last: boolean;
  onNext: () => void;
}) {
  const moves = useMemo(() => replay(start.epd, result.moves), [start.epd, result.moves]);
  const positions = useMemo(
    () => [
      {
        epd: start.epd,
        lastMove: start.exit ? { from: start.exit.uci.slice(0, 2), to: start.exit.uci.slice(2, 4) } : undefined,
        score: judged?.from ?? undefined,
      },
      ...moves.map((move, i) => ({
        epd: move.epd,
        lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
        score: i === moves.length - 1 ? (judged?.to ?? undefined) : undefined,
      })),
    ],
    [start, moves, judged],
  );
  const [index, setIndex] = useState(positions.length - 1);
  const wrong = result.attempt.tries.filter((t) => t.outcome === 'wrong').length;
  const board = `/board${writeBoardHash({
    fen: START_FEN,
    moves: [...start.moves, ...result.moves],
    ply: start.moves.length + result.moves.length,
    side,
  })}`;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <Board
        positions={positions}
        index={index}
        onIndex={setIndex}
        reveal="answered"
        orientation={side}
        keys
        actions={
          <Button asChild variant="ghost" size="sm">
            <a href={to(board)}>
              <Grid2x2 aria-hidden /> Open on the board
            </a>
          </Button>
        }
      />
      <div className="grid content-start gap-4">
        <ExercisePanel
          mode="play-on"
          prompt={
            judged
              ? judged.verdict
                ? verdictWords(judged.verdict, judged.from, side)
                : 'Played on: the engine could not judge the result'
              : 'Judging where it leaves you…'
          }
          context={start.exit ? `After ${numberedMove(start.exit.ply, start.exit.san)}, off the book` : start.lineName}
        >
          {judged?.from || judged?.to ? (
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <EvalWords score={judged.from} />
              <ArrowRight className="size-3.5 self-center text-muted-foreground" aria-label="to" />
              <EvalWords score={judged.to} />
            </p>
          ) : null}
          <div className="grid gap-1 text-sm">
            <span className="text-muted-foreground">The moves played</span>
            <MoveRun
              moves={moves.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
              firstPly={start.moves.length}
              side={side}
              current={index - 1}
              onSelect={(i) => setIndex(i + 1)}
              orientation={side}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {wrong === 0
              ? 'Every move kept the position the first time.'
              : `${wrong} ${wrong === 1 ? 'move was' : 'moves were'} taken back for losing too much.`}
          </p>
          <div>
            <Button onClick={onNext} disabled={!judged}>
              {last ? <Flag aria-hidden /> : <ArrowRight aria-hidden />}
              {last ? 'Finish' : 'Another position'}
            </Button>
          </div>
        </ExercisePanel>
      </div>
    </div>
  );
}
