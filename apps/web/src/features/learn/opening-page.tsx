import type { BuiltOpening } from '@knightschool/core/content';
import { useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardColumns } from '@/components/shared/board-columns';
import { BoardNotes } from '@/components/board/board-notes';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { KIND_OPTIONS } from '@/components/finding/filter-options';
import { SortableTable } from '@/components/finding/sortable-table';
import { ChooseTick } from '@/components/openings/choose-tick';
import { LineActions, lineColumns, type LineData } from '@/components/openings/line-row';
import { OpeningIntro } from '@/components/openings/opening-intro';
import { stepLabel, stepTitle } from '@/components/openings/steps';
import type { Source } from '@/components/openings/types';
import { VariationList } from '@/components/openings/variation-list';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { ModeCounts } from '@/components/progress/mode-counts';
import { NextAction } from '@/components/progress/next-action';
import { ProgressRing } from '@/components/progress/progress-ring';
import type { ShippedPuzzle } from '@/data/content';
import { siteConfig } from '@/data/site-config';
import { to } from '@/router/location';
import { bakedScore, cardStates, stepMoves } from './model';
import {
  followUpMoves,
  openingFollowUps,
  openingIdeas,
  openingVariations,
  topPuzzles,
  useStepActions,
  type OpeningData,
} from './opening-data';
import { OpeningCrumbs, OpeningFrame } from './opening-frame';
import { nextStepNumber, openingModeCounts, openingModeHrefs, openingNextState } from './opening-progress';
import { TickUndo } from './tick-undo';
import { useTicks } from './use-ticks';
import { finalTestHref, lineViews } from './views';
import { useKeysBeatHover } from '@/components/board/key-owner';
import { alphabetical } from '@/components/finding/sort';

/** One opening: its introduction, what to do next, its variations with their steps, and a board for the step picked. */
export function OpeningPage({ id, tab = 'overview' }: { id: string; tab?: 'overview' | 'lines' }) {
  return (
    <OpeningFrame id={id}>
      {(data) => (tab === 'lines' ? <LinesTab data={data} /> : <Overview key={id} data={data} />)}
    </OpeningFrame>
  );
}

