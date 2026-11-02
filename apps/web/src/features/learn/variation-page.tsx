import { useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardColumns } from '@/components/shared/board-columns';
import { BoardNotes } from '@/components/board/board-notes';
import { IdeaBadge } from '@/components/chess/idea-badge';
import { RichText } from '@/components/chess/rich-text';
import { LineTable } from '@/components/openings/line-row';
import { StepRow } from '@/components/openings/step-row';
import { CheckpointRow } from '@/components/openings/variation-list';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { ModeCounts } from '@/components/progress/mode-counts';
import { ProgressRing } from '@/components/progress/progress-ring';
import { StateBadge } from '@/components/progress/state-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { siteConfig } from '@/data/site-config';
import { modeHref } from '@/features/practice/sources';
import { to } from '@/router/location';
import { bakedScore, cardStates, stepMoves } from './model';
import {
  openingFollowUps,
  followUpMoves,
  openingIdeas,
  openingVariations,
  topPuzzles,
  useStepActions,
  type OpeningData,
} from './opening-data';
import { LearnCrumbs } from './learn-crumbs';
import { OpeningFrame } from './opening-frame';
import { lineViews, openingHref, stepHref } from './views';

/** One variation of an opening: its decision, steps, checkpoint, lines, ideas and puzzles (docs/v2/pages/variation.md). */
export function VariationPage({ id, variation }: { id: string; variation: string }) {
  return (
    <OpeningFrame id={id}>
      {(data) =>
        data.one.opening.variations.some((v) => v.id === variation) ? (
          <VariationView key={variation} data={data} variation={variation} />
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-8">
            <EmptyState
              kind="no-match"
              size="page"
              text={`The ${data.one.opening.name} has no such variation.`}
              action={{ label: `Back to the ${data.one.opening.name}`, href: openingHref(id) }}
            />
          </main>
        )
      }
    </OpeningFrame>
  );
}

