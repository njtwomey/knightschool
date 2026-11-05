import { withoutOpening } from '@knightschool/core';
import type { BuiltOpening } from '@knightschool/core/content';
import { Crosshair, Puzzle, Repeat } from 'lucide-react';
import { useMemo } from 'react';
import { ChooseTick } from '@/components/openings/choose-tick';
import { RepertoireSlots, type RepertoireSlot } from '@/components/openings/repertoire-slots';
import { stepLabel, stepTitle } from '@/components/openings/steps';
import type { OpeningSummary } from '@/components/openings/types';
import { VariationList } from '@/components/openings/variation-list';
import { CoverageMeter } from '@/components/progress/coverage-meter';
import { GapLink } from '@/components/progress/gap-link';
import { ModeCounts } from '@/components/progress/mode-counts';
import { NextAction } from '@/components/progress/next-action';
import { ProgressRing } from '@/components/progress/progress-ring';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSetting, useSetting } from '@/data/settings';
import { siteConfig } from '@/data/site-config';
import { coverageOpenings, hasPicks, withRepertoire } from '@/features/practice/chosen';
import { DueOutside } from '@/features/practice/due-outside';
import { startedSummary } from '@/features/practice/opening-summary';
import { loadProgress, type LearnerProgress, type OpeningProgress } from '@/features/practice/progress';
import { repertoireHref, repertoireReviewHref } from '@/features/practice/sources';
import { coverageOf } from '@/features/practice/today/coverage';
import { nextStateOf } from '@/features/practice/today/next';
import { useLoad } from '@/hooks/use-load';
import { to } from '@/router/location';
import { openingVariations, useStepActions } from './opening-data';
import { TickUndo } from './tick-undo';
import { savePicks, tickLabel, useTicks } from './use-ticks';
import { openingHref, openingSummary } from './views';

const ROOT = { label: 'Openings', href: to('/openings') };

const band = () => {
  const ratings = siteConfig.coverage.band.ratings;
  return `${ratings[0]} to ${ratings.at(-1)}`;
};

/** The slots of a repertoire, in their fixed order (docs/v2/components/repertoire-slots.md); the last only when used. */
const SLOTS = [
  { id: 'white', label: 'As White', why: 'Half your games are as White: choose what to play.' },
  {
    id: 'vs-e4',
    label: 'Against 1.e4',
    why: 'Half your games as Black start with 1.e4: choose what to play against it.',
  },
  { id: 'vs-d4', label: 'Against 1.d4', why: 'Most of the others start with 1.d4: choose what to play against it.' },
  { id: 'vs-other', label: 'Against the rest', why: '' },
] as const;

/** Which slot an opening fills, from its side and the move it answers. */
function slotOf(opening: BuiltOpening): (typeof SLOTS)[number]['id'] {
  if (opening.side === 'white') return 'white';
  const first = opening.lines[0]?.moves[0];
  return first === 'e2e4' ? 'vs-e4' : first === 'd2d4' ? 'vs-d4' : 'vs-other';
}

function slotsOf(progress: LearnerProgress, rows: ReturnType<typeof coverageOf>['rows']): RepertoireSlot[] {
  const slots = SLOTS.map((slot): RepertoireSlot => {
    const held = progress.chosen.filter((one) => slotOf(one.opening) === slot.id);
    const row = rows.find((candidate) => candidate.label === held[0]?.opening.name);
    const depth = row?.depths.find((candidate) => candidate.move === 10);
    return {
      ...slot,
      openings: held.map((one) => startedSummary(one, progress.newLeft)),
      ...(depth ? { coverage: depth, games: row?.games } : {}),
    };
  });
  return slots.filter((slot) => slot.id !== 'vs-other' || slot.openings.length);
}

