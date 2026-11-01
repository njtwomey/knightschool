import { puzzleCardId } from '@knightschool/core';
import { useMemo, useState } from 'react';
import type { Idea } from '@/components/chess/idea-badge';
import type { PracticeConfig } from '@/components/practice/practice-config';
import { PracticeBar } from '@/components/practice/practice-bar';
import { PracticeSetup } from '@/components/practice/practice-setup';
import { PuzzleCard, type PuzzleState } from '@/components/practice/puzzle-card';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { siteConfig } from '@/data/site-config';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { readPracticeConfig, savePracticeConfig } from '../saved-config';
import type { ExerciseResult } from '../use-exercise-session';
import {
  bySolver,
  levelWords,
  loadPuzzleData,
  matchedWhy,
  openingSource,
  puzzleHref,
  puzzlesHref,
  puzzleSources,
  puzzlesFrom,
  sessionPuzzles,
  variationSource,
  weakestLevel,
  type PuzzleData,
  type SessionPuzzle,
} from './puzzle-data';
import { PuzzleRun } from './puzzle-run';

const ROOT = { label: 'Practice', href: to('/practice') };

function Shell({ crumbs, children }: { crumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs root={ROOT} crumbs={crumbs} />
      {children}
    </main>
  );
}

function useData() {
  return useLoad(loadPuzzleData, []);
}

/** What a card says about a puzzle met before: solved, or missed (it has lapsed). */
function stateOf(data: PuzzleData, id: string): PuzzleState | undefined {
  const card = data.cards.find((c) => c.id === puzzleCardId(id));
  if (!card) return undefined;
  return { result: card.lapses > 0 ? 'missed' : 'solved', nextReview: new Date(card.due).toLocaleDateString() };
}

/**
 * Puzzles (docs/v2/pages/puzzles.md): `/practice/puzzles` is the set-up card and the puzzles it would draw from;
 * `/practice/puzzles/<opening>[/<variation>]` starts at once.
 */
export function PuzzlesPage({ opening, variation }: { opening?: string; variation?: string }) {
  const data = useData();
  const crumbs = [{ label: 'Puzzles', href: opening ? puzzlesHref() : undefined }];
  if (data.error) return <Shell crumbs={crumbs}>{<p className="text-destructive">{data.error}</p>}</Shell>;
  if (!data.data) return <Shell crumbs={crumbs}>{<p className="text-muted-foreground">Loading…</p>}</Shell>;
  const fixed = opening ? (variation ? variationSource(opening, variation) : openingSource(opening)) : undefined;
  const name = opening ? data.data.openings.find((o) => o.id === opening)?.name : undefined;
  return (
    <Shell crumbs={name ? [...crumbs, { label: name }] : crumbs}>
      <PuzzlesView key={fixed ?? 'setup'} data={data.data} fixed={fixed} />
    </Shell>
  );
}

type Run = { config: PracticeConfig; puzzles: SessionPuzzle[]; key: number };

function PuzzlesView({ data, fixed }: { data: PuzzleData; fixed?: string }) {
  const saved = readPracticeConfig('puzzles', { rating: siteConfig.puzzles.rating });
  const start = (config: PracticeConfig, key = Date.now()): Run => ({
    config,
    puzzles: sessionPuzzles(data, config),
    key,
  });
  const [run, setRun] = useState<Run | null>(() => (fixed ? start({ ...saved, source: fixed }) : null));
  const [draft] = useState<PracticeConfig>(saved);
  const sources = useMemo(() => puzzleSources(data, (run?.config ?? draft).solver), [data, run, draft]);
  const begin = (config: PracticeConfig) => {
    savePracticeConfig('puzzles', config);
    setRun(start(config));
  };

  if (!run) {
    const pool = bySolver(data, puzzlesFrom(data, draft.source), draft.solver).slice(0, 12);
    return (
      <>
        <PracticeSetup mode="puzzles" initial={draft} sources={sources} onStart={begin} />
        <PuzzleList data={data} puzzles={pool} title="Some puzzles from your openings" />
      </>
    );
  }
  return <PuzzleSession key={run.key} data={data} run={run} sources={sources} onStart={begin} />;
}

