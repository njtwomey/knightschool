import {
  EMPTY_SETUP,
  checkFen,
  fenFromSetup,
  setupFromFen,
  START_FEN,
  type PieceLetter,
  type Setup,
} from '@knightschool/core';
import { Eraser, RotateCcw, Trash2 } from 'lucide-react';
import { piecesFor } from '@/components/board/pieces';
import { useBoardPrefs } from '@/components/board/prefs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SetupTool } from './setup-tool';

const PIECES: PieceLetter[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

/** Setting up a position piece by piece: the pieces, the eraser, the side to move and castling. */
export function SetupCard({
  setup,
  setSetup,
  tool,
  setTool,
  onUse,
  onCancel,
}: {
  setup: Setup;
  setSetup: (setup: Setup) => void;
  tool: SetupTool;
  setTool: (tool: SetupTool) => void;
  /** Starts a game from the position (its FEN). */
  onUse: (fen: string) => void;
  onCancel: () => void;
}) {
  const palette = piecesFor(useBoardPrefs().pieces);
  const setupFen = fenFromSetup(setup);
  const setupProblem = checkFen(setupFen);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up a position</CardTitle>
        <CardDescription>
          Pick a piece, then click squares to put it there. Click a square again with the eraser to clear it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {(['w', 'b'] as const).map((color) => (
          <div key={color} className="flex flex-wrap gap-1">
            {PIECES.map((piece) => {
              const letter = (color === 'w' ? piece : piece.toLowerCase()) as PieceLetter;
              const Piece = palette[`${color}${piece}`];
              return (
                <Button
                  key={letter}
                  type="button"
                  variant={tool === letter ? 'secondary' : 'outline'}
                  className="size-12 p-1"
                  aria-label={`${color === 'w' ? 'White' : 'Black'} ${piece}`}
                  aria-pressed={tool === letter}
                  onClick={() => setTool(letter)}
                >
                  {Piece ? <Piece /> : letter}
                </Button>
              );
            })}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={tool === 'erase' ? 'secondary' : 'outline'}
            onClick={() => setTool('erase')}
            aria-pressed={tool === 'erase'}
          >
            <Eraser aria-hidden /> Eraser
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSetup({ ...setup, placement: EMPTY_SETUP.placement })}
          >
            <Trash2 aria-hidden /> Clear the board
          </Button>
          <Button type="button" variant="outline" onClick={() => setSetup(setupFromFen(START_FEN))}>
            <RotateCcw aria-hidden /> Standard position
          </Button>
        </div>
        <div className="grid gap-2">
          <Label>Side to move</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={setup.turn}
            onValueChange={(value) => value && setSetup({ ...setup, turn: value as 'w' | 'b' })}
            className="justify-self-start"
          >
            <ToggleGroupItem value="w">White</ToggleGroupItem>
            <ToggleGroupItem value="b">Black</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid gap-2">
          <Label>Castling still allowed</Label>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={setup.castling.split('')}
            onValueChange={(value) => setSetup({ ...setup, castling: value.join('') })}
            className="justify-self-start"
          >
            <ToggleGroupItem value="K">White short</ToggleGroupItem>
            <ToggleGroupItem value="Q">White long</ToggleGroupItem>
            <ToggleGroupItem value="k">Black short</ToggleGroupItem>
            <ToggleGroupItem value="q">Black long</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {setupProblem && <p className="text-sm text-destructive">{setupProblem}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={setupProblem !== null} onClick={() => onUse(setupFen)}>
            Use this position
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
