import { Page } from '@/components/page';
import {
  checkFen,
  EMPTY_SETUP,
  epdToFen,
  fenFromSetup,
  fenToEpd,
  loadGame,
  pgnFor,
  placePiece,
  playSan,
  playUci,
  setupFromFen,
  START_FEN,
  withPromotion,
  type PieceLetter,
  type Setup,
} from '@knightschool/core';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Eraser,
  FlipHorizontal2,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { useBoardPrefs } from '@/components/board/prefs';
import { piecesFor } from '@/components/board/pieces';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EngineLines } from '@/features/engine/engine-lines';
import { decodeMoves, encodeMoves } from '@/router/hash';
import { readHashState, setHashState } from '@/router/location';

type Played = { uci: string; san: string; epd: string };

/** Replays UCI moves from a start FEN, stopping at the first that does not fit. */
function replay(startFen: string, ucis: string[]): Played[] {
  const out: Played[] = [];
  let epd = fenToEpd(startFen);
  for (const uci of ucis) {
    try {
      const move = playUci(epd, uci);
      out.push({ uci, san: move.san, epd: move.epd });
      epd = move.epd;
    } catch {
      break;
    }
  }
  return out;
}

const PIECES: PieceLetter[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

/**
 * The analysis board. It starts from the usual position; play moves on it, flip it, step back and forward, or set up
 * any position piece by piece. The engine looks at whatever is on the board, and the game can be copied out as a PGN
 * (with the start position in its header) to paste into a conversation or a course.
 */
export function LabPage() {
  // The whole board lives in the URL hash, so a refresh or a shared link shows the same position.
  const initial = useMemo(() => {
    const hash = readHashState();
    const fen = hash.fen && checkFen(hash.fen) === null ? hash.fen : START_FEN;
    const moves = replay(fen, decodeMoves(hash.m));
    const cursor = Math.min(Number(hash.c ?? moves.length) || 0, moves.length);
    return { fen, moves, cursor, side: hash.side === 'black' ? ('black' as const) : ('white' as const) };
  }, []);
  const [startFen, setStartFen] = useState(initial.fen);
  const [moves, setMoves] = useState<Played[]>(initial.moves);
  const [cursor, setCursor] = useState(initial.cursor);
  const [side, setSide] = useState<'white' | 'black'>(initial.side);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [tool, setTool] = useState<PieceLetter | 'erase'>('K');
  const [paste, setPaste] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const prefs = useBoardPrefs();

  const startEpd = fenToEpd(startFen);
  const epd = cursor > 0 ? moves[cursor - 1]!.epd : startEpd;
  const pgn = pgnFor(
    startFen,
    moves.map((move) => move.san),
  );
  const setupFen = setup ? fenFromSetup(setup) : null;
  const setupProblem = setupFen ? checkFen(setupFen) : null;

  useEffect(() => {
    setHashState({
      fen: startFen === START_FEN ? undefined : startFen,
      m: moves.length ? encodeMoves(moves.map((move) => move.uci)) : undefined,
      c: moves.length && cursor !== moves.length ? String(cursor) : undefined,
      side: side === 'black' ? 'black' : undefined,
    });
  }, [startFen, moves, cursor, side]);

  function play(uci: string): boolean {
    const played = withPromotion(epd, uci);
    if (!played) return false;
    try {
      const move = playUci(epd, played);
      setMoves([...moves.slice(0, cursor), { uci: played, san: move.san, epd: move.epd }]);
      setCursor(cursor + 1);
      setProblem(null);
      return true;
    } catch {
      return false;
    }
  }

  function begin(fen: string, sans: string[] = []) {
    // Replays the SAN moves so every position is known; the first illegal one cannot happen after loadGame.
    const played: Played[] = [];
    let at = fenToEpd(fen);
    for (const san of sans) {
      const move = playSan(at, san);
      played.push({ uci: move.uci, san, epd: move.epd });
      at = move.epd;
    }
    setStartFen(fen);
    setMoves(played);
    setCursor(played.length);
    setSetup(null);
    setProblem(null);
  }

  function load() {
    try {
      const game = loadGame(paste);
      begin(game.startFen, game.sans);
      setPaste('');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    }
  }

  async function copy(what: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setProblem('Your browser would not let me copy. Select the text and copy it by hand.');
    }
  }

  const palette = piecesFor(prefs.pieces);
  const editing = setup !== null;
  const shownEpd = editing ? fenToEpd(setupFen!) : epd;

  return (
    <Page className="gap-4 lg:grid-cols-[minmax(0,34rem)_1fr]">
      <div className="grid content-start gap-3">
        <AppBoard
          id="lab"
          className="aspect-square w-full"
          epd={shownEpd}
          orientation={side}
          interactive={!editing}
          onMove={play}
          lastMove={editing || cursor === 0 ? undefined : moves[cursor - 1]!.uci}
          onSquareSelect={
            editing
              ? (square) =>
                  setSetup((current) =>
                    current
                      ? { ...current, placement: placePiece(current.placement, square, tool === 'erase' ? null : tool) }
                      : current,
                  )
              : undefined
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <BoardSettingsButton />
          <Button
            variant="outline"
            size="icon"
            aria-label="Flip the board"
            onClick={() => setSide(side === 'white' ? 'black' : 'white')}
          >
            <FlipHorizontal2 aria-hidden />
          </Button>
          {!editing && (
            <div className="ml-auto flex gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Start"
                disabled={cursor === 0}
                onClick={() => setCursor(0)}
              >
                <ChevronsLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Back one move"
                disabled={cursor === 0}
                onClick={() => setCursor(cursor - 1)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Forward one move"
                disabled={cursor === moves.length}
                onClick={() => setCursor(cursor + 1)}
              >
                <ChevronRight aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="End"
                disabled={cursor === moves.length}
                onClick={() => setCursor(moves.length)}
              >
                <ChevronsRight aria-hidden />
              </Button>
            </div>
          )}
        </div>
        {!editing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engine</CardTitle>
            </CardHeader>
            <CardContent>
              <EngineLines epd={epd} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid content-start gap-4">
        {problem && (
          <Alert variant="destructive">
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        )}

        {editing ? (
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
                <Button type="button" disabled={setupProblem !== null} onClick={() => begin(setupFen!)}>
                  Use this position
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Board lab</CardTitle>
                <CardDescription>
                  Play moves on the board. Copy the game below to paste it elsewhere, for example to ask for an analysis
                  and notes to be added to a course.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <ol className="flex flex-wrap gap-x-1 gap-y-1 font-mono text-sm" aria-label="Moves">
                  {moves.length === 0 && (
                    <li className="text-muted-foreground">No moves yet. Play one on the board.</li>
                  )}
                  {moves.map((move, i) => {
                    const first = fenToEpd(startFen).split(' ')[1] === 'w' ? i % 2 === 0 : i % 2 === 1;
                    return (
                      <li key={i} className="flex items-center gap-1">
                        {first && (
                          <span className="text-muted-foreground">
                            {Math.floor((i + (startFen.split(' ')[1] === 'b' ? 1 : 0)) / 2) +
                              Number(startFen.split(' ')[5] ?? 1)}
                            .
                          </span>
                        )}
                        <Button
                          type="button"
                          variant={i === cursor - 1 ? 'secondary' : 'ghost'}
                          size="xs"
                          className="px-1.5 font-mono"
                          onClick={() => setCursor(i + 1)}
                        >
                          {move.san}
                        </Button>
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={moves.length === 0}
                    onClick={() => {
                      setMoves(moves.slice(0, Math.max(cursor - 1, 0)));
                      setCursor(Math.max(cursor - 1, 0));
                    }}
                  >
                    <Undo2 aria-hidden /> Take back
                  </Button>
                  <Button variant="outline" onClick={() => setSetup(setupFromFen(epdToFen(epd)))}>
                    <Pencil aria-hidden /> Set up a position
                  </Button>
                  <Button variant="outline" onClick={() => begin(START_FEN)}>
                    <RotateCcw aria-hidden /> New game
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Copy</CardTitle>
                <CardDescription>
                  The PGN has the start position in its header when it is not the usual one, so it reproduces exactly
                  what is on the board.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Textarea
                  readOnly
                  rows={4}
                  value={pgn}
                  className="font-mono text-sm"
                  aria-label="PGN"
                  onFocus={(event) => event.target.select()}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => void copy('pgn', pgn)}>
                    <Copy aria-hidden /> {copied === 'pgn' ? 'Copied the PGN' : 'Copy PGN'}
                  </Button>
                  <Button variant="outline" onClick={() => void copy('fen', epdToFen(epd, 0, 1))}>
                    <Copy aria-hidden /> {copied === 'fen' ? 'Copied the FEN' : 'Copy this position (FEN)'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Load</CardTitle>
                <CardDescription>Paste a PGN or a FEN to put it on the board.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Label htmlFor="lab-paste" className="sr-only">
                  PGN or FEN
                </Label>
                <Textarea
                  id="lab-paste"
                  rows={3}
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  placeholder="1. e4 e5 2. Nf3 Nc6 …  or  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  className="font-mono text-sm"
                />
                <div>
                  <Button variant="outline" disabled={!paste.trim()} onClick={load}>
                    Load
                  </Button>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="lab-fen">Position now (FEN)</Label>
                  <Input
                    id="lab-fen"
                    readOnly
                    value={epdToFen(epd)}
                    className="font-mono text-xs"
                    onFocus={(event) => event.target.select()}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
