import {
  numberedMove,
  runText,
  tidyLayout,
  type CompressedTree,
  type MoveRun,
  type PlacedNode,
} from '@knightschool/core';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { cn } from 'cn';
import { StaticBoard } from '@/components/board/static-board';
import { Button } from '@/components/ui/button';

/**
 * Two ways to draw: `moves`, every move a pill on a row of its own (a course's tree), and `branches`, only branch points
 * and ends as dots with the moves between written down the edge, one row per ply (the whole curriculum). Pixels per
 * slot across and per row down, the margin, and the room left below the deepest node for names.
 */
export type DiagramMode = 'moves' | 'branches';
const GEOMETRY = {
  moves: { slot: 74, row: 38, nameRoom: 230 },
  branches: { slot: 78, row: 22, nameRoom: 250 },
} as const;
const PAD = 28;
const NAME_CHARS = 38;
const PILL_HEIGHT = 20;
/** About the width of an 11px character, to size a pill around its text. */
const CHAR = 6.6;

export type DiagramProps = {
  mode: DiagramMode;
  tree: CompressedTree;
  /** The colour of a node (a CSS colour), or null for the neutral one; moves mode only. */
  colorOf?: (run: MoveRun) => string | null;
  /** Nodes drawn faintly, when one line is being looked at. */
  dimmed?: (run: MoveRun) => boolean;
  /** What to show while a node is hovered (moves mode); the corner board otherwise. */
  hoverCard?: (run: MoveRun) => ReactNode;
  open: ReadonlySet<string>;
  onToggle: (id: string) => void;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Runs on the line being looked at, drawn in the primary colour. */
  highlight?: ReadonlySet<string>;
  /** Runs where a searched-for line ends, ringed. */
  marked?: ReadonlySet<string>;
  /** Scrolled into view when it changes. */
  focus?: string | null;
  /** A line's name and side, for the marks at line ends. */
  lineName: (line: string) => string;
  lineSide: (line: string) => 'white' | 'black' | undefined;
  /** A name for a folded branch. */
  branchName: (run: MoveRun) => string;
  /** More buttons for the toolbar. */
  tools?: ReactNode;
};

const clip = (text: string) => (text.length > NAME_CHARS ? `${text.slice(0, NAME_CHARS - 1)}…` : text);

/**
 * The tree drawn top-down: the start at the top, one row per ply going down, so every position at the same depth sits
 * on the same row. Only branch points and line ends are nodes; the moves between them are written down the edge, one
 * per row. Closed branches show how many lines they hold. It scrolls (or drags) in its box and zooms with the buttons;
 * hovering a node shows its position in the corner.
 */
