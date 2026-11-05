import {
  epdToFen,
  legalTargets,
  GRADE_INFO,
  parseArrow,
  parseIcon,
  parseRing,
  SQUARE_ICONS,
  type Grade,
  type MarkColour,
  type Marks,
} from '@knightschool/core';
import { Check, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { Chessboard } from 'react-chessboard';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { BOARD_THEMES, useBoardSettings } from './board-settings-menu';
import { GRADE_FILL } from '@/components/chess/grade-style';
import { BOARD_COLOUR, MARK_COLOUR, SYSTEM_COLOUR, tint } from './colours';
import { SquareIconGlyph } from './square-icon';

export type SystemArrow = {
  from: string;
  to: string;
  kind: keyof typeof SYSTEM_COLOUR;
  /** How strongly it is drawn, 0 to 100 (the engine's second and third choices fade). */
  strength?: number;
  /** A word on the square it points to: an engine move's value. */
  label?: string;
};
export type BoardBadge = { square: string } & ({ kind: 'right' | 'wrong' } | { kind: 'grade'; grade: Grade });

export type BoardSurfaceProps = {
  epd: string;
  orientation?: 'white' | 'black';
  /** The last move played, highlighted on its two squares. */
  lastMove?: { from: string; to: string };
  /** The author's arrows and rings, each colour one meaning. */
  marks?: Partial<Marks>;
  /** The move to play, a hint, the engine's move, a wrong move: never in a mark colour. */
  arrows?: SystemArrow[];
  badge?: BoardBadge;
  /** Squares lit by something hovered elsewhere (a move chip, a position feature), grey or in a mark colour. */
  lit?: (string | { square: string; colour: MarkColour })[];
  interactive?: boolean;
  /** The letters and numbers round the edge; off on small boards. */
  notation?: boolean;
  onMove?: (from: string, to: string) => boolean;
  /** Passed through to the board, for drawing with the mouse (the marks editor's right button). */
  onSquareMouseDown?: (square: string, event: MouseEvent) => void;
  onSquareMouseUp?: (square: string, event: MouseEvent) => void;
  onSquareRightClick?: (square: string) => void;
  /** A click or tap on a square (tap-to-draw); works on touch screens too. */
  onSquareClick?: (square: string) => void;
  className?: string;
  id?: string;
};

const FILES = 'abcdefgh';

/** Where a square sits on the drawn board, as percentages from the top left. */
function squareBox(square: string, orientation: 'white' | 'black') {
  const file = FILES.indexOf(square[0]!);
  const rank = Number(square[1]) - 1;
  const column = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return { left: `${column * 12.5}%`, top: `${row * 12.5}%` };
}

function Badge({ badge, orientation }: { badge: BoardBadge; orientation: 'white' | 'black' }) {
  const box = squareBox(badge.square, orientation);
  const tone =
    badge.kind === 'grade'
      ? GRADE_FILL[badge.grade]
      : badge.kind === 'right'
        ? 'bg-feedback-right'
        : 'bg-feedback-wrong';
  const label = badge.kind === 'grade' ? (GRADE_INFO[badge.grade].symbol ?? GRADE_INFO[badge.grade].name[0]) : null;
  return (
    <div className="pointer-events-none absolute z-10 size-[12.5%]" style={box}>
      <div
        className={cn(
          'absolute -top-[18%] -right-[18%] grid size-[46%] place-items-center rounded-full text-[0.7rem] font-bold text-on-fill shadow-md ring-2 ring-background',
          tone,
        )}
      >
        {badge.kind === 'right' ? <Check className="size-3/4" strokeWidth={3} /> : null}
        {badge.kind === 'wrong' ? <X className="size-3/4" strokeWidth={3} /> : null}
        {label}
      </div>
    </div>
  );
}

/** Corner brackets round the selected piece, so it is clear which piece is being moved. */
function Selection({ square, orientation }: { square: string; orientation: 'white' | 'black' }) {
  const corner = 'absolute size-[30%] border-board-selection';
  return (
    <div className="pointer-events-none absolute z-10 size-[12.5%]" style={squareBox(square, orientation)} aria-hidden>
      <div className="absolute inset-[5%]">
        <span className={cn(corner, 'top-0 left-0 border-t-[3px] border-l-[3px]')} />
        <span className={cn(corner, 'top-0 right-0 border-t-[3px] border-r-[3px]')} />
        <span className={cn(corner, 'bottom-0 left-0 border-b-[3px] border-l-[3px]')} />
        <span className={cn(corner, 'right-0 bottom-0 border-r-[3px] border-b-[3px]')} />
      </div>
    </div>
  );
}

/**
 * The squares and pieces, with their layers in a fixed order: the last move, the author's marks, system arrows,
 * feedback, then lit squares (docs/v2/components/board-surface.md).
 */
export function BoardSurface({
  epd,
  orientation = 'white',
  lastMove,
  marks,
  arrows = [],
  badge,
  lit = [],
  interactive = false,
  notation = true,
  onMove,
  onSquareMouseDown,
  onSquareMouseUp,
  onSquareRightClick,
  onSquareClick,
  className,
  id = 'board',
}: BoardSurfaceProps) {
  const settings = useBoardSettings();
  const theme = BOARD_THEMES.find((candidate) => candidate.id === settings.theme) ?? BOARD_THEMES[0];
  // Moving a piece, two ways: click it then a target square, or drag it. The selected piece gets corner brackets and
  // its legal moves small dots (a ring on a capture).
  // The selection belongs to the position it was made in, so a new position clears it without an effect.
  const [selection, setSelection] = useState<{ epd: string; square: string } | null>(null);
  const selected = selection?.epd === epd ? selection.square : null;
  const setSelected = (square: string | null) => setSelection(square ? { epd, square } : null);
  const canMove = interactive && Boolean(onMove);
  const targets = useMemo(() => (canMove && selected ? legalTargets(epd, selected) : []), [canMove, selected, epd]);
  const move = (from: string, to: string) => {
    setSelected(null);
    return onMove ? onMove(from, to) : false;
  };
  const clickSquare = (square: string) => {
    if (onSquareClick) return onSquareClick(square);
    if (!canMove) return;
    if (selected && targets.some((target) => target.to === square)) {
      move(selected, square);
      return;
    }
    setSelected(selected !== square && legalTargets(epd, square).length ? square : null);
  };
  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove && settings.lastMove) {
    for (const square of [lastMove.from, lastMove.to])
      squareStyles[square] = { backgroundColor: BOARD_COLOUR.lastMove };
  }
  for (const text of marks?.circles ?? []) {
    const ring = parseRing(text);
    if (ring) {
      squareStyles[ring.square] = {
        ...squareStyles[ring.square],
        boxShadow: `inset 0 0 0 4px ${MARK_COLOUR[ring.colour]}`,
      };
    }
  }
  for (const item of lit) {
    const square = typeof item === 'string' ? item : item.square;
    const colour = typeof item === 'string' ? BOARD_COLOUR.lit : tint(MARK_COLOUR[item.colour], 40);
    squareStyles[square] = { ...squareStyles[square], boxShadow: `inset 0 0 0 100vmax ${colour}` };
  }
  if (settings.legalMoves) {
    for (const target of targets) {
      squareStyles[target.to] = {
        ...squareStyles[target.to],
        backgroundImage: target.capture
          ? `radial-gradient(circle, transparent 56%, ${BOARD_COLOUR.dot} 58%, ${BOARD_COLOUR.dot} 70%, transparent 72%)`
          : `radial-gradient(circle, ${BOARD_COLOUR.dot} 16%, transparent 18%)`,
      };
    }
  }
  const drawn = [
    ...(marks?.arrows ?? []).flatMap((text) => {
      const arrow = parseArrow(text);
      return arrow ? [{ startSquare: arrow.from, endSquare: arrow.to, color: MARK_COLOUR[arrow.colour] }] : [];
    }),
    ...arrows.map((arrow) => ({
      startSquare: arrow.from,
      endSquare: arrow.to,
      color: arrow.strength ? tint(SYSTEM_COLOUR[arrow.kind], arrow.strength) : SYSTEM_COLOUR[arrow.kind],
    })),
  ];
  return (
    <div className={cn('relative aspect-square h-auto w-full min-w-0 shrink overflow-hidden shadow-sm', className)}>
      <Chessboard
        options={{
          id,
          position: epdToFen(epd),
          boardOrientation: orientation,
          arrows: drawn,
          squareStyles,
          allowDragging: interactive,
          showNotation: notation && settings.coordinates,
          boardStyle: { borderRadius: 0 },
          allowDrawingArrows: false,
          lightSquareStyle: { backgroundColor: theme.light },
          darkSquareStyle: { backgroundColor: theme.dark },
          animationDurationInMs: settings.animation ? siteConfig.timing.pieceMove : 0,
          showAnimations: settings.animation,
          onPieceDrag: ({ square }) => {
            if (canMove && square) setSelected(square);
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? move(sourceSquare, targetSquare) : false),
          onSquareMouseDown: onSquareMouseDown ? ({ square }, event) => onSquareMouseDown(square, event) : undefined,
          onSquareMouseUp: onSquareMouseUp ? ({ square }, event) => onSquareMouseUp(square, event) : undefined,
          onSquareRightClick: onSquareRightClick ? ({ square }) => onSquareRightClick(square) : undefined,
          onSquareClick: ({ square }) => clickSquare(square),
        }}
      />
      {(marks?.icons ?? []).flatMap((text) => {
        const mark = parseIcon(text);
        if (!mark) return [];
        return [
          <div
            key={text}
            className="pointer-events-none absolute z-10 size-[12.5%]"
            style={squareBox(mark.square, orientation)}
            title={SQUARE_ICONS[mark.icon].name}
          >
            <div className="absolute bottom-[6%] left-[6%] grid size-[44%] place-items-center rounded-full bg-board-icon shadow-sm">
              <SquareIconGlyph icon={mark.icon} className="size-3/4" />
            </div>
          </div>,
        ];
      })}
      {selected && canMove ? <Selection square={selected} orientation={orientation} /> : null}
      {badge ? <Badge badge={badge} orientation={orientation} /> : null}
      {arrows
        .filter((arrow, i) => arrow.label && arrows.findIndex((other) => other.to === arrow.to) === i)
        .map((arrow) => (
          <span
            key={`${arrow.to}-${arrow.label}`}
            className="pointer-events-none absolute z-10 flex size-[12.5%] items-end justify-center pb-[0.5%]"
            style={squareBox(arrow.to, orientation)}
          >
            <span className="rounded-sm bg-background/85 px-1 font-mono text-[0.65rem] leading-tight font-semibold text-foreground tabular-nums">
              {arrow.label}
            </span>
          </span>
        ))}
    </div>
  );
}
