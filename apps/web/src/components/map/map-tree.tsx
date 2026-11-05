import { moveNumber } from '@knightschool/core';
import { Check, Maximize, Puzzle, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun } from '@/components/chess/move-run';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { keyOf, layoutLines, type MapLine, type MapNode } from './lane-layout';
import { laneColour } from './lane-colours';
import { PILL_FILL, STATE_NAME, type MapGap, type MapOverlay, type MapOverlayData, type MoveState } from './map-types';
import { GRADE_FILL, GRADE_TEXT } from '@/components/chess/grade-style';

const COL = 70;
/** A lane: compact, because a line's name sits beside it, not above it. */
const LANE = 32;
const HEADER = 30;
/** Room for the first line's name beside the moves every line shares. */
const LABEL_W = 190;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;

const clamp = (zoom: number) => Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) * 100) / 100;

/** The author's marks, in the colours of the grades they stand for. */
const MARK_GRADE: Record<string, keyof typeof GRADE_TEXT> = {
  '!!': 'best',
  '!': 'excellent',
  '!?': 'good',
  '?!': 'inaccuracy',
  '?': 'mistake',
  '??': 'blunder',
};

export type MapFocus = { line: string; ply: number };

export type MapTreeProps = {
  /** In order: the first is the main line, drawn across the top. */
  lines: readonly MapLine[];
  /** The learner's side: their moves are bold. */
  side: 'white' | 'black';
  /** Plies every line shares, drawn as the first pill (default: all they share). */
  trigger?: number;
  overlays?: ReadonlySet<MapOverlay>;
  data?: MapOverlayData;
  /** Lines picked out; the rest dim. */
  lit?: readonly string[];
  /** The move shown on the board. */
  focus?: MapFocus | null;
  /** Draw only what grows from one line. */
  subtree?: string | null;
  folded?: ReadonlySet<string>;
  onPick?: (focus: MapFocus) => void;
  onUnfold?: (line: string) => void;
  onHover?: (node: MapNode | null) => void;
  onGap?: (node: MapNode, gap: MapGap) => void;
  onMistake?: (node: MapNode) => void;
  /** Hover a pill opens a small board (when there is no board in view); otherwise its hint. */
  previews?: boolean;
  /** Where zoom starts: fit to the box, or a factor. */
  zoom?: 'fit' | number;
  onZoom?: (zoom: number) => void;
  loading?: boolean;
  /** Pills in this state pulse (a legend sample hovered); with `isolate`, the rest dim. */
  pulse?: MoveState | null;
  isolate?: MoveState | null;
  /** Fill the box it is in, rather than a fixed height (the map page). */
  fill?: boolean;
  /** Change it to move keyboard focus to the map, so the arrow keys drive it after a pick elsewhere. */
  focusRequest?: number;
  className?: string;
};

/**
 * The tree of lines as lanes of move pills, one column per move and one lane per line, the main line across the top;
 * overlays for progress, gaps, the opponent's mistakes, coverage and puzzles (docs/v2/components/map-tree.md).
 * Only a click changes anything.
 */