export function TreeDiagram(props: DiagramProps) {
  const { mode, tree, open, selected, highlight, marked, focus, tools } = props;
  const { slot: SLOT, row: ROW, nameRoom: NAME_ROOM } = GEOMETRY[mode];
  const [scale, setScale] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const layout = useMemo(
    () =>
      tidyLayout(
        tree.root,
        (id) => tree.runs.get(id)?.children ?? [],
        (id) => open.has(id),
      ),
    [tree, open],
  );
  const placed = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  // Moves mode puts each node on the row of its depth (the shared trunk is one node); branches mode on its ply.
  const level = (node: PlacedNode) => (mode === 'moves' ? node.depth : tree.runs.get(node.id)!.ply);
  const deepest = Math.max(...layout.nodes.map(level));
  const widest = mode === 'moves' ? Math.max(...layout.nodes.map((node) => pillWidth(tree.runs.get(node.id)!))) : 0;
  const left = mode === 'moves' ? SLOT / 2 : 0; // room for the first column's pills
  const width = Math.max(PAD * 2 + left + (layout.slots - 1) * SLOT + 64, widest + PAD * 2);
  const height = PAD + deepest * ROW + NAME_ROOM;
  const x = (node: PlacedNode) => {
    const at = PAD + left + node.slot * SLOT;
    if (mode === 'branches') return at;
    const half = pillWidth(tree.runs.get(node.id)!) / 2;
    return Math.min(Math.max(at, PAD / 2 + half), width - PAD / 2 - half); // a wide pill stays inside
  };
  const yOf = (node: PlacedNode) => PAD + level(node) * ROW;
  const y = (ply: number) => PAD + ply * ROW;

  const focusShown = focus ? placed.has(focus) : false;
  useEffect(() => {
    const node = focus ? placed.get(focus) : undefined;
    const element = box.current;
    if (!node || !element) return;
    element.scrollTo({
      left: x(node) * scale - element.clientWidth / 2,
      top: yOf(node) * scale - element.clientHeight / 3,
      behavior: 'smooth',
    });
    // Only when the focus moves (or first shows), not on every zoom or toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusShown]);

  const drag = useDragToScroll();
  const hoveredRun = hovered ? tree.runs.get(hovered) : undefined;

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => setScale((s) => Math.max(0.4, s - 0.2))}
        >
          <Minus aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          onClick={() => setScale((s) => Math.min(1.6, s + 0.2))}
        >
          <Plus aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Actual size"
          onClick={() => setScale(1)}
          disabled={scale === 1}
        >
          <RotateCcw aria-hidden />
        </Button>
        <span className="mr-2 text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
        {tools}
      </div>
      <div className="relative">
        <div
          ref={box}
          className="max-h-[70dvh] min-h-64 cursor-grab touch-pan-x touch-pan-y overflow-auto rounded-xl border bg-card active:cursor-grabbing"
          {...drag}
        >
          <svg
            width={width * scale}
            height={height * scale}
            viewBox={`0 0 ${width} ${height}`}
            role="tree"
            aria-label="The lines as a tree, the start at the top"
            className="select-none"
          >
            {mode === 'moves' &&
              layout.nodes.map((node) => {
                const run = tree.runs.get(node.id)!;
                const parent = node.parent ? placed.get(node.parent) : undefined;
                if (!parent) return null;
                const color = props.colorOf?.(run) ?? null;
                const mid = yOf(parent) + ROW / 2;
                return (
                  <path
                    key={`edge-${run.id}`}
                    d={`M${x(parent)},${yOf(parent) + PILL_HEIGHT / 2} V${mid} H${x(node)} V${yOf(node) - PILL_HEIGHT / 2}`}
                    fill="none"
                    className={cn(!color && 'stroke-muted-foreground/50')}
                    style={color ? { stroke: color } : undefined}
                    strokeWidth={highlight?.has(run.id) ? 3 : 1.5}
                    opacity={props.dimmed?.(run) ? 0.2 : 1}
                  />
                );
              })}
            {mode === 'moves' &&
              layout.nodes.map((node) => (
                <MovePill
                  key={node.id}
                  {...props}
                  node={node}
                  run={tree.runs.get(node.id)!}
                  cx={x(node)}
                  cy={yOf(node)}
                  isSelected={selected === node.id}
                  isHighlighted={highlight?.has(node.id) ?? false}
                  onHover={setHovered}
                />
              ))}
            {mode === 'branches' &&
              layout.nodes.map((node) => {
                const run = tree.runs.get(node.id)!;
                const parent = node.parent ? placed.get(node.parent) : undefined;
                if (!parent) return null;
                const parentRun = tree.runs.get(parent.id)!;
                const on = highlight?.has(run.id);
                return (
                  <g key={`edge-${run.id}`}>
                    <path
                      d={`M${x(parent)},${y(parentRun.ply)} V${y(parentRun.ply) + ROW / 2} H${x(node)} V${y(run.ply)}`}
                      fill="none"
                      className={on ? 'stroke-primary' : 'stroke-muted-foreground/50'}
                      strokeWidth={on ? 3 : 1.25}
                    />
                    {run.moves.map((move, index) => (
                      <text
                        key={move.id}
                        x={x(node) + 6}
                        y={y(move.ply) + 4}
                        className={cn('text-[11px]', on ? 'fill-primary font-semibold' : 'fill-muted-foreground')}
                      >
                        {index === 0 || move.ply % 2 === 1 ? numberedMove(move.ply - 1, move.san!) : move.san}
                      </text>
                    ))}
                  </g>
                );
              })}
            {mode === 'branches' &&
              layout.nodes.map((node) => (
                <Node
                  key={node.id}
                  {...props}
                  node={node}
                  run={tree.runs.get(node.id)!}
                  cx={x(node)}
                  cy={y(tree.runs.get(node.id)!.ply)}
                  isSelected={selected === node.id}
                  isMarked={marked?.has(node.id) ?? false}
                  isHighlighted={highlight?.has(node.id) ?? false}
                  onHover={setHovered}
                />
              ))}
          </svg>
        </div>
        {hoveredRun &&
          (props.hoverCard ? (
            <div className="pointer-events-none absolute top-2 right-2 hidden w-64 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md md:block">
              {props.hoverCard(hoveredRun)}
            </div>
          ) : (
            <div className="pointer-events-none absolute top-2 right-2 hidden w-36 rounded-lg border bg-popover p-1 shadow-md md:block">
              <StaticBoard id="tree-hover" source={{ epd: hoveredRun.epd }} coordinates={false} />
            </div>
          ))}
      </div>
    </div>
  );
}

