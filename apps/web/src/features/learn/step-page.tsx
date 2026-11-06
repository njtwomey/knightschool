import { numberedMove, stepTestOutRef } from '@knightschool/core';
import type { BuiltStep } from '@knightschool/core/content';
import { ArrowRight, Flag } from 'lucide-react';
import { useMemo } from 'react';
import { RichText } from '@/components/chess/rich-text';
import { StepRow } from '@/components/openings/step-row';
import { stepTitle } from '@/components/openings/steps';
import { PuzzleCard } from '@/components/practice/puzzle-card';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { to } from '@/router/location';
import { LearnFlow, type DoneContext } from './learn-flow';
import { stepMoves, type LineMove } from './model';
import { openingVariations, topPuzzles, useStepActions, type OpeningData } from './opening-data';
import { LearnCrumbs } from './learn-crumbs';
import { LearnPager } from './learn-pager';
import { OpeningFrame } from './opening-frame';
import { useGates } from './use-learn';
import { checkpointHref, openingHref, stepHref } from './views';

/**
 * Learning one step's stretch of the main line (docs/v2/pages/step.md) through the Learn flow: Learn, Try, Done. The
 * opponent's mistakes come after, as the step's follow-ups. `range` plays only the learner's moves a to b of it.
 */
export function StepPage({ id, n, range }: { id: string; n: number; range?: [number, number] }) {
  return (
    <OpeningFrame id={id}>
      {(data) => {
        const step = data.one.opening.steps[n - 1];
        if (!step) {
          return (
            <main className="mx-auto max-w-7xl px-4 py-8">
              <Notice
                kind="problem"
                text={`The ${data.one.opening.name} has no step ${n}.`}
                action={
                  <Button asChild size="sm" variant="outline">
                    <a href={openingHref(id)}>Back to the opening</a>
                  </Button>
                }
              />
            </main>
          );
        }
        return <StepView key={`${step.id}:${range?.join('-') ?? ''}`} data={data} step={step} n={n} range={range} />;
      }}
    </OpeningFrame>
  );
}

/** The step's moves, from the lead-in opponent move to its last learner move, or only learner moves a to b of it. */
function stretchOf(data: OpeningData, step: BuiltStep, range?: [number, number]): LineMove[] {
  const { moves } = stepMoves(data.one.opening, step);
  if (!range) return moves;
  const mine = moves.map((move, i) => (move.mine ? i : -1)).filter((i) => i >= 0);
  const first = mine[Math.max(0, range[0] - 1)];
  const last = mine[Math.min(mine.length, range[1]) - 1];
  if (first === undefined || last === undefined || last < first) return moves;
  return moves.slice(first > 0 && !moves[first - 1]!.mine ? first - 1 : first, last + 1);
}

const sideName = (side: 'white' | 'black') => (side === 'white' ? 'White' : 'Black');