export function MapTree({
  lines,
  side,
  trigger,
  overlays = new Set<MapOverlay>(['lines']),
  data = {},
  lit,
  focus,
  subtree,
  folded,
  onPick,
  onUnfold,
  onHover,
  onGap,
  onMistake,
  previews = false,
  zoom: initialZoom = 1,
  onZoom,
  loading,
  pulse,
  isolate,
  fill,
  focusRequest,
  className,
}: MapTreeProps) {
  const layout = useMemo(() => layoutLines(lines, { trigger, folded, subtree }), [lines, trigger, folded, subtree]);
  const scroller = useRef<HTMLDivElement>(null);
  const [zoom, setZoomState] = useState(typeof initialZoom === 'number' ? initialZoom : 1);
  const setZoom = (next: number) => setZoomState(clamp(next));
  const reported = useRef(zoom);
  useEffect(() => {
    if (reported.current === zoom) return;
    reported.current = zoom;
    onZoom?.(zoom);
  }, [zoom, onZoom]);
  const on = (overlay: MapOverlay) => overlays.has(overlay);
  const laneH = on('gaps') ? LANE + 14 : LANE;
  // The moves every line shares, as one pill, with room after it for the first line's name.
  const triggerPill = layout.trigger.reduce((n, move) => n + move.san.length + 4, 0) * 8 + 24;
  const triggerW = layout.trigger.length > 0 ? triggerPill + LABEL_W : LABEL_W;
  const colX = (column: number) => (column === 0 ? triggerPill / 2 : triggerW + (column - 1) * COL + COL / 2);
  const colLeft = (column: number) => (column === 0 ? 0 : triggerW + (column - 1) * COL);
  // Room at the end for a folded line's +N and for the zoom buttons over the move numbers.
  const width = colLeft(layout.columns) + COL * 1.5 + 72;
  const height = layout.lanes.length * laneH + 8;
  const pillY = (lane: number) => lane * laneH + laneH / 2 + 2;
  /** A lane's colour: its line's, so a line here and its dot in the index read together. */
  const colourOfLane = (lane: number) => laneColour(layout.lanes[lane]?.line.colour ?? lane);
  const linesThrough = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const line of lines) {
      let key = '';
      for (const move of line.moves) {
        key = key ? `${key} ${move.uci}` : move.uci;
        const through = map.get(key);
        if (through) through.push(line.id);
        else map.set(key, [line.id]);
      }
    }
    return map;
  }, [lines]);
  const fit = () => {
    const box = scroller.current;
    if (box) setZoom(box.clientWidth / width);
  };

  useEffect(() => {
    if (initialZoom === 'fit') fit();
    // Fit once, when the map first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ctrl or Cmd with the wheel zooms (a trackpad pinch arrives as one); a plain wheel scrolls.
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoomState((current) => clamp(current * (event.deltaY < 0 ? 1.1 : 1 / 1.1)));
    };
    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, []);

  const focusKey = focus ? keyOf(lines.find((line) => line.id === focus.line)?.moves ?? [], focus.ply + 1) : null;

  useEffect(() => {
    if (focusRequest) scroller.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  // The move shown on the board is always in view: picking a line in the index brings the map to it.
  useEffect(() => {
    const box = scroller.current;
    const node = focusKey ? layout.byKey.get(focusKey) : undefined;
    if (!box || !node) return;
    const x = colX(node.column) * zoom;
    const y = (pillY(node.lane) + HEADER) * zoom;
    const margin = 90;
    const seen =
      x > box.scrollLeft + margin &&
      x < box.scrollLeft + box.clientWidth - margin &&
      y > box.scrollTop + margin &&
      y < box.scrollTop + box.clientHeight - margin;
    if (seen) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({
      left: x - box.clientWidth / 2,
      top: y - box.clientHeight / 2,
      behavior: still ? 'auto' : 'smooth',
    });
    // Positions follow from the layout and the zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, layout, zoom]);

  const onKey = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') setZoom(zoom * 1.15);
    else if (event.key === '-') setZoom(zoom / 1.15);
    else if (event.key === 'f' || event.key === 'F') fit();
    else if (focus && onPick) {
      const line = lines.find((l) => l.id === focus.line);
      if (!line) return;
      const first = layout.trigger.length > 0 ? layout.trigger.length - 1 : 0;
      const last = line.moves.length - 1;
      if (event.key === 'ArrowLeft') onPick({ line: line.id, ply: Math.max(first, focus.ply - 1) });
      else if (event.key === 'ArrowRight') onPick({ line: line.id, ply: Math.min(last, focus.ply + 1) });
      else if (event.key === 'Home') onPick({ line: line.id, ply: first });
      else if (event.key === 'End') onPick({ line: line.id, ply: last });
      else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const at = layout.lanes.findIndex((lane) => lane.line.id === focus.line);
        const step = event.key === 'ArrowUp' ? -1 : 1;
        for (let i = at + step; i >= 0 && i < layout.lanes.length; i += step) {
          const lane = layout.lanes[i]!;
          if (lane.startPly <= focus.ply && focus.ply < lane.line.moves.length) {
            onPick({ line: lane.line.id, ply: focus.ply });
            break;
          }
        }
      } else return;
    } else return;
    event.preventDefault();
  };

  if (loading) {
    return (
      <div className={cn('grid gap-5 rounded-lg border p-4', className)} aria-busy="true" aria-label="Loading the map">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="ml-[30%] h-6 w-[70%]" />
        <Skeleton className="ml-[12%] h-6 w-[55%]" />
      </div>
    );
  }

  const learnerAt = (ply: number) => (ply % 2 === 0) === (side === 'white');
  const owner = new Map(layout.lanes.map((lane) => [lane.line.id, lane]));
  const maxGames = data.games
    ? Math.max(
        1,
        data.games[keyOf(layout.trigger, layout.trigger.length)] ?? 0,
        ...layout.nodes.map((n) => data.games![n.key] ?? 0),
      )
    : 1;
  const strokeFor = (key: string) =>
    on('coverage') && data.games ? 1.5 + 9 * Math.sqrt((data.games[key] ?? 0) / maxGames) : 2;
  const laneStroke = colourOfLane;

  // The learner's answer after an opponent's move, for its outline under Progress.
  const answerState = (node: MapNode): MoveState | undefined => {
    const line = owner.get(node.line)?.line;
    const next = line?.moves[node.ply + 1];
    return next ? data.states?.[`${node.key} ${next.uci}`] : undefined;
  };

  const firstOfLane = new Map<number, string>();
  for (const node of layout.nodes) if (!firstOfLane.has(node.lane)) firstOfLane.set(node.lane, node.key);
  /** A line's name sits just left of its first own move, not over it, so the lanes stay compact. */
  const labelRight = (column: number) => colX(column) - COL / 2 + 2;
  const labelRoom = (lane: number, column: number) =>
    Math.min(240, labelRight(column) - (lane === 0 ? triggerPill + 10 : 4));

  const pill = (node: MapNode) => {
    const learner = learnerAt(node.ply);
    const through = linesThrough.get(node.key) ?? [];
    const dim = (lit && lit.length > 0 && !through.some((id) => lit.includes(id))) || false;
    const state = data.states?.[node.key];
    const shownState = learner ? state : answerState(node);
    const isolated = isolate && on('progress') ? shownState !== isolate : false;
    const style: CSSProperties = {};
    let tone = '';
    const selected = focusKey === node.key;
    const colour = colourOfLane(node.lane);
    if (selected) {
      // The move on the board: solid in its line's colour, with the page's background as its ink.
      style.borderColor = colour;
      style.backgroundColor = colour;
      style.color = 'var(--background)';
      tone = '[&_a]:text-inherit [&_a]:hover:bg-transparent [&_a]:focus-visible:ring-0';
    } else if (on('progress') && learner && state && state !== 'open') {
      tone = PILL_FILL[state];
    } else {
      style.borderColor = colour;
      style.backgroundColor = `color-mix(in oklch, ${colour} 16%, var(--background))`;
    }
    const gaps = on('gaps') ? (data.gaps?.[node.key] ?? []) : [];
    const mistake = on('mistakes') ? data.mistakes?.[node.key] : undefined;
    const puzzles = on('puzzles') ? data.puzzles?.[node.key] : undefined;
    const games = data.games?.[node.key];
    const unanswered = data.gaps?.[node.key] ?? [];
    const mark = on('mistakes') ? data.marks?.[node.key] : undefined;
    // How often the band plays it, on the reply that starts a branch.
    const share = !learner && node.key === firstOfLane.get(node.lane) ? data.shares?.[node.key] : undefined;
    const hint = [
      `${moveNumber(node.ply)}${node.ply % 2 === 0 ? '.' : '...'}${node.move.san}`,
      learner && state ? STATE_NAME[state] : null,
      games !== undefined && data.games ? `${Math.round((games / maxGames) * 100)}% of games here` : null,
      unanswered.length
        ? `not covered: ${unanswered.map((gap) => `${gap.san} ${Math.round(gap.share * 100)}%`).join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join(', ');

    const chip = (
      <span
        className={cn(
          'relative inline-flex h-6 items-center rounded-full border-2 px-0.5 transition-opacity',
          // The move's link covers the whole pill: its mark, its share and its edges click and hover as the move does.
          "[&_a]:static [&_a]:after:absolute [&_a]:after:inset-0 [&_a]:after:rounded-full [&_a]:after:content-['']",
          tone,
          (dim || isolated) && 'opacity-30',
          pulse && shownState === pulse && 'motion-safe:animate-pulse',
        )}
        style={style}
      >
        <MoveChip
          ply={node.ply}
          san={node.move.san}
          epd={node.move.after}
          from={node.move.uci.slice(0, 2)}
          to={node.move.uci.slice(2, 4)}
          mine={learner}
          numbered="never"
          preview={previews}
          orientation={side}
          onHover={onHover ? (hovering) => onHover(hovering ? node : null) : undefined}
          onSelect={onPick ? () => onPick({ line: through[0] ?? node.line, ply: node.ply }) : undefined}
        />
        {mark ? (
          <span
            className={cn('pr-1 text-xs leading-none font-bold', !selected && GRADE_TEXT[MARK_GRADE[mark] ?? 'good'])}
          >
            {mark}
          </span>
        ) : null}
        {share !== undefined ? (
          <span
            className={cn(
              'pr-1 text-[0.6rem] leading-none tabular-nums',
              selected ? 'opacity-70' : 'text-muted-foreground',
            )}
          >
            {Math.round(share * 100)}%
          </span>
        ) : null}
        {mistake ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`${mistake.san ?? 'A common mistake'}, played in ${Math.round(mistake.share * 100)}% of games`}
                onClick={() => onMistake?.(node)}
                className={cn(
                  'absolute -top-2 -right-2 h-4 min-w-4 rounded-full px-0.5 text-[0.6rem] font-bold text-background hover:opacity-80',
                  GRADE_FILL[mistake.grade ?? 'mistake'],
                )}
              >
                {mistake.practised ? (
                  <Check className="size-2.5" strokeWidth={4} aria-hidden />
                ) : mistake.grade === 'blunder' ? (
                  '??'
                ) : (
                  '?'
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {mistake.san ? `${mistake.san} is a ` : 'A '}
              {mistake.grade === 'blunder' ? 'blunder' : 'mistake'}: played in {Math.round(mistake.share * 100)}% of
              games at your level.{' '}
              {mistake.practised ? 'You have practised the punishment.' : 'Practise the punishment.'}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {puzzles ? (
          <span
            className="absolute -bottom-2 -left-2 inline-flex items-center gap-0.5 rounded-full border bg-background px-1 text-[0.6rem] leading-3.5 text-mode-puzzle"
            aria-label={`${puzzles} puzzles from here`}
          >
            <Puzzle className="size-2.5" aria-hidden />
            {puzzles}
          </span>
        ) : null}
      </span>
    );

    return (
      <div
        key={node.key}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 justify-center"
        style={{ left: colX(node.column), top: pillY(node.lane) }}
      >
        {previews ? (
          chip
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{chip}</TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        )}
        {gaps.length > 0 ? (
          <div className="absolute top-full left-1/2 flex items-start">
            {/* A short dashed stub off the move, then the unanswered replies; thicker for more games. */}
            <span
              className="mt-0.5 h-2.5 w-3 rounded-bl-sm border-b border-l border-dashed border-muted-foreground/70"
              style={{ borderWidth: Math.min(3, 1 + gaps[0]!.share * 8) }}
              aria-hidden
            />
            <span className="flex gap-1 pt-1.5">
              {gaps.slice(0, 2).map((gap) => (
                <Button
                  key={gap.san}
                  variant="ghost"
                  size="xs"
                  onClick={() => onGap?.(node, gap)}
                  className="h-3.5 rounded-sm px-0.5 font-mono text-[0.62rem] font-normal whitespace-nowrap text-muted-foreground hover:text-foreground"
                  aria-label={`Not answered: ${gap.san}, in ${Math.round(gap.share * 100)}% of games`}
                >
                  {gap.san} {Math.round(gap.share * 100)}%
                </Button>
              ))}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    // Inline-size containment: the drawing never widens the column it sits in; it scrolls instead.
    <div
      className={cn('@container relative w-full min-w-0 rounded-lg border bg-background', fill && 'h-full', className)}
    >
      <div
        ref={scroller}
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="The map of lines. Arrow keys move along and between lines; plus and minus zoom; F fits."
        className={cn(
          'overflow-auto rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
          fill ? 'h-full' : 'max-h-[32rem]',
        )}
      >
        <div style={{ zoom, width }}>
          {/* Move numbers stay along the top while the drawing scrolls. */}
          <div className="sticky top-0 z-10 bg-background/95" style={{ height: HEADER, width }}>
            {Array.from({ length: layout.columns }, (_, column) => {
              const ply = layout.trigger.length + column - 1;
              return (
                <span
                  key={column}
                  className="absolute top-2 -translate-x-1/2 font-mono text-[0.7rem] text-muted-foreground tabular-nums"
                  style={{ left: colX(column) }}
                >
                  {column === 0 ? 'Start' : `${moveNumber(ply)}${ply % 2 === 0 ? '.' : '...'}`}
                </span>
              );
            })}
          </div>
          <div className="relative" style={{ height, width }}>
            <svg className="pointer-events-none absolute inset-0" width={width} height={height} aria-hidden>
              {layout.lanes.map((lane) => {
                const nodes = layout.nodes.filter((node) => node.lane === lane.lane);
                if (nodes.length === 0) return null;
                const first = nodes[0]!;
                const y = pillY(lane.lane);
                const origin = lane.from ? layout.byKey.get(lane.from) : null;
                const ox = origin ? colX(origin.column) : lane.lane === 0 ? colX(0) : triggerPill;
                const oy = origin ? pillY(origin.lane) : pillY(0);
                const cx = colX(first.column);
                const segments = nodes
                  .slice(1)
                  .map((node, i) => (
                    <line
                      key={node.key}
                      x1={colX(nodes[i]!.column)}
                      x2={colX(node.column)}
                      y1={y}
                      y2={y}
                      stroke={laneStroke(lane.lane)}
                      strokeOpacity={0.85}
                      strokeWidth={strokeFor(node.key)}
                      strokeLinecap="round"
                    />
                  ));
                const midX = ox + (cx - ox) / 2;
                return (
                  <g key={lane.line.id}>
                    <path
                      d={oy === y ? `M${ox},${oy} L${cx},${y}` : `M${ox},${oy} C${midX},${oy} ${midX},${y} ${cx},${y}`}
                      fill="none"
                      stroke={laneStroke(lane.lane)}
                      strokeOpacity={0.85}
                      strokeWidth={strokeFor(first.key)}
                      strokeLinecap="round"
                    />
                    {segments}
                  </g>
                );
              })}
            </svg>

            {layout.trigger.length > 0 ? (
              <div className="absolute -translate-y-1/2" style={{ left: 6, top: pillY(0), width: triggerPill }}>
                <span className="inline-flex h-7 items-center rounded-full border-2 border-border bg-muted px-1.5 text-sm whitespace-nowrap [&>span]:flex-nowrap">
                  <MoveRun
                    moves={layout.trigger.map((move) => ({ san: move.san, uci: move.uci, after: move.after }))}
                    side={side}
                    orientation={side}
                    onSelect={onPick && lines[0] ? (i) => onPick({ line: lines[0]!.id, ply: i }) : undefined}
                  />
                </span>
              </div>
            ) : null}

            {layout.lanes.map((lane) => {
              const nodes = layout.nodes.filter((node) => node.lane === lane.lane);
              const first = nodes[0];
              const last = nodes.at(-1);
              if (!first || !last) return null;
              return (
                <div key={lane.line.id}>
                  {labelRoom(lane.lane, first.column) >= 36 ? (
                    <Button
                      variant="link"
                      size="xs"
                      onClick={() => onPick?.({ line: lane.line.id, ply: first.ply })}
                      // A halo round the letters, not a box: a branch passing behind a name is not cut.
                      className="absolute h-4 -translate-y-1/2 justify-end px-1 text-xs font-medium [text-shadow:0_0_3px_var(--background),0_0_3px_var(--background),0_0_3px_var(--background)]"
                      style={{
                        left: labelRight(first.column) - labelRoom(lane.lane, first.column),
                        width: labelRoom(lane.lane, first.column),
                        top: pillY(lane.lane),
                        color: colourOfLane(lane.lane),
                      }}
                      title={lane.line.name}
                    >
                      <span className="truncate">{lane.line.name}</span>
                    </Button>
                  ) : null}
                  {lane.folded > 0 ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => onUnfold?.(lane.line.id)}
                      className="absolute h-5 -translate-y-1/2 rounded-full px-1.5 text-xs"
                      style={{ left: colLeft(last.column) + COL + 4, top: pillY(lane.lane) }}
                      aria-label={`${lane.folded} more lines folded away; unfold`}
                    >
                      +{lane.folded}
                    </Button>
                  ) : null}
                </div>
              );
            })}

            {layout.nodes.map(pill)}
          </div>
        </div>
      </div>
      <div className="absolute top-0.5 right-1 z-20 flex gap-0.5 rounded-md bg-background/90 p-0.5">
        <Button variant="ghost" size="icon-xs" aria-label="Zoom out" onClick={() => setZoom(zoom / 1.15)}>
          <ZoomOut aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Zoom in" onClick={() => setZoom(zoom * 1.15)}>
          <ZoomIn aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Fit to the box" onClick={fit}>
          <Maximize aria-hidden />
        </Button>
      </div>
    </div>
  );
}
