import type { ItemState } from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { BookOpen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { Button } from '@/components/ui/button';
import { OpeningIntro } from '@/components/openings/opening-intro';
import type { StepData } from '@/components/openings/steps';
import { VariationList } from '@/components/openings/variation-list';
import { loadFacts, loadOpening } from '@/data/content';
import { learnerStore } from '@/data/learner';
import { useLoad } from '@/hooks/use-load';
import { bakedScore, stepMoves, stepStates } from './model';
import type { AttemptRow } from '@/data/learner-store';
import { checkpointsOf, latestCheckpoints } from '@/features/practice/progress';
import { navigate, to } from '@/router/location';
import { checkpointHref, stepHref, variationViews } from './views';

/** One opening: its introduction, its variations with their steps, and a board for the step picked. */
export function OpeningPage({ id }: { id: string }) {
  const data = useLoad(async () => {
    const [opening, facts, store] = await Promise.all([
      loadOpening(id),
      loadFacts(id).catch(() => undefined),
      learnerStore(),
    ]);
    const cards = await store.cards.all();
    const reviews = await store.reviews.forCards(cards.map((card) => card.id));
    const attempts = await store.attempts.recent(20_000);
    return { opening, facts, cards, reviews, attempts };
  }, [id]);
  if (data.error) return <main className="mx-auto max-w-7xl px-4 py-8 text-destructive">{data.error}</main>;
  if (!data.data) return <main className="mx-auto max-w-7xl px-4 py-8 text-muted-foreground">Loading…</main>;
  return <OpeningView {...data.data} />;
}

function OpeningView({
  opening,
  facts,
  cards,
  reviews,
  attempts,
}: {
  opening: BuiltOpening;
  facts?: OpeningFacts;
  attempts: AttemptRow[];
  cards: Awaited<ReturnType<Awaited<ReturnType<typeof learnerStore>>['cards']['all']>>;
  reviews: Awaited<ReturnType<Awaited<ReturnType<typeof learnerStore>>['reviews']['forCards']>>;
}) {
  const progress = useMemo(() => stepStates(opening, cards, reviews), [opening, cards, reviews]);
  const info = useMemo(() => {
    const map = new Map<string, { state: ItemState; counts: { mine: number; known: number; inReviews: number } }>();
    for (const step of opening.steps) {
      map.set(step.id, { state: progress.states.get(step.id)!, counts: progress.counts.get(step.id)! });
    }
    return map;
  }, [opening, progress]);
  const checkpoints = useMemo(
    () =>
      new Map(
        checkpointsOf(opening, progress.states, latestCheckpoints(attempts)).map((checkpoint) => [
          checkpoint.variation,
          { cleared: checkpoint.state === 'cleared', score: checkpoint.score, positions: checkpoint.positions },
        ]),
      ),
    [opening, progress, attempts],
  );
  const variations = useMemo(() => variationViews(opening, info, checkpoints), [opening, info, checkpoints]);
  const [picked, setPicked] = useState(opening.steps[0]?.id);
  const step = opening.steps.find((candidate) => candidate.id === picked) ?? opening.steps[0];
  const shown = useMemo(() => (step ? stepMoves(opening, step) : null), [opening, step]);
  const [index, setIndex] = useState(0);
  const positions = useMemo(() => {
    if (!shown) return [{ epd: opening.startEpd }];
    const moves = shown.moves;
    return [
      { epd: moves[0]?.before ?? opening.startEpd, score: bakedScore(facts, moves[0]?.before ?? opening.startEpd) },
      ...moves.map((move) => ({
        epd: move.after,
        lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
        marks: move.note,
        score: bakedScore(facts, move.after),
      })),
    ];
  }, [shown, opening, facts]);
  const stepNumber = (data: StepData) => data.number;
  const at = shown?.moves[index - 1];

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{opening.name}</h1>
        <p className="text-muted-foreground">{opening.side === 'white' ? 'As White' : 'As Black'}</p>
      </div>
      <OpeningIntro summary={opening.summary} about={opening.about} side={opening.side} variant="short" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <VariationList
          variations={variations}
          selected={picked}
          onSelect={(data) => {
            setPicked(data.id);
            setIndex(0);
          }}
          fold="all-open"
          onCheckpoint={(variation) => {
            if (variation) navigate(checkpointHref(opening.id, variation.id).slice(to('').length));
          }}
        />
        <div className="grid content-start gap-3 lg:sticky lg:top-20">
          <Board
            positions={positions}
            index={Math.min(index, positions.length - 1)}
            onIndex={setIndex}
            orientation={opening.side}
            caption={at?.note?.text ?? (step?.title ? <span className="font-medium">{step.title}</span> : null)}
            actions={
              step ? (
                <span className="text-sm text-muted-foreground">
                  Step {stepNumber(variations.flatMap((v) => v.steps).find((s) => s.id === step.id)!)}
                </span>
              ) : null
            }
          />
          {step ? (
            <div>
              <Button asChild>
                <a href={stepHref(opening.id, opening.steps.indexOf(step) + 1)}>
                  <BookOpen aria-hidden /> Learn this step
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
