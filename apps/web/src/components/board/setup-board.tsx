import {
  fittingTurn,
  placementOf,
  possibleCastling,
  setupFen,
  setupFromFen,
  setupProblem,
  START_FEN,
  type Placement,
  type Setup,
} from '@knightschool/core';
import { Eraser, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Chessboard, ChessboardProvider, SparePiece, type PieceDropHandlerArgs } from 'react-chessboard';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { Notice } from '@/components/shared/notice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { BOARD_THEMES, useBoardSettings } from './board-settings-menu';

const TRAY = ['K', 'Q', 'R', 'B', 'N', 'P'];
const RIGHTS = [
  { right: 'K', label: 'White O-O' },
  { right: 'Q', label: 'White O-O-O' },
  { right: 'k', label: 'Black O-O' },
  { right: 'q', label: 'Black O-O-O' },
];

function Tray({ colour }: { colour: 'w' | 'b' }) {
  return (
    <div className="grid grid-cols-6 gap-1" aria-label={colour === 'w' ? 'White pieces' : 'Black pieces'}>
      {TRAY.map((piece) => (
        <div key={piece} className="aspect-square cursor-grab">
          <SparePiece pieceType={`${colour}${piece}`} />
        </div>
      ))}
    </div>
  );
}

/**
 * Setting up a position (docs/v2/pages/board.md): the board takes pieces from two trays, and a piece dragged off it or
 * clicked is removed. Castling and whose move it is follow from the pieces: only rights the king and rooks still allow
 * can be ticked, and a side in check must be the side to move.
 */
export function SetupBoard({
  fen,
  orientation,
  onDone,
  onCancel,
}: {
  fen: string;
  orientation: 'white' | 'black';
  onDone: (fen: string) => void;
  onCancel: () => void;
}) {
  const [setup, setSetup] = useState<Setup>(() => setupFromFen(fen));
  const settings = useBoardSettings();
  const theme = BOARD_THEMES.find((candidate) => candidate.id === settings.theme) ?? BOARD_THEMES[0];
  const place = (placement: Placement) => setSetup((current) => ({ ...current, placement }));
  const position = useMemo(
    () => Object.fromEntries(Object.entries(setup.placement).map(([square, piece]) => [square, { pieceType: piece }])),
    [setup.placement],
  );
  const onPieceDrop = ({ piece, sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    const next = { ...setup.placement };
    if (!piece.isSparePiece && sourceSquare) delete next[sourceSquare];
    if (targetSquare) next[targetSquare] = piece.pieceType;
    place(next);
    return true;
  };
  const turn = fittingTurn(setup);
  const fitted = { ...setup, turn };
  const possible = possibleCastling(setup.placement);
  const problem = setupProblem(fitted);
  const toggle = (right: string, on: boolean) =>
    setSetup((current) => ({
      ...current,
      castling: on ? `${current.castling}${right}` : current.castling.replace(right, ''),
    }));

  return (
    <ChessboardProvider
      options={{
        id: 'board-setup',
        position,
        boardOrientation: orientation,
        boardStyle: { borderRadius: 0 },
        lightSquareStyle: { backgroundColor: theme.light },
        darkSquareStyle: { backgroundColor: theme.dark },
        showNotation: settings.coordinates,
        allowDragOffBoard: true,
        onPieceDrop,
        onSquareClick: ({ piece, square }) => {
          if (!piece) return;
          const next = { ...setup.placement };
          delete next[square];
          place(next);
        },
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
        <div className="aspect-square w-full self-start overflow-hidden shadow-sm">
          <Chessboard />
        </div>
        <Card className="gap-3 self-start py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-base">Set up a position</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 px-4">
            <p className="text-sm text-muted-foreground">
              Drag pieces onto the board. Drag a piece off, or click it, to remove it.
            </p>
            <div className="grid max-w-sm gap-2">
              <Tray colour="b" />
              <Tray colour="w" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => place({})}>
                <Eraser aria-hidden /> Clear the board
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSetup({ placement: placementOf(START_FEN), turn: 'w', castling: 'KQkq' })}
              >
                <RotateCcw aria-hidden /> Starting position
              </Button>
            </div>
            <FilterToggle
              label="To move"
              size="sm"
              value={turn}
              onChange={(next) => setSetup((current) => ({ ...current, turn: next }))}
              options={[
                { value: 'w', label: 'White' },
                { value: 'b', label: 'Black' },
              ]}
            />
            <div className="grid gap-2">
              <span className="text-sm text-muted-foreground">Castling</span>
              <div className="grid grid-cols-2 gap-2">
                {RIGHTS.map(({ right, label }) => {
                  const allowed = possible.includes(right);
                  return (
                    <Label key={right} className="font-normal">
                      <Checkbox
                        disabled={!allowed}
                        checked={allowed && setup.castling.includes(right)}
                        onCheckedChange={(on) => toggle(right, on === true)}
                      />
                      {label}
                    </Label>
                  );
                })}
              </div>
            </div>
            {problem ? <Notice kind="problem" text={problem} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={Boolean(problem)} onClick={() => onDone(setupFen(fitted))}>
                Use this position
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ChessboardProvider>
  );
}
