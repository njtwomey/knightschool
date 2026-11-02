import { lineEarnsCards, numberedMove } from '@knightschool/core';
import { Play, Target } from 'lucide-react';
import { useMemo } from 'react';
import { KindBadge } from '@/components/chess/kind-badge';
import { StepRow } from '@/components/openings/step-row';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { modeHref } from '@/features/practice/sources';
import { to } from '@/router/location';
import { LearnFlow } from './learn-flow';
import { bakedScore, branchPly, cardStates, lineMoves } from './model';
import { openingVariations, useStepActions, type OpeningData } from './opening-data';
import { LearnCrumbs } from './learn-crumbs';
import { OpeningFrame } from './opening-frame';
import { lineHref, lineViews, linesHref } from './views';

/**
 * One line inside an opening (docs/v2/pages/line.md), taught through the same Learn flow as a step: Learn (the line's
 * story from where it branches off, every note and refutation, beside the board), Try (the learner plays their moves of
 * it), Done. Below, the steps that teach it.
 */
export function LinePage({ id, line }: { id: string; line: string }) {
  return (
    <OpeningFrame id={id}>
      {(data) =>
        data.one.opening.lines.some((candidate) => candidate.id === line) ? (
          <LineView key={line} data={data} lineId={line} />
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-8">
            <EmptyState
              kind="no-match"
              size="page"
              text={`The ${data.one.opening.name} does not teach a line called "${line}".`}
              action={{ label: 'Its lines', href: linesHref(id) }}
            />
          </main>
        )
      }
    </OpeningFrame>
  );
}

function LineView({ data, lineId }: { data: OpeningData; lineId: string }) {
  const { one, progress } = data;
  const opening = one.opening;
  const actions = useStepActions(opening);
  const line = opening.lines.find((candidate) => candidate.id === lineId)!;
  const views = useMemo(() => lineViews(opening, cardStates(progress.cards, progress.reviews)), [opening, progress]);
  const view = views.find((candidate) => candidate.id === lineId)!;
  const branch = branchPly(opening, lineId);
  const all = useMemo(() => lineMoves(opening, lineId), [opening, lineId]);
  const own = useMemo(() => all.slice(branch), [all, branch]);
  const lead = all[branch - 1];
  const earns = lineEarnsCards(line);
  // The parent: the earlier line it shares the most moves with.
  const parent = opening.lines
    .slice(0, opening.lines.indexOf(line))
    .map((other) => {
      let same = 0;
      while (same < line.moves.length && other.moves[same] === line.moves[same]) same++;
      return { other, same };
    })
    .sort((a, b) => b.same - a.same)[0];
  // What grows from it: later lines that leave this one after its own branch point.
  const grows = views.filter((candidate) => {
    const other = opening.lines.find((l) => l.id === candidate.id)!;
    if (opening.lines.indexOf(other) <= opening.lines.indexOf(line)) return false;
    let same = 0;
    while (same < other.moves.length && line.moves[same] === other.moves[same]) same++;
    return same > branch && same === branchPly(opening, candidate.id);
  });
  const variations = useMemo(() => openingVariations(data), [data]);
  const teaching = variations.flatMap((v) => v.steps).filter((row) => opening.steps[row.number - 1]?.line === lineId);
  const variation = opening.variations.find((v) => v.id === line.variation);
  const mine = own.filter((move) => move.mine);
  const sideName = opening.side === 'white' ? 'White' : 'Black';

  return (
    <LearnFlow
      data={data}
      item={`line:${lineId}`}
      remember={false}
      crumbs={<LearnCrumbs data={data} at={{ line: lineId }} />}
      title={
        <>
          {view.name}
          <KindBadge kind={view.kind} writtenFor={view.writtenFor} learner={view.side} />
        </>
      }
      subtitle={`In the ${variation?.name ?? line.variation} of the ${opening.name}`}
      moves={own}
      {...(lead ? { lead: { uci: lead.uci, ...(lead.note ? { note: lead.note } : {}) } } : {})}
      intro={
        <p className="max-w-prose">
          {mine.length
            ? `${mine.length} ${mine.length === 1 ? 'move' : 'moves'} of yours, from ${numberedMove(mine[0]!.ply, mine[0]!.san)}. Step through the line with the reason for each move, then play your moves without help.`
            : 'Step through the line with the reason for each move.'}
          {earns ? null : ' This line is shown, never drilled: playing it saves nothing to your reviews.'}
        </p>
      }
      story={{
        ...(parent && branch > opening.startPly
          ? {
              start: {
                parent: parent.other.name ?? parent.other.id,
                href: lineHref(opening.id, parent.other.id),
                shared: all.slice(Math.max(opening.startPly, branch - 2), branch).map((move) => ({
                  san: move.san,
                  uci: move.uci,
                  after: move.after,
                })),
              },
            }
          : {}),
        end: { score: bakedScore(one.facts, all.at(-1)?.after ?? opening.startEpd), plan: variation?.plans[0] },
        grows,
      }}
      refutations="all"
      practice={{
        prompt: `Play ${sideName}'s moves of the line`,
        context: 'The other side plays the line’s replies. A wrong move snaps back and says why.',
        save: earns ? 'moves' : 'none',
      }}
      done={{
        known: (now) => {
          const states = cardStates(now.progress.cards, now.progress.reviews);
          return (
            earns &&
            mine.every((move) => ['known', 'mastered'].includes(states.get(`move:${move.before}:${move.uci}`) ?? ''))
          );
        },
        words: ({ known }) => ({
          headline: known ? `${view.name} is known` : `${view.name} done`,
          sentence: !earns
            ? 'This line is shown, never drilled, so nothing was saved.'
            : known
              ? 'Every move of yours in it has been right twice running. They come back in your reviews.'
              : `A move is known once it has been right ${siteConfig.judge.knownAfterRight} times running. Its moves are in your reviews either way.`,
        }),
        actions: () => (
          <>
            <Button asChild variant="outline">
              <a href={modeHref('drill', { opening: opening.id, variation: line.variation })}>
                <Target aria-hidden /> Drill the {variation?.name ?? 'variation'}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={to(`/practice/play-on/${opening.id}/lines/${lineId}`)}>
                <Play aria-hidden /> Play on from the end
              </a>
            </Button>
          </>
        ),
      }}
      footer={
        teaching.length ? (
          <section className="grid gap-3" aria-labelledby="line-steps">
            <h2 id="line-steps" className="text-lg font-semibold">
              Steps that teach it
            </h2>
            <div className="grid gap-2">
              {teaching.map((row) => (
                <StepRow key={row.id} step={row} testOut={siteConfig.teach.testOut} {...actions} />
              ))}
            </div>
          </section>
        ) : null
      }
    />
  );
}
