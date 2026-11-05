import { epdToFen, evalWords, fenToEpd, firstPlyOf, playMove, replay, type Played } from '@knightschool/core';
import { Eraser, PencilRuler } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import { BoardEval } from '@/components/board/board-eval';
import { useBoardSettings } from '@/components/board/board-settings-menu';
import type { SystemArrow } from '@/components/board/board-surface';
import { MoveTable } from '@/components/chess/move-table';
import { Notice } from '@/components/shared/notice';
import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAnalysis } from '@/data/engine/use-analysis';
import { EMPTY_VIEW, readBoardHash, writeBoardHash, type BoardView } from './board-hash';
import { CopyMenu } from './copy-menu';
import { PasteDialog } from './paste-dialog';
import { ENGINE_ARROW_STRENGTH } from '@/components/board/colours';
import { SetupBoard } from '@/components/board/setup-board';
import { siteConfig } from '@/data/site-config';

/**
 * The view, kept in the address as it changes (replacing, so Back leaves the page), and read again when the hash is
 * edited.
 */
function useBoardView(onEdited: () => void) {
  const [view, setView] = useState<BoardView>(() => readBoardHash(window.location.hash));
  useEffect(() => {
    const onHash = () => {
      setView(readBoardHash(window.location.hash));
      onEdited();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [onEdited]);
  useEffect(() => {
    const hash = writeBoardHash(view);
    if (hash === window.location.hash || (!hash && !window.location.hash)) return;
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`);
  }, [view]);
  return [view, setView] as const;
}

/**
 * The raw board (docs/v2/pages/board.md): play any moves, step through them, paste a FEN or a PGN, copy the position,
 * and see what the engine thinks as it searches deeper. Playing a different move from an earlier point replaces the
 * moves after it. Set up swaps the page for a board to place pieces on, with a card of trays and options.
 */
export function BoardPage() {
  const [problem, setProblem] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);
  // A link opened in this tab (the hash edited) is a new board: what went wrong with the last paste no longer applies.
  const [view, setView] = useBoardView(useCallback(() => setProblem(null), []));
  const settings = useBoardSettings();

  const startEpd = fenToEpd(view.fen);
  const played: Played[] = useMemo(() => replay(startEpd, view.moves), [startEpd, view.moves]);
  const ply = Math.min(view.ply, played.length);
  const epd = ply === 0 ? startEpd : played[ply - 1]!.epd;
  const firstPly = firstPlyOf(view.fen);
  const analysis = useAnalysis(epd, {
    lines: settings.engineLines,
    enabled: settings.engineOn && !settingUp,
    maxDepth: settings.engineDepth,
  });
  const score = analysis.lines[0]?.score ?? null;

  const positions: BoardPosition[] = useMemo(
    () => [{ epd: startEpd }, ...played.map((move) => ({ epd: move.epd, lastMove: { from: move.from, to: move.to } }))],
    [startEpd, played],
  );
  const shown = positions.map((position, i) => (i === ply ? { ...position, score } : position));
  // Each line the engine shows as an arrow: the best solid, the rest fainter, each with its value on its square.
  const arrows: SystemArrow[] = settings.engineOn
    ? analysis.lines.slice(0, settings.engineLines).flatMap((line, i) => {
        const move = line.pv[0];
        if (!move) return [];
        return [
          {
            from: move.slice(0, 2),
            to: move.slice(2, 4),
            kind: 'engine' as const,
            strength: ENGINE_ARROW_STRENGTH[i] ?? ENGINE_ARROW_STRENGTH.at(-1)!,
            label: evalWords(line.score, siteConfig.judge.evalWords).number,
          },
        ];
      })
    : [];

  /** Plays moves from the position shown: the next move already played only steps forward; another replaces the rest. */
  const playLine = useCallback(
    (ucis: string[]) =>
      setView((current) => {
        let { moves, ply: at } = current;
        for (const uci of ucis) {
          if (moves[at] === uci) at += 1;
          else {
            moves = [...moves.slice(0, at), uci];
            at = moves.length;
          }
        }
        return { ...current, moves, ply: at };
      }),
    [setView],
  );

  const onMove = (from: string, to: string) => {
    // A pawn reaching the last rank becomes a queen.
    const move = playMove(epd, from + to) ?? playMove(epd, `${from}${to}q`);
    if (!move) return false;
    playLine([move.uci]);
    return true;
  };

  const actions = (
    <>
      <Button variant="outline" size="sm" className="h-11 sm:h-8" onClick={() => setSettingUp(true)}>
        <PencilRuler aria-hidden />
        Set up
      </Button>
      <PasteDialog
        onLoad={(game) => {
          setView((current) => ({
            fen: game.fen,
            moves: game.moves.map((move) => move.uci),
            ply: game.moves.length,
            side: current.side,
          }));
          setProblem(game.problem ?? null);
        }}
      />
      <CopyMenu fen={view.fen} moves={view.moves.slice(0, ply)} sans={played.map((move) => move.san)} />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-11 sm:h-8"
            disabled={view.fen === EMPTY_VIEW.fen && view.moves.length === 0}
            onClick={() => {
              setView((current) => ({ ...EMPTY_VIEW, side: current.side }));
              setProblem(null);
            }}
          >
            <Eraser aria-hidden />
            Clear
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back to the starting position, with no moves</TooltipContent>
      </Tooltip>
    </>
  );

  if (settingUp) {
    return (
      <PageShell title="Board" showTitle>
        <SetupBoard
          fen={epdToFen(epd)}
          orientation={view.side}
          onCancel={() => setSettingUp(false)}
          onDone={(fen) => {
            setView((current) => ({ ...current, fen, moves: [], ply: 0 }));
            setProblem(null);
            setSettingUp(false);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell title="Board" showTitle>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
        <Board
          positions={shown}
          index={ply}
          onIndex={(index) => setView((current) => ({ ...current, ply: index }))}
          orientation={view.side}
          onFlip={() => setView((current) => ({ ...current, side: current.side === 'white' ? 'black' : 'white' }))}
          evalBar={settings.engineOn}
          settingsGroups={['look', 'display', 'engine']}
          arrows={arrows}
          interactive
          onMove={onMove}
          actions={actions}
          keys
          className="max-w-none"
        />
        <div className="grid content-start gap-4">
          {problem ? (
            <Notice
              kind="problem"
              text={problem}
              action={
                <Button variant="ghost" size="sm" onClick={() => setProblem(null)}>
                  Close
                </Button>
              }
            />
          ) : null}
          <BoardEval readout={analysis} firstPly={firstPly + ply} orientation={view.side} onPlay={playLine} />
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-base">Moves</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 px-4">
              {played.length ? (
                <MoveTable
                  moves={played.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
                  current={ply - 1}
                  firstPly={firstPly}
                  onSelect={(index) => setView((current) => ({ ...current, ply: index + 1 }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No moves yet. Drag a piece to play one.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Going back and playing a different move replaces the moves after it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
