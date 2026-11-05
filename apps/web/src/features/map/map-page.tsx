import { BookOpen, Repeat, Route } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '@/components/board/board';
import { EvalWords } from '@/components/chess/eval-words';
import { RichText } from '@/components/chess/rich-text';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { MapIndex } from '@/components/map/map-index';
import { MapLegend } from '@/components/map/map-legend';
import { MapTree, type MapFocus } from '@/components/map/map-tree';
import { layoutLines, type MapNode } from '@/components/map/lane-layout';
import type { MapOverlay } from '@/components/map/map-types';
import { FullPage } from '@/components/shared/full-page';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import { bakedScore, cardStates } from '@/features/learn/model';
import { followUpStates, openingFollowUps, openingIdeas, type OpeningData } from '@/features/learn/opening-data';
import { OpeningCrumbs, OpeningFrame } from '@/features/learn/opening-frame';
import { followUpHref, lineHref, stepHref } from '@/features/learn/views';
import { to } from '@/router/location';
import { openingMap } from './map-data';
import { alphabetical } from '@/components/finding/sort';

/**
 * An opening's Map tab (docs/v2/pages/map.md), for computers: the whole screen, with the lines on the left, every line
 * as one tree in the middle, and the board with the move's description on the right. Main lines by default.
 */
export function OpeningMapPage({ id }: { id: string }) {
  return <OpeningFrame id={id}>{(data) => <MapView key={id} data={data} />}</OpeningFrame>;
}

const OFFERED: readonly MapOverlay[] = ['mistakes', 'gaps'];
type Detail = 'main' | 'all';

/** The picked line and move from the address (`#line=<id>&m=<uci.uci...>`; with no moves, where the line starts). */
function focusFromHash(lines: { id: string; moves: { uci: string }[] }[]): MapFocus | { line: string } | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const line = lines.find((candidate) => candidate.id === hash.get('line'));
  if (!line) return null;
  const moves = hash.get('m')?.split('.').filter(Boolean) ?? [];
  if (!moves.length || moves.some((uci, i) => line.moves[i]?.uci !== uci)) return { line: line.id };
  return { line: line.id, ply: moves.length - 1 };
}

