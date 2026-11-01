import { checkpointCleared, checkpointExercises, checkpointRef } from '@knightschool/core';
import { ArrowRight, BookOpen, Flag, Play, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SessionSummary } from '@/components/practice/session-summary';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { siteConfig } from '@/data/site-config';
import { openingHref, stepHref } from '@/features/learn/views';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { ExerciseBoard } from '../exercise-board';
import { loadProgress, type LearnerProgress, type OpeningProgress } from '../progress';
import { useExerciseSession, type ExerciseResult } from '../use-exercise-session';

const percent = (share: number) => `${Math.round(share * 100)}%`;

/**
 * A variation's checkpoint (docs/v2/pages/checkpoint.md): each of its learner positions once, in a mixed order, one try
 * each (`teach.checkpointTries`) and no help; cleared at `teach.checkpointMark`. The result is recorded as an attempt
 * (mode `checkpoint`, ref `checkpoint:<opening>:<variation>`), which the opening page reads.
 */
export function CheckpointPage({ opening, variation }: { opening: string; variation: string }) {
  const data = useLoad(() => loadProgress(), [opening, variation]);
  const one = data.data?.openings.find((candidate) => candidate.opening.id === opening);
  const name = one?.opening.variations.find((v) => v.id === variation)?.name ?? variation;
  return (
    <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <Breadcrumbs
        root={{ label: 'Learn', href: to('/openings') }}
        crumbs={[
          { label: one?.opening.name ?? opening, href: openingHref(opening) },
          { label: name },
          { label: 'Checkpoint' },
        ]}
      />
      {data.error ? (
        <p className="text-destructive">{data.error}</p>
      ) : !data.data ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !one || !one.opening.variations.some((v) => v.id === variation) ? (
        <EmptyState
          kind="no-match"
          size="page"
          text="There is no such variation."
          action={{ label: 'All openings', href: to('/openings') }}
        />
      ) : (
        <CheckpointView progress={data.data} one={one} variation={variation} name={name} />
      )}
    </main>
  );
}