/** A pill's text: the start, or the run's moves ("4.b4", or the shared trunk "1.e4 e5 2.Nf3"). */
const pillText = (run: MoveRun) => (run.moves.length ? runText(run) : 'Start');
const pillWidth = (run: MoveRun) => Math.max(36, pillText(run).length * CHAR + 14);

type PillProps = DiagramProps & {
  node: PlacedNode;
  run: MoveRun;
  cx: number;
  cy: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
};

/**
 * One move as a pill, tinted with the colour of the line it belongs to (neutral while several lines share it). A line's
 * last move has the line's name below it; a dot on the right marks a line that ends where others carry on.
 */
function MovePill({ node, run, cx, cy, isSelected, isHighlighted, onSelect, onToggle, onHover, ...rest }: PillProps) {
  const color = rest.colorOf?.(run) ?? null;
  const w = pillWidth(run);
  const closed = run.children.length > 0 && !node.open;
  const name =
    run.children.length === 0 && run.ends.length
      ? run.ends.map(rest.lineName).join(' / ')
      : closed
        ? rest.branchName(run)
        : '';
  const label = `${pillText(run)}${run.ends.length ? `, the end of ${run.ends.map(rest.lineName).join(', ')}` : ''}`;
  return (
    <g opacity={rest.dimmed?.(run) ? 0.25 : 1}>
      <g
        role="treeitem"
        aria-label={label}
        aria-selected={isSelected}
        tabIndex={0}
        className="cursor-pointer outline-none"
        onClick={() => onSelect(run.id)}
        onDoubleClick={() => run.children.length && onToggle(run.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(run.id);
          }
        }}
        onPointerEnter={() => onHover(run.id)}
        onPointerLeave={() => onHover(null)}
      >
        {isSelected && (
          <rect
            x={cx - w / 2 - 4}
            y={cy - PILL_HEIGHT / 2 - 4}
            width={w + 8}
            height={PILL_HEIGHT + 8}
            rx={(PILL_HEIGHT + 8) / 2}
            className="fill-none stroke-foreground"
            strokeDasharray="3 2"
          />
        )}
        <rect
          x={cx - w / 2}
          y={cy - PILL_HEIGHT / 2}
          width={w}
          height={PILL_HEIGHT}
          rx={PILL_HEIGHT / 2}
          className={cn(!color && 'fill-muted', !color && (isHighlighted ? 'stroke-foreground' : 'stroke-border'))}
          style={color ? { fill: `color-mix(in oklch, ${color} 22%, var(--card))`, stroke: color } : undefined}
          strokeWidth={isHighlighted ? 2.5 : 1.25}
        />
        <text x={cx} y={cy + 4} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
          {pillText(run)}
        </text>
        {run.ends.length > 0 && run.children.length > 0 && (
          <circle
            cx={cx + w / 2 + 6}
            cy={cy}
            r={3.5}
            className={cn(!color && 'fill-foreground')}
            style={color ? { fill: color } : undefined}
          />
        )}
      </g>
      {closed && (
        <g
          role="button"
          aria-label={`Open ${run.lines.length} lines`}
          tabIndex={0}
          className="cursor-pointer"
          onClick={() => onToggle(run.id)}
        >
          <rect x={cx - 20} y={cy + 14} width={40} height={18} rx={9} className="fill-secondary stroke-border" />
          <text x={cx} y={cy + 27} textAnchor="middle" className="fill-secondary-foreground text-[11px] font-medium">
            +{run.lines.length}
          </text>
        </g>
      )}
      {name && (
        <text
          transform={`translate(${cx + 4}, ${cy + (closed ? 38 : PILL_HEIGHT / 2 + 6)}) rotate(90)`}
          className={cn('text-[12px]', isHighlighted ? 'font-semibold' : '', !color && 'fill-foreground')}
          style={color ? { fill: color } : undefined}
        >
          <title>{name}</title>
          {clip(name)}
        </text>
      )}
    </g>
  );
}

type NodeProps = DiagramProps & {
  node: PlacedNode;
  run: MoveRun;
  cx: number;
  cy: number;
  isSelected: boolean;
  isMarked: boolean;
  isHighlighted: boolean;
  onHover: (id: string | null) => void;
};

