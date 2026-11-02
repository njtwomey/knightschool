import { BookOpen, Repeat, Route } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { RichText } from '@/components/chess/rich-text';
import { MapIndex } from '@/components/map/map-index';
import { MapLegend } from '@/components/map/map-legend';
import { MapTree, type MapFocus } from '@/components/map/map-tree';
import type { MapNode } from '@/components/map/lane-layout';
import type { MapOverlay, MoveState } from '@/components/map/map-types';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { cardStates } from '@/features/learn/model';
import { followUpStates, openingFollowUps, type OpeningData } from '@/features/learn/opening-data';
import { OpeningCrumbs, OpeningFrame } from '@/features/learn/opening-frame';
import { lineHref, stepHref } from '@/features/learn/views';
import { to } from '@/router/location';
import { openingMap } from './map-data';

/** An opening's Map tab (docs/v2/pages/map.md): every line as one tree, coloured by progress, with gaps and mistakes. */
export function OpeningMapPage({ id }: { id: string }) {
  return <OpeningFrame id={id}>{(data) => <MapView key={id} data={data} />}</OpeningFrame>;
}

const OFFERED: readonly MapOverlay[] = ['progress', 'gaps', 'mistakes', 'lines'];

/** The picked line and move from the address (`#line=<id>&m=<uci.uci...>`), if they name a move of that line. */
function focusFromHash(lines: { id: string; moves: { uci: string }[] }[]): MapFocus | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const line = lines.find((candidate) => candidate.id === hash.get('line'));
  const moves = hash.get('m')?.split('.').filter(Boolean) ?? [];
  if (!line || !moves.length || moves.some((uci, i) => line.moves[i]?.uci !== uci)) return null;
  return { line: line.id, ply: moves.length - 1 };
}

function MapView({ data }: { data: OpeningData }) {
  const { one, progress } = data;
  const opening = one.opening;
  const map = useMemo(() => {
    const followUps = openingFollowUps(data);
    return openingMap(
      opening,
      one.facts,
      cardStates(progress.cards, progress.reviews),
      followUps,
      followUpStates(data, followUps),
      siteConfig.coverage.minShare,
    );
  }, [data, opening, one.facts, progress]);
  const main = map.lines[0];
  const [focus, setFocus] = useState<MapFocus>(
    () => focusFromHash(map.lines) ?? { line: main?.id ?? '', ply: Math.max(0, map.trigger - 1) },
  );
  const [overlays, setOverlays] = useState<Set<MapOverlay>>(() => new Set(['progress', 'gaps', 'mistakes']));
  const [subtree, setSubtree] = useState<string | null>(null);
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<MapNode | null>(null);
  const [pulse, setPulse] = useState<MoveState | null>(null);
  const [isolate, setIsolate] = useState<MoveState | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const line = map.lines.find((candidate) => candidate.id === focus.line) ?? main;
  const moves = line?.moves ?? [];
  const move = moves[focus.ply];

  // The picked line and move stay in the address, so a refresh or a shared link comes back to them.
  useEffect(() => {
    if (!line) return;
    const m = moves
      .slice(0, focus.ply + 1)
      .map((one) => one.uci)
      .join('.');
    window.history.replaceState(null, '', `#line=${line.id}&m=${m}`);
  }, [line, moves, focus.ply]);

  const positions = useMemo(
    () => [
      { epd: moves[0]?.before ?? opening.startEpd },
      ...moves.map((one) => ({
        epd: one.after,
        lastMove: { from: one.uci.slice(0, 2), to: one.uci.slice(2, 4) },
        marks: opening.positions[one.before]?.moves.find((candidate) => candidate.uci === one.uci)?.note,
      })),
    ],
    [moves, opening],
  );
  const comment = move
    ? opening.positions[move.before]?.moves.find((candidate) => candidate.uci === move.uci)?.note?.text
    : undefined;
  // Learn opens the step that teaches the move (the first step whose stretch of this line reaches it).
  const stepIndex = opening.steps.findIndex(
    (step) => step.line === focus.line && focus.ply >= step.from && focus.ply <= step.to,
  );
  const pickLine = (id: string) =>
    setFocus({ line: id, ply: Math.max(0, (map.lines.find((l) => l.id === id) ? map.trigger : 1) - 1) });
  const toggle = <T,>(set: Set<T>, value: T, on: boolean) => {
    const next = new Set(set);
    if (on) next.add(value);
    else next.delete(value);
    return next;
  };

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-4 py-8">
      <OpeningCrumbs catalog={progress.catalog} opening={opening} tab="map" />
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <MapIndex
          lines={map.index}
          picked={focus.line}
          subtree={subtree}
          folded={folded}
          showProgress={overlays.has('progress')}
          side={opening.side}
          onPick={pickLine}
          onSubtree={setSubtree}
          onFold={(id, fold) => setFolded((current) => toggle(current, id, fold))}
          onOpenAll={() => setFolded(new Set())}
        />
        <MapTree
          lines={map.lines}
          side={opening.side}
          trigger={map.trigger}
          overlays={overlays}
          data={map.data}
          focus={focus}
          subtree={subtree}
          folded={folded}
          onPick={(next) => {
            setFocus(next);
            setNote(null);
          }}
          onSubtree={setSubtree}
          onUnfold={(id) => setFolded((current) => toggle(current, id, false))}
          onHover={setHover}
          onGap={(node, gap) =>
            setNote(
              `After ${node.move.san}, ${gap.san} is played in ${Math.round(gap.share * 100)}% of games at your level, and nothing in this opening answers it yet.`,
            )
          }
          onMistake={(node) =>
            setNote(`After ${node.move.san}, the opponent often goes wrong here: its follow-up teaches the punishment.`)
          }
          pulse={pulse}
          isolate={isolate}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)_minmax(0,17rem)]">
        <Board
          positions={positions}
          index={Math.min(focus.ply + 1, positions.length - 1)}
          onIndex={(index) => setFocus({ ...focus, ply: Math.max(0, index - 1) })}
          orientation={opening.side}
          lit={hover ? [hover.move.uci.slice(0, 2), hover.move.uci.slice(2, 4)] : undefined}
        />
        <div className="grid content-start gap-3">
          <p className="font-medium">{line?.name}</p>
          {comment ? (
            <RichText text={comment} />
          ) : (
            <p className="text-sm text-muted-foreground">No comment on this move.</p>
          )}
          {note ? <p className="rounded-md border border-dashed p-2 text-sm">{note}</p> : null}
          <div className="flex flex-wrap gap-2">
            {stepIndex >= 0 ? (
              <Button asChild size="sm">
                <a href={stepHref(opening.id, stepIndex + 1)}>
                  <BookOpen aria-hidden /> Learn
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <a href={to(`/practice/review/${opening.id}`)}>
                <Repeat aria-hidden /> Review
              </a>
            </Button>
            {line ? (
              <Button asChild size="sm" variant="ghost">
                <a href={lineHref(opening.id, line.id)}>
                  <Route aria-hidden /> Open line
                </a>
              </Button>
            ) : null}
          </div>
        </div>
        <MapLegend
          available={OFFERED}
          on={overlays}
          onToggle={(overlay, on) => setOverlays((current) => toggle(current, overlay, on))}
          counts={map.counts}
          lines={map.index}
          minShare={siteConfig.coverage.minShare}
          onPulse={setPulse}
          isolated={isolate}
          onIsolate={setIsolate}
        />
      </div>
    </main>
  );
}
