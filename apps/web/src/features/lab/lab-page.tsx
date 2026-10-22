import {
  checkFen,
  epdToFen,
  fenFromSetup,
  fenToEpd,
  loadGame,
  pgnFor,
  playSan,
  playUci,
  replayUcis,
  setupFromFen,
  START_FEN,
  withPromotion,
  type Played,
  type Setup,
} from '@knightschool/core';
import { Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLineStepper } from '@/components/board/line-stepper';
import { StudyBoard } from '@/components/board/study-board';
import { MoveList } from '@/components/move-list';
import { Page } from '@/components/page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorText } from '@/lib/errors';
import { decodeMoves, encodeMoves } from '@/router/hash';
import { readHashState, setHashState } from '@/router/location';
import { CopyCard } from './copy-card';
import { LoadCard } from './load-card';
import { SetupCard } from './setup-card';
import { applyTool, type SetupTool } from './setup-tool';

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
    const moves = replayUcis(fenToEpd(fen), decodeMoves(hash.m));
    const cursor = Math.min(Number(hash.c ?? moves.length) || 0, moves.length);
    return { fen, moves, cursor, side: hash.side === 'black' ? ('black' as const) : ('white' as const) };
  }, []);
  const [startFen, setStartFen] = useState(initial.fen);
  const [moves, setMoves] = useState<Played[]>(initial.moves);
  const [cursor, setCursor] = useState(initial.cursor);
  const [side, setSide] = useState<'white' | 'black'>(initial.side);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [tool, setTool] = useState<SetupTool>('K');
  const [problem, setProblem] = useState<string | null>(null);

  const startEpd = fenToEpd(startFen);
  // Plies before the first move, from the FEN's move number and side to move, so the moves are numbered as in the game.
  const firstPly = (Number(startFen.split(' ')[5] ?? 1) - 1) * 2 + (startFen.split(' ')[1] === 'b' ? 1 : 0);
  const epd = cursor > 0 ? moves[cursor - 1]!.epd : startEpd;
  const pgn = pgnFor(
    startFen,
    moves.map((move) => move.san),
  );
  const setupFen = setup ? fenFromSetup(setup) : null;

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

  function load(text: string): boolean {
    try {
      const game = loadGame(text);
      begin(game.startFen, game.sans);
      return true;
    } catch (error) {
      setProblem(errorText(error));
      return false;
    }
  }

  const editing = setup !== null;
  const stepper = useLineStepper({ length: moves.length, index: cursor, setIndex: setCursor, keys: !editing });
  const shownEpd = editing ? fenToEpd(setupFen!) : epd;

  return (
    <Page className="board-columns gap-4">
      <StudyBoard
        id="lab"
        epd={shownEpd}
        orientation={side}
        interactive={!editing}
        onMove={play}
        lastMove={editing || cursor === 0 ? undefined : moves[cursor - 1]!.uci}
        onSquareSelect={
          editing
            ? (square) => setSetup((current) => (current ? applyTool(current, square, tool) : current))
            : undefined
        }
        controls={{ flip: true }}
        onFlip={() => setSide(side === 'white' ? 'black' : 'white')}
        // Steps and the engine are for the game on the board, not while a position is being set up.
        stepper={editing ? null : stepper}
        engine={!editing && { view: 'lines' }}
      />

      <div className="grid content-start gap-4">
        {problem && (
          <Alert variant="destructive">
            <AlertDescription>{problem}</AlertDescription>
          </Alert>
        )}

        {editing ? (
          <SetupCard
            setup={setup}
            setSetup={setSetup}
            tool={tool}
            setTool={setTool}
            onUse={(fen) => begin(fen)}
            onCancel={() => setSetup(null)}
          />
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
                <div className="text-sm">
                  <MoveList
                    layout="inline"
                    label="Moves"
                    empty="No moves yet. Play one on the board."
                    moves={moves.map((move, i) => ({ ply: firstPly + i, san: move.san }))}
                    current={firstPly + cursor - 1}
                    onSelect={(ply) => setCursor(ply - firstPly + 1)}
                  />
                </div>
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

            <CopyCard pgn={pgn} epd={epd} onProblem={setProblem} />
            <LoadCard epd={epd} onLoad={load} />
          </>
        )}
      </div>
    </Page>
  );
}