function Overview({ data }: { data: OpeningData }) {
  const { one, progress, puzzles } = data;
  const opening = one.opening;
  const actions = useStepActions(opening);
  const ticks = useTicks(opening);
  const variations = useMemo(() => openingVariations(data), [data]);
  const counts = useMemo(() => openingModeCounts(one, progress, puzzles), [one, progress, puzzles]);
  const next = useMemo(() => openingNextState(one, progress, puzzles), [one, progress, puzzles]);
  const ideas = useMemo(() => openingIdeas(progress.catalog, opening.ideas), [progress, opening]);
  // The board rests on the next step; hovering a step or follow-up row previews it there until the pointer leaves.
  const [home] = useState(() => opening.steps[(nextStepNumber(one) ?? 1) - 1]?.id ?? opening.steps[0]?.id);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const picked = previewing ?? home;
  const followUp = useMemo(() => openingFollowUps(data).find((candidate) => candidate.id === picked), [data, picked]);
  const step = opening.steps.find((candidate) => candidate.id === (followUp?.step ?? picked)) ?? opening.steps[0];
  // A follow-up row shows its mistake and punishing line; a step row its stretch.
  const shown = useMemo(
    () =>
      followUp
        ? { moves: followUpMoves(followUp).map((move) => ({ ...move, note: undefined })) }
        : step
          ? stepMoves(opening, step)
          : null,
    [opening, step, followUp],
  );
  const positions = useMemo(() => {
    if (!shown?.moves.length) return [{ epd: opening.startEpd }];
    const start = shown.moves[0]!.before;
    return [
      { epd: start, score: bakedScore(one.facts, start) },
      ...shown.moves.map((move) => ({
        epd: move.after,
        lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
        marks: move.note,
        score: bakedScore(one.facts, move.after),
      })),
    ];
  }, [shown, opening, one.facts]);
  // The board shows the step's stretch at its end, to step back through; a preview shows where the row's step ends.
  const [resting, setIndex] = useState(positions.length - 1);
  // A step previews at the end of its stretch; a follow-up on the position after the punishment.
  const index = previewing
    ? followUp
      ? Math.min(2, positions.length - 1)
      : positions.length - 1
    : Math.min(resting, positions.length - 1);
  // An arrow key ends a row's preview and steps from where the board was resting.
  useKeysBeatHover(Boolean(previewing), (step) => {
    setPreviewing(null);
    setIndex((at) => Math.max(0, at + step));
  });
  const at = shown?.moves[index - 1];
  const known = counts.learn?.known ?? 0;
  const moves = [...one.stepCounts.values()].reduce(
    (sum, c) => ({ total: sum.total + c.mine, known: sum.known + c.known }),
    { total: 0, known: 0 },
  );
  const finalTest = {
    positions: one.cards.length,
    state: one.checkpoints.every((c) => c.state === 'cleared') ? ('open' as const) : ('locked' as const),
    href: finalTestHref(opening.id),
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <OpeningCrumbs catalog={progress.catalog} opening={opening} tab="overview" />
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{opening.name}</h1>
          <p className="text-muted-foreground">
            {opening.side === 'white' ? 'As White' : 'As Black'}
            {known ? `, ${known} of ${opening.steps.length} steps known` : ''}
          </p>
        </div>
        <ProgressRing counts={{ ...moves, mastered: 0 }} label="long" size="md" />
        <ChooseTick
          state={ticks.stateOf(opening.steps.map((step) => step.id))}
          name={`the ${opening.name}`}
          onToggle={() =>
            ticks.toggle(
              opening.steps.map((step) => step.id),
              `the ${opening.name}`,
            )
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <NextAction state={next} />
        <ModeCounts counts={counts} hrefs={openingModeHrefs(one)} />
      </div>
      <BoardColumns
        side="right"
        board={
          <>
            <Board
              positions={positions}
              index={Math.min(index, positions.length - 1)}
              onIndex={setIndex}
              orientation={opening.side}
            />
            <BoardNotes
              move={
                at
                  ? {
                      ply: at.ply,
                      san: at.san,
                      ...(at.note?.text ? { comment: at.note.text } : {}),
                      ...(at.note ? { marks: at.note } : {}),
                    }
                  : undefined
              }
              startText={step?.text ?? 'Pick a step to see its moves here.'}
              side={opening.side}
            />
          </>
        }
      >
        <div className="grid content-start gap-6">
          <TickUndo />
          <OpeningIntro
            summary={opening.summary}
            about={opening.about}
            side={opening.side}
            ideas={ideas}
            sources={opening.sources as Source[]}
          />
          <VariationList
            variations={variations}
            finalTest={finalTest}
            selected={home}
            onPreview={(row) => setPreviewing(row?.id ?? null)}
            testOut={siteConfig.teach.testOut}
            stepTick={(row) => {
              const name = `step ${stepLabel(row)}, ${stepTitle(row)}`;
              return (
                <ChooseTick state={ticks.stateOf([row.id])} name={name} onToggle={() => ticks.toggle([row.id], name)} />
              );
            }}
            variationTick={(row) => {
              const ids = row.steps.map((step) => step.id);
              const name = `the ${row.name}`;
              return <ChooseTick state={ticks.stateOf(ids)} name={name} onToggle={() => ticks.toggle(ids, name)} />;
            }}
            {...actions}
          />
        </div>
      </BoardColumns>
      <PuzzleSection opening={opening} puzzles={puzzles} />
    </main>
  );
}

/** Puzzles from this opening: three cards, family and named-variation level first. */
function PuzzleSection({ opening, puzzles }: { opening: BuiltOpening; puzzles: readonly ShippedPuzzle[] }) {
  const three = topPuzzles(puzzles, 3);
  if (!three.length) return null;
  return (
    <section className="grid gap-3" aria-labelledby="opening-puzzles">
      <h2 id="opening-puzzles" className="text-lg font-semibold">
        Puzzles from this opening
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {three.map((puzzle) => (
          <PuzzleCard
            key={puzzle.id}
            puzzle={puzzle}
            href={to(`/practice/puzzle/${puzzle.id}`)}
            hideThemes
            learnerSide={opening.side}
            level={siteConfig.puzzles.rating}
            from={`From a game that went through your ${opening.name}`}
          />
        ))}
      </div>
    </section>
  );
}

type KindFilter = (typeof KIND_OPTIONS)[number]['value'];

const matchesKind = (line: LineData, kind: KindFilter) =>
  kind === 'all' || (kind === 'trap' ? line.kind === 'for-us' || line.kind === 'against-us' : line.kind === kind);

/** The Lines tab: every line of the opening, sortable, filtered by kind; a row opens the line. */
function LinesTab({ data }: { data: OpeningData }) {
  const { one, progress } = data;
  const opening = one.opening;
  const lines = useMemo(() => lineViews(opening, cardStates(progress.cards, progress.reviews)), [opening, progress]);
  const [kind, setKind] = useState<KindFilter>('all');
  const ticks = useTicks(opening);
  /** A line's tick is its steps' (a step belongs to one line); a line that earns no cards has none. */
  const lineTick = (line: LineData) => {
    const ids = opening.steps.filter((step) => step.line === line.id).map((step) => step.id);
    if (!ids.length || !line.known.total) return null;
    const name = `the ${line.name} line`;
    return <ChooseTick state={ticks.stateOf(ids)} name={name} onToggle={() => ticks.toggle(ids, name)} />;
  };
  const options = KIND_OPTIONS.map((option) => ({
    ...option,
    count: lines.filter((line) => matchesKind(line, option.value)).length,
    disabled: option.value !== 'all' && !lines.some((line) => matchesKind(line, option.value)),
  }));
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <OpeningCrumbs catalog={progress.catalog} opening={opening} tab="lines" />
      <TickUndo />
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Lines of the {opening.name}</h1>
        <p className="text-muted-foreground">
          Every line the opening teaches, each from where it branches off. Open one to read it through.
        </p>
      </div>
      <SortableTable
        label={`Lines of the ${opening.name}`}
        columns={lineColumns()}
        rows={lines.filter((line) => matchesKind(line, kind)).sort((a, b) => alphabetical(a.name, b.name))}
        rowKey={(line) => line.id}
        rowHref={(line) => line.href}
        titleColumn="name"
        actions={(line) => (
          <>
            <LineActions line={line} />
            {lineTick(line)}
          </>
        )}
        empty="No lines of this kind."
        filters={
          <FilterToggle label="Kind" value={kind} options={options} allValue="all" onChange={setKind} size="sm" />
        }
      />
    </main>
  );
}