function CheckpointView({
  progress,
  one,
  variation,
  name,
}: {
  progress: LearnerProgress;
  one: OpeningProgress;
  variation: string;
  name: string;
}) {
  const info = one.checkpoints.find((c) => c.variation === variation)!;
  const [run, setRun] = useState(0);
  const steps = one.opening.steps
    .map((step, i) => ({ step, n: i + 1 }))
    .filter(({ step }) => step.variation === variation);
  const unknown = steps.filter(({ step }) => !['known', 'mastered'].includes(one.stepStates.get(step.id) ?? ''));
  const locked = siteConfig.teach.gates && unknown.length > 0;

  if (!info.positions) {
    return (
      <EmptyState
        kind="not-covered"
        size="page"
        text={`The ${name} has no moves of yours to test: its lines are traps and alternatives, shown rather than drilled.`}
        action={{ label: `Back to the ${one.opening.name}`, href: openingHref(one.opening.id) }}
      />
    );
  }
  if (run > 0) {
    return (
      <CheckpointRun
        key={run}
        progress={progress}
        one={one}
        variation={variation}
        name={name}
        onAgain={() => setRun((n) => n + 1)}
      />
    );
  }
  const numbers = unknown.map(({ n }) => n);
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="size-5 text-mode-learn" aria-hidden /> The {name} checkpoint
        </CardTitle>
        <CardDescription>
          {info.positions} {info.positions === 1 ? 'position' : 'positions'} from the {name}, each once in a mixed
          order: find your move with{' '}
          {siteConfig.teach.checkpointTries === 1 ? 'one try' : `${siteConfig.teach.checkpointTries} tries`} and no
          help. Clear it with {percent(siteConfig.teach.checkpointMark)} right.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {info.state === 'cleared' ? (
          <p>Cleared before{info.score ? `, ${info.score}` : ''}. Take it again any time.</p>
        ) : null}
        {locked && info.state !== 'cleared' ? (
          <p className="text-muted-foreground">
            {numbers.length === 1 ? `Step ${numbers[0]} is` : `Steps ${numbers.join(', ')} are`} not known yet.
            {siteConfig.teach.testOut ? ' Clear this and you have shown you know them.' : ''}
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {locked && info.state !== 'cleared' ? (
          siteConfig.teach.testOut ? (
            <Button onClick={() => setRun(1)}>
              <Play aria-hidden /> Test out
            </Button>
          ) : (
            <Button asChild variant="outline">
              <a href={stepHref(one.opening.id, numbers[0]!)}>
                <BookOpen aria-hidden /> Learn step {numbers[0]}
              </a>
            </Button>
          )
        ) : (
          <Button onClick={() => setRun(1)}>
            <Play aria-hidden /> Start
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function CheckpointRun({
  progress,
  one,
  variation,
  name,
  onAgain,
}: {
  progress: LearnerProgress;
  one: OpeningProgress;
  variation: string;
  name: string;
  onAgain: () => void;
}) {
  const exercises = useMemo(
    () => checkpointExercises(one.opening, variation, Math.random, siteConfig.teach.checkpointTries),
    [one, variation],
  );
  const session = useExerciseSession({ exercises, opening: one.opening, facts: one.facts, save: 'moves' });
  const recorded = useRef(false);
  const started = useRef(new Date());
  useEffect(() => {
    if (!session.done || recorded.current) return;
    recorded.current = true;
    void record(
      progress,
      one.opening.id,
      variation,
      session.results,
      exercises.map((e) => e.id),
      started.current,
    );
  }, [session.done, session.results, progress, one, variation, exercises]);

  if (!session.done) {
    return (
      <ExerciseBoard
        session={session}
        aside={
          <div className="grid gap-1 text-sm">
            <p className="font-medium">
              {Math.min(session.index + 1, session.total)} of {session.total}
            </p>
            <p className="text-muted-foreground">One try, no help. Feedback still says why.</p>
          </div>
        }
      />
    );
  }
  return (
    <CheckpointResult
      one={one}
      variation={variation}
      name={name}
      results={session.results}
      tries={session.tries}
      onAgain={onAgain}
    />
  );
}

/** The checkpoint's result in the attempts log: one try per exercise, its move and whether it was found. */
async function record(
  progress: LearnerProgress,
  opening: string,
  variation: string,
  results: readonly ExerciseResult[],
  ids: readonly string[],
  started: Date,
) {
  const cleared = checkpointCleared(results, siteConfig.teach.checkpointMark);
  const now = new Date();
  await progress.store.attempts.add({
    id: crypto.randomUUID(),
    at: now.toISOString(),
    session: crypto.randomUUID(),
    mode: 'checkpoint',
    ref: checkpointRef(opening, variation),
    result: cleared ? 'right' : 'wrong',
    tries: results.map((result, i) => ({
      uci: ids[i]!.slice(ids[i]!.lastIndexOf(':') + 1),
      ms: result.ms,
      outcome: result.right ? 'right' : 'wrong',
    })),
    ms: now.getTime() - started.getTime(),
    hint: false,
    shown: results.some((result) => result.shown),
  });
}

function CheckpointResult({
  one,
  variation,
  name,
  results,
  tries,
  onAgain,
}: {
  one: OpeningProgress;
  variation: string;
  name: string;
  results: ExerciseResult[];
  tries: ReturnType<typeof useExerciseSession>['tries'];
  onAgain: () => void;
}) {
  const cleared = checkpointCleared(results, siteConfig.teach.checkpointMark);
  const right = results.filter((r) => r.right).length;
  const stepOf = new Map(one.cards.map((card) => [card.id, card.step]));
  const missed = [
    ...new Set(
      results
        .filter((r) => !r.right)
        .map((r) => stepOf.get(r.id))
        .filter(Boolean),
    ),
  ];
  const steps = one.opening.steps;
  const nextVariation = one.opening.variations[one.opening.variations.findIndex((v) => v.id === variation) + 1];
  const nextStep = nextVariation ? steps.findIndex((step) => step.variation === nextVariation.id) : -1;
  return (
    <div className="grid gap-4">
      <SessionSummary
        mode="step"
        headline={
          cleared
            ? `The ${name} checkpoint is cleared: ${right} of ${results.length}`
            : `Not cleared yet: ${right} of ${results.length}`
        }
        sentence={
          cleared
            ? `The ${name} counts as known.`
            : `${percent(siteConfig.teach.checkpointMark)} right clears it. Nothing is lost: go over the steps below and try again.`
        }
        figures={[
          { value: `${right}/${results.length}`, label: 'found first time' },
          { value: percent(results.length ? right / results.length : 0), label: 'right' },
        ]}
        tries={tries}
      />
      {missed.length ? (
        <div className="grid gap-2">
          <h2 className="text-sm font-medium">Steps to go over</h2>
          <div className="flex flex-wrap gap-2">
            {missed.map((id) => {
              const n = steps.findIndex((step) => step.id === id) + 1;
              const step = steps[n - 1]!;
              return (
                <Button key={id} asChild variant="outline" size="sm">
                  <a href={stepHref(one.opening.id, n)}>
                    <BookOpen aria-hidden /> Step {n}
                    {step.title ? `: ${step.title}` : ''}
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {cleared && nextStep >= 0 ? (
          <Button asChild>
            <a href={stepHref(one.opening.id, nextStep + 1)}>
              Start the {nextVariation!.name ?? nextVariation!.id} <ArrowRight aria-hidden />
            </a>
          </Button>
        ) : null}
        <Button variant={cleared ? 'outline' : 'default'} onClick={onAgain}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild variant="ghost">
          <a href={openingHref(one.opening.id)}>Back to the {one.opening.name}</a>
        </Button>
      </div>
    </div>
  );
}