function PuzzleSession({
  data,
  run,
  sources,
  onStart,
}: {
  data: PuzzleData;
  run: Run;
  sources: ReturnType<typeof puzzleSources>;
  onStart: (config: PracticeConfig) => void;
}) {
  const [at, setAt] = useState(0);
  const [results, setResults] = useState<{ puzzle: SessionPuzzle; result: ExerciseResult }[]>([]);
  const sideOf = (puzzle: SessionPuzzle) => data.openings.find((o) => o.id === puzzle.opening)?.side;
  const weakest = weakestLevel(run.puzzles);
  const bar = (
    <PracticeBar
      mode="puzzles"
      config={run.config}
      sources={sources}
      onStart={onStart}
      progress={at < run.puzzles.length ? { done: at, total: run.puzzles.length } : undefined}
    />
  );
  if (run.puzzles.length === 0) {
    return (
      <>
        {bar}
        <EmptyState kind="no-match" text="No puzzles match this set-up. Widen the rating range or pick both sides." />
      </>
    );
  }
  if (at >= run.puzzles.length) {
    const solved = results.filter((r) => r.result.right && !r.result.hint).length;
    const helped = results.filter((r) => r.result.right && r.result.hint).length;
    const missed = results.length - solved - helped;
    const ideas = new Map<string, Idea>();
    for (const { puzzle } of results)
      for (const theme of puzzle.themes) if (data.ideas[theme]) ideas.set(data.ideas[theme].id, data.ideas[theme]);
    const missedFirst = [...results].sort((a, b) => Number(a.result.right) - Number(b.result.right));
    return (
      <>
        {bar}
        <SessionSummary
          mode="puzzles"
          headline={`Puzzles done: ${results.length}`}
          sentence={`${solved} solved, ${helped} with a hint, ${missed} missed. Missed puzzles come back in Review.`}
          figures={[
            { value: String(solved), label: 'solved first time' },
            { value: String(helped), label: 'with a hint' },
            { value: String(missed), label: 'to try again' },
          ]}
          ideas={[...ideas.values()]}
          again={{ config: run.config, sources, onStart }}
        />
        <PuzzleList
          data={data}
          title="This session's puzzles"
          puzzles={missedFirst.map((r) => r.puzzle)}
          states={Object.fromEntries(
            results.map((r) => [
              r.puzzle.id,
              { result: r.result.right ? (r.result.hint ? 'hint' : 'solved') : 'missed' } as PuzzleState,
            ]),
          )}
        />
      </>
    );
  }
  const puzzle = run.puzzles[at]!;
  return (
    <>
      {bar}
      {weakest && weakest !== run.puzzles[0]?.level ? (
        <p className="-mt-3 text-sm text-muted-foreground">Some puzzles matched only {levelWords(weakest)}.</p>
      ) : null}
      <PuzzleRun
        key={puzzle.id}
        puzzle={puzzle}
        data={data}
        learnerSide={sideOf(puzzle)}
        progress={{ done: at, total: run.puzzles.length }}
        onFinished={(result) => setResults((list) => [...list, { puzzle, result }])}
        onNext={() => setAt((i) => i + 1)}
      />
    </>
  );
}

function PuzzleList({
  data,
  puzzles,
  title,
  states,
}: {
  data: PuzzleData;
  puzzles: SessionPuzzle[];
  title: string;
  states?: Record<string, PuzzleState>;
}) {
  if (puzzles.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {puzzles.map((puzzle) => {
          const state = states?.[puzzle.id] ?? stateOf(data, puzzle.id);
          return (
            <PuzzleCard
              key={puzzle.id}
              puzzle={puzzle}
              href={puzzleHref(puzzle.id)}
              from={matchedWhy(puzzle, data)}
              fromPosition={puzzle.position ? { epd: puzzle.position } : undefined}
              ideas={data.ideas}
              hideThemes={!state}
              state={state}
              level={siteConfig.puzzles.rating}
              learnerSide={data.openings.find((o) => o.id === puzzle.opening)?.side}
            />
          );
        })}
      </div>
    </section>
  );
}

/** One puzzle, from Today, a card or a link (`/practice/puzzle/<id>`). */
export function PuzzlePage({ id }: { id: string }) {
  const data = useData();
  const crumbs = [{ label: 'Puzzles', href: puzzlesHref() }, { label: `Puzzle ${id}` }];
  if (data.error) return <Shell crumbs={crumbs}>{<p className="text-destructive">{data.error}</p>}</Shell>;
  if (!data.data) return <Shell crumbs={crumbs}>{<p className="text-muted-foreground">Loading…</p>}</Shell>;
  const puzzle = data.data.puzzles.find((p) => p.id === id);
  if (!puzzle) {
    return (
      <Shell crumbs={crumbs}>
        <EmptyState
          kind="no-match"
          text={`No puzzle ${id} ships with the openings.`}
          action={{ label: 'All puzzles', href: puzzlesHref() }}
        />
      </Shell>
    );
  }
  const opening = data.data.openings.find((o) => o.id === puzzle.opening);
  return (
    <Shell crumbs={crumbs}>
      <PuzzleRun key={puzzle.id} puzzle={puzzle} data={data.data} learnerSide={opening?.side} />
      <p className="text-sm">
        <a href={puzzlesHref(puzzle.opening)} className="underline-offset-4 hover:underline">
          More puzzles from the {opening?.name ?? 'opening'}
        </a>
      </p>
    </Shell>
  );
}