function VariationView({ data, variation: variationId }: { data: OpeningData; variation: string }) {
  const { one, progress } = data;
  const opening = one.opening;
  const actions = useStepActions(opening);
  const variations = useMemo(() => openingVariations(data), [data]);
  const view = variations.find((v) => v.id === variationId)!;
  const variation = opening.variations.find((v) => v.id === variationId)!;
  const lines = useMemo(
    () =>
      lineViews(opening, cardStates(progress.cards, progress.reviews)).filter((line) =>
        variation.lines.includes(line.id),
      ),
    [opening, progress, variation],
  );
  const steps = opening.steps.filter((step) => step.variation === variationId);
  const ideas = useMemo(() => {
    const ids = steps.flatMap((step) => stepMoves(opening, step).moves.flatMap((move) => move.note?.ideas ?? []));
    return openingIdeas(progress.catalog, [...new Set(ids)]);
  }, [steps, opening, progress]);
  const puzzles = useMemo(() => {
    const ours = data.puzzles.filter((puzzle) => puzzle.line && variation.lines.includes(puzzle.line));
    return topPuzzles(ours, 3, ['through', 'after', 'variation']);
  }, [data, variation]);

  // The board starts on where the variation's first step starts; a step row puts it on where that step starts.
  // The board rests on the variation's first step; hovering a step row previews it there.
  const [previewing, setPreviewing] = useState<string | null>(null);
  // A follow-up row previews its mistake and punishing line; a step row its stretch.
  const followUp = useMemo(
    () => openingFollowUps(data).find((candidate) => candidate.id === previewing),
    [data, previewing],
  );
  const step = steps.find((s) => s.id === (followUp?.step ?? previewing)) ?? steps[0];
  const shown = useMemo(
    () =>
      followUp
        ? followUpMoves(followUp).map((move) => ({ ...move, note: followUp.notes[move.ply - followUp.ply] }))
        : step
          ? stepMoves(opening, step).moves
          : [],
    [opening, step, followUp],
  );
  const positions = useMemo(
    () =>
      shown.length
        ? [
            { epd: shown[0]!.before, score: bakedScore(one.facts, shown[0]!.before) },
            ...shown.map((move) => ({
              epd: move.after,
              lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
              marks: move.note,
              score: bakedScore(one.facts, move.after),
            })),
          ]
        : [{ epd: opening.startEpd }],
    [shown, opening, one.facts],
  );
  const [resting, setIndex] = useState(0);
  // A preview puts the board on where the hovered step starts.
  // A step previews where it starts; a follow-up on the position after the punishment.
  const index = previewing ? (followUp ? Math.min(2, positions.length - 1) : 0) : resting;
  const at = shown[index - 1];
  const ready = view.steps.every((s) => s.state === 'known' || s.state === 'mastered');
  const known = view.steps.filter((s) => s.state === 'known' || s.state === 'mastered').length;

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <LearnCrumbs data={data} at={{ variation: view.id }} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {view.name}
            <StateBadge state={view.state} of="variation" gates={actions.gates} />
          </h1>
          <p className="text-muted-foreground">
            In the {opening.name}, {opening.side === 'white' ? 'as White' : 'as Black'}
          </p>
        </div>
        <ProgressRing counts={view.progress} label="long" size="md" cleared={view.checkpoint.state === 'cleared'} />
      </div>
      <ModeCounts
        counts={{ learn: { known, total: view.steps.length } }}
        hrefs={{
          learn: stepHref(opening.id, opening.steps.indexOf(step ?? steps[0]!) + 1),
          drill: modeHref('drill', { opening: opening.id, variation: variationId }),
          puzzles: modeHref('puzzles', { opening: opening.id, variation: variationId }),
        }}
      />
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
              startText={step?.text ?? `Where step ${opening.steps.indexOf(step!) + 1} starts. Step through its moves.`}
              side={opening.side}
            />
          </>
        }
      >
        <div className="grid content-start gap-4">
          {variation.intro ? (
            <RichText text={variation.intro} side={opening.side} className="max-w-prose text-muted-foreground" />
          ) : null}
          {variation.plans.length ? (
            <ul className="grid list-disc gap-1 pl-5 text-sm">
              {variation.plans.map((plan) => (
                <li key={plan}>{plan}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-2">
            {view.steps.flatMap((row) => [
              <StepRow
                key={row.id}
                step={row}
                onPreview={(hovered) => setPreviewing(hovered?.id ?? null)}
                testOut={siteConfig.teach.testOut}
                {...actions}
              />,
              // Its follow-ups under it: a click opens the follow-up.
              ...(view.followUps?.[row.id] ?? []).map((followUp) => (
                <StepRow
                  key={followUp.id}
                  step={followUp}
                  onPreview={(hovered) => setPreviewing(hovered?.id ?? null)}
                  testOut={siteConfig.teach.testOut}
                  {...actions}
                />
              )),
            ])}
            <CheckpointRow
              title="Checkpoint"
              from="from these steps"
              waits="every step above is known"
              checkpoint={view.checkpoint}
              ready={ready}
              testOut={siteConfig.teach.testOut}
              onTake={() => actions.onCheckpoint(view)}
            />
          </div>
        </div>
      </BoardColumns>
      {lines.length ? (
        <section className="grid gap-3" aria-labelledby="variation-lines">
          <h2 id="variation-lines" className="text-lg font-semibold">
            Lines
          </h2>
          <div className="rounded-md border">
            <LineTable lines={lines} columns={['kind', 'moves', 'known']} />
          </div>
        </section>
      ) : null}
      {ideas.length ? (
        <section className="grid gap-3" aria-labelledby="variation-ideas">
          <h2 id="variation-ideas" className="text-lg font-semibold">
            Ideas in its steps
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {ideas.map((idea) => (
              <IdeaBadge key={idea.id} idea={idea} />
            ))}
          </div>
        </section>
      ) : null}
      {puzzles.length ? (
        <section className="grid gap-3" aria-labelledby="variation-puzzles">
          <h2 id="variation-puzzles" className="text-lg font-semibold">
            Puzzles from the {view.name}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {puzzles.map((puzzle) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                href={to(`/practice/puzzle/${puzzle.id}`)}
                hideThemes
                learnerSide={opening.side}
                level={siteConfig.puzzles.rating}
                from={`From a game that went through the ${view.name}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
