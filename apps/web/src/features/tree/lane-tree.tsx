import { numberedLine, type LaneLayout, type MoveTree } from '@knightschool/core';
import { Maximize, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

const COL = 60; // one column per move
const LANE = 32; // one lane per line
const HEAD = 26; // move numbers along the top
const PAD = 12;
const PILL_W = COL - 8;
const PILL_H = 22;

/** "5." for a White move at that ply, "5..." for Black's. */
const moveNumber = (ply: number) => `${Math.floor((ply - 1) / 2) + 1}${(ply - 1) % 2 ? '...' : '.'}`;

/** The moves from the start to a node, as SAN. */
function trunkSans(tree: MoveTree, id: string): string[] {
  const sans: string[] = [];
  let node = tree.nodes.get(id);
  while (node && node.san) {
    sans.unshift(node.san);
    node = node.parent ? tree.nodes.get(node.parent) : undefined;
  }
  return sans;
}

/**
 * A course's lines drawn like a git history turned on its side: one column per move, so a move number lines up down
 * every line, and one lane per line, the main line straight across the top in the text colour. Branches curve down out
 * of the move they follow. Every move is a pill with its move; the first pill stands for the moves every line shares.
 * Wide courses scroll sideways inside their box; the move numbers stay along the top. It zooms (the buttons in its
 * corner, or a pinch, or Ctrl or Cmd with the wheel) around the point under the pointer; `zoom` is where it starts.
 *
 * `lit` is the set of lines picked out (the others dim); `focus` is the move shown on the board; `scrollTo` is a move
 * to bring into view when it changes.
 */
export function LaneTree({
  tree,
  layout,
  colourOf,
  lit,
  focus,
  folded,
  scrollTo,
  onFocus,
  onPick,
  className,
  zoom: initialZoom = 1,
}: {
  tree: MoveTree;
  layout: LaneLayout;
  colourOf: (line: string) => string;
  lit: ReadonlySet<string>;
  focus: string | null;
  /** Lines whose branches are folded away, with how many: a "+N" after the line's last move. */
  folded?: ReadonlyMap<string, number>;
  scrollTo?: string | null;
  onFocus: (id: string) => void;
  onPick: (id: string) => void;
  className?: string;
  zoom?: number;
}) {
  const top = tree.nodes.get(layout.top)!;
  const trunk = top.ply === 0 ? 'Start' : numberedLine(trunkSans(tree, layout.top));
  const trunkWidth = Math.max(PILL_W, trunk.length * 6.6 + 16);
  const firstCol = PAD + trunkWidth + 16; // where column 1 starts
  const cx = (row: number) => (row === 0 ? PAD + trunkWidth / 2 : firstCol + (row - 1) * COL + COL / 2);
  const cy = (lane: number) => HEAD + PAD + lane * LANE + LANE / 2;
  const width = firstCol + (layout.rows - 1) * COL + PAD + 36;
  const height = HEAD + PAD * 2 + layout.lanes * LANE;

  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  // The zoom for event handlers outside React (the wheel listener); it changes only through zoomTo.
  const zoomRef = useRef(initialZoom);
  /** Zooms to `next`, keeping the point at (x, y) in the box (the middle by default) where it is. */
  const zoomTo = (next: number, x?: number, y?: number) => {
    const element = box.current;
    const to = clampZoom(next);
    if (!element) {
      zoomRef.current = to;
      return setZoom(to);
    }
    const px = x ?? element.clientWidth / 2;
    const py = y ?? element.clientHeight / 2;
    const ratio = to / zoomRef.current;
    const left = (element.scrollLeft + px) * ratio - px;
    const top = (element.scrollTop + py) * ratio - py;
    zoomRef.current = to;
    setZoom(to);
    requestAnimationFrame(() => element.scrollTo({ left, top }));
  };
  const fit = () => {
    const element = box.current;
    if (element) zoomTo(Math.min(element.clientWidth / width, element.clientHeight / height), 0, 0);
  };
  // A pinch, or Ctrl or Cmd with the wheel, zooms around the pointer; a plain wheel still scrolls.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomTo(zoomRef.current * Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []); // zoomTo reads the box and the current zoom through refs
  useEffect(() => {
    const place = scrollTo ? layout.places.get(scrollTo) : undefined;
    const element = box.current;
    if (!place || !element) return;
    const scale = zoomRef.current;
    element.scrollTo({
      left: Math.max(0, cx(place.row) * scale - element.clientWidth / 3),
      top: Math.max(0, cy(place.lane) * scale - element.clientHeight / 2),
      behavior: 'smooth',
    });
    // cx and cy depend only on the layout, which is in the dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTo, layout]);

  const litNodes = new Set([...lit].flatMap((line) => layout.pathOf.get(line) ?? []));
  const dimming = lit.size > 0;
  const placeOf = (id: string) => layout.places.get(id)!;

  return (
    <div className="relative min-w-0">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md border bg-background/90 p-0.5 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Zoom out"
          onClick={() => zoomTo(zoom / 1.25)}
        >
          <Minus aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 min-w-12 px-1.5 font-mono text-xs"
          aria-label="Actual size"
          title="Actual size"
          onClick={() => zoomTo(1)}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label="Zoom in" onClick={() => zoomTo(zoom * 1.25)}>
          <Plus aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Fit the whole tree"
          title="Fit"
          onClick={fit}
        >
          <Maximize aria-hidden />
        </Button>
      </div>
      <div ref={box} className={`min-w-0 overflow-auto rounded-xl border bg-card ${className ?? ''}`}>
        <svg
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label="The course's lines as a tree, one column per move"
          className="select-none"
        >
          {Array.from({ length: layout.rows - 1 }, (_, i) => i + 1).map((row) => (
            <text
              key={row}
              x={cx(row)}
              y={HEAD - 6}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {moveNumber(layout.firstPly + row)}
            </text>
          ))}

          {layout.edges.map(({ from, to }) => {
            const a = placeOf(from);
            const b = placeOf(to);
            const on = !dimming || (litNodes.has(from) && litNodes.has(to));
            const x1 = cx(a.row) + (a.row === 0 ? trunkWidth / 2 : PILL_W / 2);
            const x2 = cx(b.row) - PILL_W / 2;
            const d =
              a.lane === b.lane
                ? `M ${x1} ${cy(a.lane)} L ${x2} ${cy(b.lane)}`
                : `M ${x1} ${cy(a.lane)} C ${x2 - 6} ${cy(a.lane)}, ${x1 + 6} ${cy(b.lane)}, ${x2} ${cy(b.lane)}`;
            return (
              <path
                key={to}
                d={d}
                fill="none"
                stroke={colourOf(b.line)}
                strokeWidth={b.lane === 0 ? 3 : 2}
                opacity={on ? 1 : 0.15}
              />
            );
          })}

          {[...layout.places.values()].map((place) => {
            const node = tree.nodes.get(place.id)!;
            const isTop = place.id === layout.top;
            const on = !dimming || litNodes.has(place.id);
            const focused = place.id === focus;
            const colour = colourOf(place.line);
            const filled = dimming && litNodes.has(place.id);
            const w = isTop ? trunkWidth : PILL_W;
            const left = cx(place.row) - w / 2;
            return (
              <g
                key={place.id}
                role="button"
                tabIndex={0}
                aria-label={isTop ? trunk : `${moveNumber(node.ply)}${node.san}`}
                aria-pressed={focused}
                opacity={on ? 1 : 0.3}
                className="cursor-pointer outline-none"
                onMouseEnter={() => onFocus(place.id)}
                onFocus={() => onFocus(place.id)}
                onClick={() => onPick(place.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPick(place.id);
                  }
                }}
              >
                <rect
                  x={left}
                  y={cy(place.lane) - PILL_H / 2}
                  width={w}
                  height={PILL_H}
                  rx={PILL_H / 2}
                  fill={filled ? colour : 'var(--background)'}
                  stroke={focused ? 'var(--ring)' : colour}
                  strokeWidth={focused ? 3 : place.lane === 0 ? 2 : 1.5}
                />
                <text
                  x={cx(place.row)}
                  y={cy(place.lane) + 4}
                  textAnchor="middle"
                  className={`font-mono text-[11px] ${filled ? 'fill-background font-semibold' : 'fill-foreground'}`}
                >
                  {isTop ? trunk : node.san}
                </text>
              </g>
            );
          })}
          {[...(folded ?? [])].map(([line, count]) => {
            const end = layout.pathOf.get(line)?.at(-1);
            const place = end ? layout.places.get(end) : undefined;
            if (!place) return null;
            const left = cx(place.row) + PILL_W / 2 + 4;
            return (
              <g key={`fold-${line}`} aria-hidden>
                <rect
                  x={left}
                  y={cy(place.lane) - 9}
                  width={30}
                  height={18}
                  rx={9}
                  fill="var(--muted)"
                  stroke={colourOf(line)}
                  strokeDasharray="3 2"
                />
                <text
                  x={left + 15}
                  y={cy(place.lane) + 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  +{count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