/** One branch point or line end: its mark, a fold badge when closed, and the names of the lines ending there. */
function Node({
  node,
  run,
  cx,
  cy,
  isSelected,
  isMarked,
  isHighlighted,
  onSelect,
  onToggle,
  onHover,
  ...rest
}: NodeProps) {
  const closed = run.children.length > 0 && !node.open;
  const side = run.ends.length ? rest.lineSide(run.ends[0]!) : undefined;
  const name = closed
    ? rest.branchName(run)
    : run.children.length === 0 && run.ends.length
      ? run.ends.map(rest.lineName).join(' / ')
      : '';
  const where = run.moves.length ? numberedMove(run.ply - 1, run.moves.at(-1)!.san!) : 'the start';
  const label = run.ends.length
    ? `${run.ends.map(rest.lineName).join(', ')}, ending ${where}`
    : `Branch after ${where}`;
  return (
    <g>
      <g
        role="treeitem"
        aria-label={label}
        aria-selected={isSelected}
        aria-expanded={run.children.length ? node.open : undefined}
        tabIndex={0}
        className="cursor-pointer outline-none focus-visible:[&>circle:first-child]:stroke-ring"
        onClick={() => onSelect(run.id)}
        onDoubleClick={() => run.children.length && onToggle(run.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(run.id);
          }
        }}
        onPointerEnter={() => onHover(run.id)}
        onPointerLeave={() => onHover(null)}
      >
        {/* A larger invisible target, so a node is easy to hit with a finger. */}
        <circle cx={cx} cy={cy} r={12} className="fill-transparent" strokeWidth={2} />
        {(isSelected || isMarked) && (
          <circle
            cx={cx}
            cy={cy}
            r={10}
            className={isMarked ? 'fill-primary/20 stroke-primary' : 'fill-none stroke-foreground'}
            strokeWidth={1.5}
            strokeDasharray={isSelected && !isMarked ? '3 2' : undefined}
          />
        )}
        {run.parent === null ? (
          <circle cx={cx} cy={cy} r={6} className="fill-primary" />
        ) : side ? (
          <circle
            cx={cx}
            cy={cy}
            r={5.5}
            className={cn(
              side === 'white' ? 'fill-background' : 'fill-foreground',
              isHighlighted ? 'stroke-primary' : 'stroke-foreground',
            )}
            strokeWidth={2}
          />
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r={closed ? 5.5 : 3.5}
            className={isHighlighted ? 'fill-primary' : 'fill-muted-foreground'}
          />
        )}
      </g>
      {closed && (
        <g
          role="button"
          aria-label={`Open ${run.lines.length} lines`}
          tabIndex={0}
          className="cursor-pointer"
          onClick={() => onToggle(run.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggle(run.id);
            }
          }}
        >
          <rect x={cx - 22} y={cy + 10} width={44} height={18} rx={9} className="fill-secondary stroke-border" />
          <text x={cx} y={cy + 23} textAnchor="middle" className="fill-secondary-foreground text-[11px] font-medium">
            +{run.lines.length}
          </text>
        </g>
      )}
      {name && (
        <text
          transform={`translate(${cx + 4}, ${cy + (closed ? 34 : 12)}) rotate(90)`}
          className={cn('text-[12px]', isHighlighted || isMarked ? 'fill-primary font-semibold' : 'fill-foreground')}
        >
          <title>{name}</title>
          {clip(name)}
        </text>
      )}
    </g>
  );
}

/** Lets a mouse drag the box around like a map. Touch already scrolls, and a click that does not move still clicks. */
function useDragToScroll() {
  const start = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragged = useRef(false);
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      dragged.current = false;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      const box = event.currentTarget;
      start.current = { x: event.clientX, y: event.clientY, left: box.scrollLeft, top: box.scrollTop, moved: false };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const from = start.current;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (!from.moved && Math.hypot(dx, dy) < 5) return;
      from.moved = true;
      event.currentTarget.scrollTo(from.left - dx, from.top - dy);
    },
    onPointerUp() {
      dragged.current = start.current?.moved ?? false;
      start.current = null;
    },
    onPointerLeave() {
      start.current = null;
    },
    onClickCapture(event: MouseEvent) {
      // A drag ends with a click on whatever is under the pointer; it should not select it.
      if (dragged.current) event.stopPropagation();
      dragged.current = false;
    },
  };
}
