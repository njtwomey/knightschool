import { epdToFen, legalMovesFrom, sideToMove, type Square } from '@knightschool/core';
import { Check, X } from 'lucide-react';
import { useMemo, useState, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { useBoardPrefs } from './prefs';
import { piecesFor } from './pieces';
import { themeById } from './themes';

export type BoardArrow = { startSquare: string; endSquare: string; color: string };

export type AppBoardProps = {
  id: string;
  epd: string;
  orientation: 'white' | 'black';
  /** When false the pieces cannot be moved (thumbnails, replays). */
  interactive?: boolean;
  /** Called with a UCI move. Return true when the move was accepted and the position will change. */
  onMove?: (uci: string) => boolean;
  /** UCI of the last move, highlighted. */
  lastMove?: string;
  arrows?: BoardArrow[];
  /** A tick or cross on a square, for right and wrong answers. */
  badge?: { square: string; kind: 'correct' | 'wrong' } | null;
  /** A square to point at (a hint): it pulses. */
  hintSquare?: string | null;
  /** Extra square styles, such as rings from an annotation. */
  squareStyles?: Record<string, CSSProperties>;
  /** Overrides the coordinates preference, for thumbnails. */
  coordinates?: boolean;
  /** Called for any click on a square, even when the board is not interactive: for editing a position. */
  onSquareSelect?: (square: string) => void;
  className?: string;
};

const YELLOW = 'rgb(245 230 60 / 0.5)';
const DOT = 'rgb(0 0 0 / 0.2)';

/** Four corner brackets around a square, drawn in SVG so they scale with the board. */
function Brackets() {
  return (
    <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <path
        d="M6 28V6h22M72 6h22v22M94 72v22H72M28 94H6V72"
        fill="none"
        stroke="rgb(70 50 30 / 0.7)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The one board used everywhere. Colours, pieces and aids come from the learner's preferences; it shows where the
 * selected piece can go, marks the square under the pointer with corner brackets, and can put a tick or cross on a square.
 */
export function AppBoard({
  id,
  epd,
  orientation,
  interactive = true,
  onMove,
  lastMove,
  arrows = [],
  badge = null,
  hintSquare = null,
  squareStyles = {},
  coordinates,
  onSquareSelect,
  className,
}: AppBoardProps) {
  const prefs = useBoardPrefs();
  const theme = themeById(prefs.theme);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const turn = sideToMove(epd);

  const targets = useMemo(() => {
    if (!interactive || !selected) return new Map<string, boolean>();
    return new Map(
      legalMovesFrom(epd, selected as Square).map((move) => [move.to as string, move.captured !== undefined]),
    );
  }, [epd, interactive, selected]);

  const canPlay = (piece: string | undefined) =>
    interactive && piece !== undefined && piece.startsWith(turn === 'white' ? 'w' : 'b');

  function attempt(from: string, to: string): boolean {
    setSelected(null);
    if (!onMove) return false;
    return onMove(`${from}${to}`);
  }

  const styles: Record<string, CSSProperties> = { ...squareStyles };
  const mark = (square: string, background: string) => {
    styles[square] = { ...styles[square], backgroundColor: background };
  };
  if (lastMove) {
    mark(lastMove.slice(0, 2), YELLOW);
    mark(lastMove.slice(2, 4), YELLOW);
  }
  if (selected) mark(selected, YELLOW);

  return (
    <div
      className={className}
      style={{ ['--board-light' as string]: theme.light, ['--board-dark' as string]: theme.dark }}
    >
      <Chessboard
        options={{
          id,
          position: epdToFen(epd),
          boardOrientation: orientation,
          squareStyles: styles,
          arrows,
          lightSquareStyle: { backgroundColor: 'var(--board-light)' },
          darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
          pieces: piecesFor(prefs.pieces),
          showNotation: coordinates ?? prefs.coordinates,
          allowDrawingArrows: false,
          allowDragging: interactive,
          animationDurationInMs: 160,
          canDragPiece: ({ piece }) => canPlay(piece.pieceType),
          onPieceDrag: ({ square }) => {
            if (square) setSelected(square);
          },
          onPieceDragCancel: () => setSelected(null),
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            targetSquare ? attempt(sourceSquare, targetSquare) : (setSelected(null), false),
          onMouseOverSquare: ({ square }) => setHovered(square),
          onMouseOutSquare: () => setHovered(null),
          // Tap a piece, then tap where it goes: drag and drop is awkward on a phone.
          onSquareClick: ({ piece, square }) => {
            onSquareSelect?.(square);
            if (!interactive) return;
            if (selected && selected !== square && targets.has(square)) {
              attempt(selected, square);
              return;
            }
            setSelected(canPlay(piece?.pieceType) && selected !== square ? square : null);
          },
          squareRenderer: ({ square, children }) => {
            const target = targets.get(square);
            const isHover = prefs.hover && interactive && hovered === square;
            return (
              <div className="relative size-full">
                {children}
                {prefs.legalMoves && target === false && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="size-[28%] rounded-full" style={{ backgroundColor: DOT }} />
                  </div>
                )}
                {prefs.legalMoves && target === true && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full"
                    style={{ boxShadow: `inset 0 0 0 5px ${DOT}` }}
                  />
                )}
                {(square === selected || isHover) && <Brackets />}
                {hintSquare === square && (
                  <div className="pointer-events-none absolute inset-0 animate-pulse ring-4 ring-inset ring-sky-500/80" />
                )}
                {badge?.square === square && (
                  <div
                    className="pointer-events-none absolute right-[3%] top-[3%] z-20 grid size-[34%] place-items-center rounded-md text-white shadow"
                    style={{ backgroundColor: badge.kind === 'correct' ? '#98b84a' : '#c0392b' }}
                    role="img"
                    aria-label={badge.kind === 'correct' ? 'Correct' : 'Wrong'}
                  >
                    {badge.kind === 'correct' ? (
                      <Check className="size-3/4" strokeWidth={3.5} />
                    ) : (
                      <X className="size-3/4" strokeWidth={3.5} />
                    )}
                  </div>
                )}
              </div>
            );
          },
        }}
      />
    </div>
  );
}
