import { playMove } from '@knightschool/core';
import { BookOpen, Play, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { BoardColumns } from '@/components/shared/board-columns';
import { BoardNotes } from '@/components/board/board-notes';
import { KindBadge } from '@/components/chess/kind-badge';
import { LineStory, type StoryMove } from '@/components/openings/line-story';
import { StepRow } from '@/components/openings/step-row';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { modeHref } from '@/features/practice/sources';
import { to } from '@/router/location';
import { bakedScore, branchPly, cardStates, lineMoves } from './model';
import { openingIdeas, openingVariations, useStepActions, type OpeningData } from './opening-data';
import { OpeningCrumbs, OpeningFrame } from './opening-frame';
import { lineHref, lineViews, linesHref } from './views';

/** One line told in words, inside an opening (docs/v2/pages/line.md): its moves and comments, and the steps teaching it. */
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
  const ideaList = useMemo(
    () => openingIdeas(progress.catalog, [...new Set(own.flatMap((move) => move.note?.ideas ?? []))]),
    [progress, own],
  );
  const story: StoryMove[] = own.map((move) => {
    const refutation = opening.positions[move.before]?.refutations?.[0];
    let epd = move.before;
    const refMoves = refutation
      ? [{ uci: refutation.uci, san: refutation.san }, ...refutation.then].flatMap((m) => {
          const played = playMove(epd, m.uci);
          if (!played) return [];
          epd = played.epd;
          return [{ san: played.san, uci: played.uci, after: played.epd }];
        })
      : [];
    return {
      san: move.san,
      uci: move.uci,
      after: move.after,
      ...(move.note
        ? {
            note: {
              ...(move.note.text ? { text: move.note.text } : {}),
              ...(move.note.tags ? { tags: move.note.tags } : {}),
              ideas: ideaList.filter((idea) => move.note?.ideas?.includes(idea.id)),
            },
            ...(move.note.nag ? { nag: move.note.nag } : {}),
          }
        : {}),
      ...(refutation && refMoves.length
        ? { refutation: { moves: refMoves, ...(refutation.note?.text ? { text: refutation.note.text } : {}) } }
        : {}),
    };
  });
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

  const positions = useMemo(
    () => [
      { epd: own[0]?.before ?? opening.startEpd, score: bakedScore(one.facts, own[0]?.before ?? opening.startEpd) },
      ...own.map((move) => ({
        epd: move.after,
        lastMove: { from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) },
        marks: move.note,
        score: bakedScore(one.facts, move.after),
      })),
    ],
    [own, opening, one.facts],
  );
  const [index, setIndex] = useState(0);
  const at = own[index - 1];

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
      <OpeningCrumbs
        catalog={progress.catalog}
        opening={opening}
        crumbs={[
          {
            label: view.name,
            siblings: {
              current: lineId,
              label: 'Lines',
              items: views.map((v) => ({ id: v.id, label: v.name, href: lineHref(opening.id, v.id) })),
            },
          },
        ]}
      />
      <div className="grid gap-2">
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">
          {view.name}
          <KindBadge kind={view.kind} writtenFor={view.writtenFor} learner={view.side} />
        </h1>
        <p className="text-muted-foreground">
          In the {variation?.name ?? line.variation} of the {opening.name}
        </p>
        <div className="flex flex-wrap gap-2">
          {view.learnHref ? (
            <Button asChild>
              <a href={view.learnHref}>
                <BookOpen aria-hidden /> Learn it
              </a>
            </Button>
          ) : null}
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
        </div>
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
              startText="Step through the line with the arrows, or click a move in the story."
              side={opening.side}
            />
          </>
        }
      >
        <LineStory
          moves={story}
          firstPly={branch}
          side={opening.side}
          {...(parent && branch > opening.startPly
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
            : {})}
          end={{ score: bakedScore(one.facts, all.at(-1)?.after ?? opening.startEpd), plan: variation?.plans[0] }}
          grows={grows}
          current={index - 1}
          onSelect={(i) => setIndex(i + 1)}
          evalAfter="words"
        />
      </BoardColumns>
      {teaching.length ? (
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
      ) : null}
    </main>
  );
}
