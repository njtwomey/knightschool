import {
  epdToFen,
  GRADE_INFO,
  parseArrow,
  parseIcon,
  parseRing,
  SQUARE_ICONS,
  type Grade,
  type Marks,
} from '@knightschool/core';
import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { cn } from '@/lib/utils';
import { BOARD_SQUARES, MARK_RGB, SYSTEM_RGB } from './colours';
import { SquareIconGlyph } from './square-icon';

export type SystemArrow = { from: string; to: string; kind: keyof typeof SYSTEM_RGB };
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
  /** Squares lit by something hovered elsewhere (a move chip, a position feature). */
  lit?: string[];
  interactive?: boolean;
  /** The letters and numbers round the edge; off on small boards. */
  notation?: boolean;
  onMove?: (from: string, to: string) => boolean;
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

const GRADE_CLASS: Record<Grade, string> = {
  book: 'bg-verdict-book',
  best: 'bg-verdict-best',
  excellent: 'bg-verdict-excellent',
  good: 'bg-verdict-good',
  inaccuracy: 'bg-verdict-inaccuracy',
  mistake: 'bg-verdict-mistake',
  blunder: 'bg-verdict-blunder',
  miss: 'bg-verdict-miss',
};

function Badge({ badge, orientation }: { badge: BoardBadge; orientation: 'white' | 'black' }) {
  const box = squareBox(badge.square, orientation);
  const tone =
    badge.kind === 'grade'
      ? GRADE_CLASS[badge.grade]
      : badge.kind === 'right'
        ? 'bg-feedback-right'
        : 'bg-feedback-wrong';
  const label = badge.kind === 'grade' ? (GRADE_INFO[badge.grade].symbol ?? GRADE_INFO[badge.grade].name[0]) : null;
  return (
    <div className="pointer-events-none absolute z-10 size-[12.5%]" style={box}>
      <div
        className={cn(
          'absolute -top-[18%] -right-[18%] grid size-[46%] place-items-center rounded-full text-[0.7rem] font-bold text-white shadow-md ring-2 ring-background',
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
  className,
  id = 'board',
}: BoardSurfaceProps) {
  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    for (const square of [lastMove.from, lastMove.to]) squareStyles[square] = { background: 'rgb(255 214 0 / 0.38)' };
  }
  for (const text of marks?.circles ?? []) {
    const ring = parseRing(text);
    if (ring) {
      squareStyles[ring.square] = {
        ...squareStyles[ring.square],
        boxShadow: `inset 0 0 0 4px ${MARK_RGB[ring.colour]}`,
      };
    }
  }
  for (const square of lit) {
    squareStyles[square] = { ...squareStyles[square], boxShadow: 'inset 0 0 0 100vmax rgb(100 116 139 / 0.28)' };
  }
  const drawn = [
    ...(marks?.arrows ?? []).flatMap((text) => {
      const arrow = parseArrow(text);
      return arrow ? [{ startSquare: arrow.from, endSquare: arrow.to, color: MARK_RGB[arrow.colour] }] : [];
    }),
    ...arrows.map((arrow) => ({ startSquare: arrow.from, endSquare: arrow.to, color: SYSTEM_RGB[arrow.kind] })),
  ];
  return (
    <div className={cn('relative aspect-square w-full overflow-hidden shadow-sm', className)}>
      <Chessboard
        options={{
          id,
          position: epdToFen(epd),
          boardOrientation: orientation,
          arrows: drawn,
          squareStyles,
          allowDragging: interactive,
          showNotation: notation,
          boardStyle: { borderRadius: 0 },
          allowDrawingArrows: false,
          lightSquareStyle: { backgroundColor: BOARD_SQUARES.light },
          darkSquareStyle: { backgroundColor: BOARD_SQUARES.dark },
          animationDurationInMs: 180,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare && onMove ? onMove(sourceSquare, targetSquare) : false,
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
            <div className="absolute bottom-[6%] left-[6%] grid size-[44%] place-items-center rounded-full bg-white/90 shadow-sm">
              <SquareIconGlyph icon={mark.icon} className="size-3/4" />
            </div>
          </div>,
        ];
      })}
      {badge ? <Badge badge={badge} orientation={orientation} /> : null}
    </div>
  );
}
