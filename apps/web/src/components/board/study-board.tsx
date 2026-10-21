import { cn } from 'cn';
import { Eye, FlipHorizontal2, Lightbulb } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EngineLines } from '@/components/engine/engine-lines';
import { EngineStrip } from '@/components/engine/engine-strip';
import { EvalBar } from '@/components/engine/eval-bar';
import { AppBoard, type AppBoardProps } from './app-board';
import { BoardSettingsButton } from './board-settings';
import type { LineStepper } from './line-stepper';
import { StepButtons } from './step-buttons';

/** The controls a study board can show, always in this order: settings, flip, steps, hint, show, then the page's own. */
export type StudyBoardControls = {
  /** The board settings gear. On unless turned off. */
  settings?: boolean;
  /** A button that turns the board round. For boards whose side is not set by the exercise. */
  flip?: boolean;
  /** The engine's score in a bar beside the board. */
  evalBar?: boolean;
  /** Points at the piece to move. */
  hint?: { onHint: () => void; disabled?: boolean };
  /** Draws the move to play. */
  show?: { onShow: () => void; disabled?: boolean };
};

/** The engine under the board: one quiet line (`strip`), or its best few lines in a card (`lines`). */
export type StudyBoardEngine =
  { view: 'strip'; before?: string; lastMove?: { uci: string; san: string } } | { view: 'lines'; actions?: ReactNode };

export type StudyBoardProps = Omit<AppBoardProps, 'className'> & {
  /** Step buttons, and the arrow keys, for a board with a line to step through (`useLineStepper`). */
  stepper?: LineStepper | null;
  controls?: StudyBoardControls;
  /** For a page that keeps the side itself (Lab keeps it in the address): flip calls this instead. */
  onFlip?: () => void;
  engine?: StudyBoardEngine | false;
  /** A line under the controls saying what the board shows, e.g. "After 3.Bc4". */
  caption?: ReactNode;
  /** The page's own buttons, at the end of the control row. */
  actions?: ReactNode;
  /** Anything else that belongs with the board, last. */
  below?: ReactNode;
  /** `main` for the board a page is about, `aside` for a smaller board beside other content (see index.css). */
  size?: 'main' | 'aside';
  className?: string;
};

/**
 * The one board to study from. It wraps `AppBoard` with the same control row everywhere, each control turned on by a
 * prop, and sizes itself by the one rule in index.css (`--board-size`). Put it in a `.board-columns` grid for a page
 * with a board and a panel.
 */
export function StudyBoard({
  stepper,
  controls = {},
  onFlip,
  engine = false,
  caption,
  actions,
  below,
  size = 'main',
  className,
  orientation,
  ...board
}: StudyBoardProps) {
  const { settings = true, flip = false, evalBar = false, hint, show } = controls;
  const [flipped, setFlipped] = useState(false);
  const shown = flipped !== (orientation === 'black') ? 'black' : 'white';
  const row = settings || flip || stepper || hint || show || actions;

  return (
    <div
      className={cn(
        'grid w-full max-w-(--board-size) content-start gap-3',
        size === 'aside' && 'board-aside',
        className,
      )}
    >
      <div className="flex gap-2">
        {evalBar && <EvalBar orientation={shown} />}
        <AppBoard {...board} orientation={shown} className="aspect-square min-w-0 flex-1" />
      </div>
      {row && (
        <div className="flex flex-wrap items-center gap-2">
          {settings && <BoardSettingsButton />}
          {flip && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Flip the board"
              title="Flip the board"
              onClick={() => (onFlip ? onFlip() : setFlipped(!flipped))}
            >
              <FlipHorizontal2 aria-hidden />
            </Button>
          )}
          {stepper && <StepButtons stepper={stepper} />}
          {hint && (
            <Button variant="outline" onClick={hint.onHint} disabled={hint.disabled}>
              <Lightbulb aria-hidden /> Hint
            </Button>
          )}
          {show && (
            <Button variant="outline" onClick={show.onShow} disabled={show.disabled}>
              <Eye aria-hidden /> Show me
            </Button>
          )}
          {actions}
        </div>
      )}
      {caption && <div className="text-sm">{caption}</div>}
      {engine && engine.view === 'strip' && (
        <EngineStrip epd={board.epd} before={engine.before} lastMove={engine.lastMove} />
      )}
      {engine && engine.view === 'lines' && (
        // Stacked on a phone inside a page that lets the board's parts flow (`stacked:contents`), the engine comes last.
        <Card className="stacked:order-1">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Engine</CardTitle>
            {engine.actions}
          </CardHeader>
          <CardContent>
            <EngineLines epd={board.epd} />
          </CardContent>
        </Card>
      )}
      {below}
    </div>
  );
}