function MapView({ data }: { data: OpeningData }) {
  const { one, progress } = data;
  const opening = one.opening;
  const facts = one.facts;
  const map = useMemo(() => {
    const followUps = openingFollowUps(data);
    return openingMap(
      opening,
      one.facts,
      cardStates(progress.cards, progress.reviews),
      followUps,
      followUpStates(data, followUps),
      siteConfig.coverage.minShare,
      siteConfig.judge.grades,
    );
  }, [data, opening, one.facts, progress]);
  const parents = useMemo(() => layoutLines(map.lines, { trigger: map.trigger }).parents, [map]);
  /** Where a line's own moves begin: what picking it goes to. */
  const startOf = (id: string) => {
    const line = map.lines.find((candidate) => candidate.id === id);
    const parent = parents.get(id);
    const other = map.lines.find((candidate) => candidate.id === parent);
    let ply = 0;
    while (line && other && line.moves[ply] && line.moves[ply]!.uci === other.moves[ply]?.uci) ply++;
    return Math.max(ply, map.trigger - 1, 0);
  };
  const main = map.lines[0];
  const [focus, setFocus] = useState<MapFocus>(() => {
    const from = focusFromHash(map.lines);
    if (from) return 'ply' in from ? from : { line: from.line, ply: startOf(from.line) };
    return { line: main?.id ?? '', ply: Math.max(0, map.trigger - 1) };
  });
  const [detail, setDetail] = useState<Detail>('main');
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [overlays, setOverlays] = useState<Set<MapOverlay>>(() => new Set(['mistakes']));
  const [hover, setHover] = useState<{ node: MapNode; at: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // The main lines, what a heading opened, and always the picked line with what it grows from.
  const visible = useMemo(() => {
    const ids = new Set<string>();
    for (const line of map.index) {
      if (detail === 'all' || map.main.has(line.id) || (line.group && opened.has(line.group))) ids.add(line.id);
    }
    ids.add(focus.line);
    for (const id of [...ids]) for (let up = parents.get(id); up; up = parents.get(up)) ids.add(up);
    // A follow-up branches off its line as a mistake and its punishment, wherever that line is in view.
    if (overlays.has('mistakes')) {
      for (const id of map.followUps.keys()) if (ids.has(parents.get(id) ?? '')) ids.add(id);
    } else if (!map.followUps.has(focus.line)) {
      for (const id of map.followUps.keys()) ids.delete(id);
    }
    return ids;
  }, [map, detail, opened, focus.line, parents, overlays]);
  const drawn = useMemo(() => map.lines.filter((line) => visible.has(line.id)), [map, visible]);

  const line = map.lines.find((candidate) => candidate.id === focus.line) ?? main;
  const moves = line?.moves ?? [];
  const move = moves[focus.ply];
  const key = moves
    .slice(0, focus.ply + 1)
    .map((one) => one.uci)
    .join(' ');

  // The picked line and move stay in the address, so a refresh or a shared link comes back to them.
  useEffect(() => {
    if (!line) return;
    window.history.replaceState(null, '', `#line=${line.id}&m=${key.replaceAll(' ', '.')}`);
  }, [line, key]);

  const positions = useMemo(
    () => [
      { epd: moves[0]?.before ?? opening.startEpd, score: bakedScore(facts, moves[0]?.before ?? opening.startEpd) },
      ...moves.map((one) => ({
        epd: one.after,
        score: bakedScore(facts, one.after),
        lastMove: { from: one.uci.slice(0, 2), to: one.uci.slice(2, 4) },
        marks: one.note ?? opening.positions[one.before]?.moves.find((candidate) => candidate.uci === one.uci)?.note,
      })),
    ],
    [moves, opening, facts],
  );
  const comment = move
    ? (move.note?.text ??
      opening.positions[move.before]?.moves.find((candidate) => candidate.uci === move.uci)?.note?.text)
    : undefined;
  const followUpLink = map.followUps.get(focus.line);
  const gaps = map.data.gaps?.[key] ?? [];
  const mistake = map.data.mistakes?.[key];
  // Learn opens the step that teaches the move (the first step whose stretch of this line reaches it).
  const stepIndex = opening.steps.findIndex(
    (step) => step.line === focus.line && focus.ply >= step.from && focus.ply <= step.to,
  );
  /** Asks the map to take keyboard focus: after a pick in the index, the arrow keys drive the map. */
  const [focusRequest, setFocusRequest] = useState(0);
  const pickLine = (id: string) => {
    setFocus({ line: id, ply: startOf(id) });
    setNote(null);
    setFocusRequest((n) => n + 1);
  };
  const pick = (next: MapFocus) => {
    setFocus(next);
    setNote(null);
  };
  const ideas = openingIdeas(progress.catalog, [...map.ideas.keys()]).sort((a, b) => alphabetical(a.name, b.name));
  const groups = useMemo(() => [...map.groups].sort((a, b) => alphabetical(a.name, b.name)), [map]);
  // Mistakes are branches with their marks in the pills now; the description still reads them from `map.data`.
  const treeData = useMemo(() => {
    const { mistakes: _drawn, ...rest } = map.data;
    return rest;
  }, [map]);

  return (
    <FullPage trail={<OpeningCrumbs catalog={progress.catalog} opening={opening} tab="map" />}>
      <div className="grid h-full grid-cols-[21rem_minmax(0,1fr)_27rem] grid-rows-[minmax(0,1fr)] gap-3">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
          <div className="grid gap-2">
            <FilterToggle
              label="Lines shown"
              showLabel={false}
              size="sm"
              value={detail}
              onChange={setDetail}
              options={[
                { value: 'main', label: 'Main lines' },
                { value: 'all', label: `All ${opening.lines.length}` },
              ]}
            />
            {ideas.length ? (
              <div className="flex flex-wrap gap-1">
                {ideas.map((idea) => (
                  <Button
                    key={idea.id}
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      pick(map.ideas.get(idea.id)!);
                      setFocusRequest((n) => n + 1);
                    }}
                  >
                    {idea.name}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <MapIndex
            lines={map.index}
            groups={groups}
            visible={visible}
            expanded={opened}
            onGroup={(id) => {
              const opens = !opened.has(id);
              setOpened((current) => {
                const next = new Set(current);
                if (!next.delete(id)) next.add(id);
                return next;
              });
              // Opening a variation goes to it on the map.
              const first = map.index.find((one) => one.group === id);
              if (opens && first) pickLine(first.id);
            }}
            picked={focus.line}
            side={opening.side}
            onPick={pickLine}
            className="h-full min-h-0 content-start overflow-y-auto pr-1"
          />
        </div>
        <MapTree
          fill
          focusRequest={focusRequest}
          className="min-h-0"
          lines={drawn}
          side={opening.side}
          trigger={map.trigger}
          overlays={overlays}
          data={treeData}
          focus={focus}
          onPick={pick}
          onHover={(node) => setHover(node ? { node, at: key } : null)}
          onGap={(node, gap) =>
            setNote(
              `After ${node.move.san}, ${gap.san} is played in ${Math.round(gap.share * 100)}% of games at your level, and nothing in this opening answers it yet.`,
            )
          }
          onMistake={(node) => {
            const found = map.data.mistakes?.[node.key];
            setNote(
              `${found?.san ?? 'The opponent'} here is a common ${found?.grade ?? 'mistake'}: its follow-up teaches the punishment.`,
            );
          }}
        />
        <div className="grid min-h-0 content-start gap-3 overflow-y-auto pr-1">
          <Board
            keys
            positions={positions}
            index={Math.min(focus.ply + 1, positions.length - 1)}
            onIndex={(index) => pick({ ...focus, ply: Math.max(0, index - 1) })}
            orientation={opening.side}
            // A hover lights its move only until the cursor moves: the keys win.
            lit={hover?.at === key ? [hover.node.move.uci.slice(0, 2), hover.node.move.uci.slice(2, 4)] : undefined}
          />
          <div className="grid gap-2">
            <p className="font-medium">{line?.name}</p>
            <EvalWords
              className="text-sm"
              score={bakedScore(facts, move?.after ?? opening.startEpd)}
              {...(move && facts?.evals[move.after] ? { depth: facts.evals[move.after]!.depth } : {})}
            />
            {comment ? (
              <RichText text={comment} />
            ) : (
              <p className="text-sm text-muted-foreground">No comment on this move.</p>
            )}
            {mistake ? (
              <p className="text-sm">
                {mistake.san} is played here in {Math.round(mistake.share * 100)}% of games at your level, and it is a{' '}
                {mistake.grade ?? 'mistake'}.
              </p>
            ) : null}
            {gaps.length ? (
              <p className="text-sm text-muted-foreground">
                Not covered here: {gaps.map((gap) => `${gap.san} (${Math.round(gap.share * 100)}%)`).join(', ')}.
              </p>
            ) : null}
            {note ? <p className="rounded-md border border-dashed p-2 text-sm">{note}</p> : null}
            <div className="flex flex-wrap gap-2">
              {followUpLink || stepIndex >= 0 ? (
                <Button asChild size="sm">
                  <a
                    href={
                      followUpLink
                        ? followUpHref(opening.id, followUpLink.step, followUpLink.index)
                        : stepHref(opening.id, stepIndex + 1)
                    }
                  >
                    <BookOpen aria-hidden /> Learn
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline">
                <a href={to(`/practice/review/${opening.id}`)}>
                  <Repeat aria-hidden /> Review
                </a>
              </Button>
              {line && !followUpLink ? (
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
            onToggle={(overlay, on) =>
              setOverlays((current) => {
                const next = new Set(current);
                if (on) next.add(overlay);
                else next.delete(overlay);
                return next;
              })
            }
            minShare={siteConfig.coverage.minShare}
          />
        </div>
      </div>
    </FullPage>
  );
}
