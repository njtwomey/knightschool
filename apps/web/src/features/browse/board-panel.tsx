import { nodeAt, type OpeningContent } from '@knightschool/core';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppBoard } from '@/components/board/app-board';
import { BoardSettingsButton } from '@/components/board/board-settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EvalBar } from '@/features/engine/eval-bar';
import { arrowsOf, squareStylesOf } from './shapes';
import { currentEpd, useBrowse } from './store';

/** The board on the course page for exploring: step through a line, or play a move to see if the course has it. */
export function BoardPanel({ content }: { content: OpeningContent }) {
  const { path, notice, tryMove, stepBack, stepForward, toStart, toEnd } = useBrowse();
  const epd = currentEpd(content, path);
  const last = path.at(-1);
  const atEnd = nodeAt(content, epd).moves.length === 0;

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <EvalBar orientation={content.opening.side} />
        <AppBoard
          id="explore"
          previewable
          className="aspect-square min-w-0 flex-1"
          epd={epd}
          orientation={content.opening.side}
          lastMove={last?.uci}
          arrows={arrowsOf(last?.annotation)}
          squareStyles={squareStylesOf(undefined, last?.annotation)}
          onMove={tryMove}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <BoardSettingsButton />
        <div className="flex gap-1" role="group" aria-label="Move through the line">
          <Button variant="outline" size="icon" onClick={toStart} disabled={path.length === 0} aria-label="Start">
            <ChevronFirst aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={stepBack}
            disabled={path.length === 0}
            aria-label="Back one move"
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button variant="outline" size="icon" onClick={stepForward} disabled={atEnd} aria-label="Forward one move">
            <ChevronRight aria-hidden />
          </Button>
          <Button variant="outline" size="icon" onClick={toEnd} disabled={atEnd} aria-label="End of line">
            <ChevronLast aria-hidden />
          </Button>
        </div>
        <span className="w-9" aria-hidden />
      </div>
      {notice && (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