function StepView({
  data,
  step,
  n,
  range,
}: {
  data: OpeningData;
  step: BuiltStep;
  n: number;
  range?: [number, number];
}) {
  const { one } = data;
  const opening = one.opening;
  const gates = useGates(opening.id);
  const place = useMemo(() => ({ step: n }), [n]);
  const moves = useMemo(() => stretchOf(data, step, range), [data, step, range]);
  const all = useMemo(() => stepMoves(opening, step).all, [opening, step]);
  // The move that leads into the stretch, with its marks: the position the story starts from.
  const lead = all[moves[0]!.ply - 1];
  const variation = opening.variations.find((v) => v.id === step.variation);
  const steps = opening.steps.map((s, i) => ({ step: s, n: i + 1 })).filter((s) => s.step.variation === step.variation);
  const state = one.stepStates.get(step.id);
  // The author's title, or a headline from the step's first move ("When 6...Bg4 is played").
  const title = useMemo(() => {
    const row = openingVariations(data)
      .flatMap((v) => v.steps)
      .find((candidate) => candidate.id === step.id);
    return row ? stepTitle(row) : `Step ${n}`;
  }, [data, step, n]);
  const mine = moves.filter((move) => move.mine);
  const text =
    step.text ??
    `${mine.length} ${mine.length === 1 ? 'move' : 'moves'} of yours, from ${numberedMove(mine[0]!.ply, mine[0]!.san)}. ` +
      'Step through them with the reason for each, then play them without help.';

  return (
    <LearnFlow
      data={data}
      item={step.id}
      remember={!range}
      crumbs={<LearnCrumbs data={data} at={{ step: n }} />}
      title={
        <>
          Step {n}: {title}
          {range ? <span className="text-muted-foreground"> (moves {range.join(' to ')})</span> : null}
        </>
      }
      subtitle={`${opening.name}, ${variation?.name ?? step.variation}`}
      pager={<LearnPager data={data} at={place} />}
      notice={(hash) =>
        state === 'locked' && gates && !hash.test ? (
          <Notice
            kind="reminder"
            text={`This step builds on step ${n - 1}. Earlier steps stay open to come back to.`}
            action={
              <Button asChild size="sm" variant="outline">
                <a href={stepHref(opening.id, n - 1)}>Go to step {n - 1}</a>
              </Button>
            }
          />
        ) : null
      }
      moves={moves}
      {...(lead ? { lead: { uci: lead.uci, ...(lead.note ? { note: lead.note } : {}) } } : {})}
      intro={
        <RichText
          text={text}
          context={{ startEpd: moves[0]!.before, firstPly: moves[0]!.ply, moves }}
          side={opening.side}
          className="max-w-prose"
        />
      }
      refutations="mine"
      practice={{
        prompt: `Play ${sideName(opening.side)}'s moves of the step`,
        context: 'The other side plays the step’s replies. A wrong move snaps back and says why.',
        save: 'moves',
      }}
      {...(siteConfig.teach.testOut ? { testOut: { ref: stepTestOutRef(opening.id, step.id) } } : {})}
      done={{
        known: (now) => ['known', 'mastered'].includes(now.one.stepStates.get(step.id) ?? ''),
        words: ({ known, test, testedOut }) => ({
          headline: known
            ? test && testedOut
              ? 'Known: you tested out'
              : 'Known'
            : test
              ? 'Not tested out yet'
              : 'Not known yet',
          sentence: known
            ? 'Every move right first time with no help, so this step is known and the next one opens. Its moves come back in your reviews.'
            : test
              ? 'Testing out needs every move right first time with no help. Learn it first, or test out again.'
              : 'A run with every move right first time and no help makes it known. Its moves are in your reviews either way.',
        }),
        actions: ({ known }) => {
          const lastOfVariation = steps.at(-1)?.n === n;
          if (known && lastOfVariation)
            return (
              <Button asChild>
                <a href={checkpointHref(opening.id, step.variation)}>
                  <Flag aria-hidden /> Take the checkpoint
                </a>
              </Button>
            );
          if (known && opening.steps[n])
            return (
              <Button asChild>
                <a href={stepHref(opening.id, n + 1)}>
                  Next step <ArrowRight aria-hidden />
                </a>
              </Button>
            );
          return null;
        },
        after: (context) => <StepAfter context={context} step={step} moves={moves} />,
      }}
    />
  );
}

/** After a step's Done: its follow-ups (open once it is known) and a few puzzles from its positions. */
function StepAfter({ context, step, moves }: { context: DoneContext; step: BuiltStep; moves: LineMove[] }) {
  const { data, known } = context;
  const opening = data.one.opening;
  const actions = useStepActions(opening);
  // The follow-ups this step opens once known: the opponent's common mistakes in its stretch.
  const followUps = useMemo(
    () => openingVariations(data).find((v) => v.id === step.variation)?.followUps?.[step.id] ?? [],
    [data, step],
  );
  const positions = new Set(moves.flatMap((move) => [move.before, move.after]));
  const matched = data.puzzles.filter(
    (puzzle) => (puzzle.position && positions.has(puzzle.position)) || puzzle.line === step.line,
  );
  const puzzles = topPuzzles(matched.length ? matched : data.puzzles, siteConfig.puzzles.perStep);
  return (
    <>
      {followUps.length ? (
        <section className="grid gap-3" aria-labelledby="step-follow-ups">
          <div className="grid gap-1">
            <h2 id="step-follow-ups" className="text-lg font-semibold">
              Follow-ups
            </h2>
            <p className="text-sm text-muted-foreground">
              {known
                ? 'Where players at your level go wrong in this stretch, and how to punish it: learned, then tried.'
                : 'They open once the step is known: the main line first, then the mistakes to exploit.'}
            </p>
          </div>
          <div className="grid gap-2">
            {followUps.map((row) => (
              <StepRow key={row.id} step={row} testOut={false} {...actions} />
            ))}
          </div>
        </section>
      ) : null}
      {puzzles.length ? (
        <section className="grid gap-3" aria-labelledby="step-puzzles">
          <h2 id="step-puzzles" className="text-lg font-semibold">
            Puzzles from these positions
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
                from={`From a game that went through this step of your ${opening.name}`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