/** What each slot's picker offers: the openings for it not already in it. */
function choicesOf(progress: LearnerProgress): Record<string, OpeningSummary[]> {
  const held = new Set(progress.chosen.map((one) => one.opening.id));
  const out: Record<string, OpeningSummary[]> = {};
  for (const one of progress.openings) {
    if (!held.has(one.opening.id)) (out[slotOf(one.opening)] ??= []).push(openingSummary(one.entry));
  }
  return out;
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** One opening of the repertoire: what is ticked in it, each with its tick to take it off. */
function TickedOpening({
  whole,
  view,
  progress,
}: {
  whole: OpeningProgress;
  view: OpeningProgress;
  progress: LearnerProgress;
}) {
  const opening = whole.opening;
  const actions = useStepActions(opening);
  const ticks = useTicks(opening);
  const stepIds = opening.steps.map((step) => step.id);
  const variations = useMemo(() => {
    const ids = new Set(view.stepStates.keys());
    return openingVariations({ one: whole, progress, puzzles: [] }).flatMap((variation) => {
      const steps = variation.steps.filter((step) => ids.has(step.id));
      return steps.length ? [{ ...variation, steps }] : [];
    });
  }, [whole, view, progress]);
  const counts = [...view.stepCounts.values()];
  const known = counts.reduce((sum, count) => sum + count.known, 0);
  const inReviews = counts.reduce((sum, count) => sum + count.inReviews, 0);
  const name = `the ${opening.name}`;
  return (
    <section className="grid gap-3" aria-labelledby={`ticked-${opening.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 id={`ticked-${opening.id}`} className="text-base font-semibold">
          <a href={openingHref(opening.id)} className="underline-offset-4 hover:underline">
            {opening.name}
          </a>
        </h3>
        <span className="text-sm text-muted-foreground">
          {plural(view.stepStates.size, 'step')}
          {view.due ? `, ${view.due} due` : ''}
        </span>
        <ProgressRing
          counts={{ total: view.cards.length, known, mastered: 0, learning: Math.max(0, inReviews - known) }}
          size="sm"
        />
        <ChooseTick state={ticks.stateOf(stepIds)} name={name} onToggle={() => ticks.toggle(stepIds, name)} />
      </div>
      <VariationList
        variations={variations}
        compact
        hideCheckpoints
        stepTick={(row) => {
          const label = `step ${stepLabel(row)}, ${stepTitle(row)}`;
          return (
            <ChooseTick state={ticks.stateOf([row.id])} name={label} onToggle={() => ticks.toggle([row.id], label)} />
          );
        }}
        variationTick={(row) => {
          const ids = opening.steps.filter((step) => step.variation === row.id).map((step) => step.id);
          const label = `the ${row.name}`;
          return <ChooseTick state={ticks.stateOf(ids)} name={label} onToggle={() => ticks.toggle(ids, label)} />;
        }}
        {...actions}
      />
    </section>
  );
}

function RepertoireView({ progress }: { progress: LearnerProgress }) {
  const next = useMemo(() => nextStateOf(progress), [progress]);
  const covered = useMemo(() => coverageOf(progress, coverageOpenings(progress)), [progress]);
  const slots = useMemo(() => slotsOf(progress, covered.rows), [progress, covered]);
  const choices = useMemo(() => choicesOf(progress), [progress]);
  const openings = progress.chosen;
  const steps = openings.reduce((sum, one) => sum + one.stepStates.size, 0);
  const knownSteps = openings.reduce(
    (sum, one) =>
      sum + [...one.stepStates.values()].filter((state) => state === 'known' || state === 'mastered').length,
    0,
  );
  const known = openings.reduce(
    (sum, one) => sum + [...one.stepCounts.values()].reduce((total, count) => total + count.known, 0),
    0,
  );
  const moves = openings.reduce((sum, one) => sum + one.cards.length, 0);
  const remove = (opening: OpeningSummary) =>
    savePicks(withoutOpening(getSetting('repertoire'), opening.id), tickLabel(false, `the ${opening.name}`));
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <Breadcrumbs root={ROOT} crumbs={[{ label: 'My repertoire' }]} />
      <TickUndo />
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My repertoire</h1>
          <p className="text-muted-foreground">
            {plural(openings.length, 'opening')}, {plural(steps, 'step')}, {knownSteps} known
          </p>
        </div>
        <ProgressRing counts={{ total: moves, known, mastered: 0 }} label="long" size="md" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <NextAction state={next} />
        <Card size="sm">
          <CardHeader>
            <CardTitle>All of it at once</CardTitle>
            <CardDescription>Everything ticked here, whichever opening it is in.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ModeCounts
              counts={{
                learn: { known: knownSteps, total: steps, newToday: progress.newLeft },
                review: { due: progress.due.length },
              }}
              hrefs={{ learn: next.nextOpenStep?.href ?? to('/openings'), review: repertoireReviewHref() }}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={repertoireReviewHref()}>
                  <Repeat aria-hidden /> Review and new moves
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={repertoireHref('drill')}>
                  <Crosshair aria-hidden /> Drill all of it
                </a>
              </Button>
              <Button asChild variant="ghost">
                <a href={repertoireHref('puzzles')}>
                  <Puzzle aria-hidden /> Puzzles
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <DueOutside progress={progress} />
      <RepertoireSlots
        slots={slots}
        editable
        band={band()}
        choices={choices}
        onChoose={(slot, opening) => {
          const replaced = slots.find((candidate) => candidate.id === slot)?.openings[0];
          const kept = replaced ? withoutOpening(getSetting('repertoire'), replaced.id) : getSetting('repertoire');
          savePicks([...kept, opening.id], tickLabel(true, `the ${opening.name}`));
        }}
        onRemove={(_slot, opening) => remove(opening)}
      />
      <section className="grid gap-6" aria-labelledby="ticked">
        <h2 id="ticked" className="text-lg font-semibold">
          What you have ticked
        </h2>
        {openings.map((view) => {
          const whole = progress.openings.find((one) => one.opening.id === view.opening.id)!;
          return <TickedOpening key={view.opening.id} whole={whole} view={view} progress={progress} />;
        })}
      </section>
      {covered.rows.length ? (
        <section className="grid gap-3" aria-labelledby="coverage">
          <h2 id="coverage" className="text-lg font-semibold">
            How much of what you meet you know
          </h2>
          <CoverageMeter rows={covered.rows} band={band()} target={covered.target} className="max-w-2xl" />
          {covered.gaps[0] ? (
            <GapLink
              gaps={covered.gaps}
              form="list"
              band={band()}
              target={covered.target}
              orientation={covered.gaps[0].side}
              className="max-w-2xl"
            />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

/**
 * The learner's repertoire (docs/v2/pages/repertoire.md): what is ticked, by opening, with its progress, what is due and
 * what to do next, and one place to go through all of it. The picks are read live, so a tick here changes it at once.
 */
export function RepertoirePage() {
  const data = useLoad(() => loadProgress(), []);
  const { value: picks } = useSetting('repertoire');
  const progress = useMemo(() => (data.data ? withRepertoire(data.data, picks) : undefined), [data.data, picks]);
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (!progress) return <main className="mx-auto max-w-7xl px-4 py-8" aria-busy="true" />;
  if (hasPicks(progress)) return <RepertoireView progress={progress} />;
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <Breadcrumbs root={ROOT} crumbs={[{ label: 'My repertoire' }]} />
      <TickUndo />
      <h1 className="text-2xl font-semibold tracking-tight">My repertoire</h1>
      <EmptyState
        kind="new"
        size="page"
        text="Nothing here yet. Open an opening and tick the circle beside a variation, a step or a line: it joins your repertoire, and Today, Review and Drill stick to what you have ticked."
        action={{ label: 'Browse openings', href: to('/openings') }}
      />
    </main>
  );
}
