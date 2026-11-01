import { evalWords, type Played, type Score } from '@knightschool/core';
import { EvalWords } from '@/components/chess/eval-words';
import { MoveRun } from '@/components/chess/move-run';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';
import { setBoardSetting, useBoardSettings } from './board-settings-menu';

/** One of the engine's lines: its score (White's view), its moves in UCI, and the first of them played out. */
export type EvalLine = { score: Score; pv: string[]; moves: Played[] };

/**
 * What the engine has to say about one position, wherever it came from: live analysis (`useAnalysis` gives exactly
 * this), or baked analysis with `source: 'baked'`.
 */
export type EvalReadout = {
  status?: 'off' | 'starting' | 'ready' | 'error';
  error?: string | null;
  depth: number;
  lines: EvalLine[];
  /** Still searching deeper. */
  thinking?: boolean;
  source?: 'live' | 'baked';
};

/** The board shows one to three lines here; the setting allows up to five, offered in the board settings menu. */
const LINE_CHOICES = [1, 2, 3];

/** Where the number came from and how far it has got: "Starting the engine…", "depth 18", "Depth 26, baked". */
export function EvalStatus({ readout, className }: { readout: EvalReadout; className?: string }) {
  const tone = cn('text-sm text-muted-foreground', className);
  if (readout.status === 'error') {
    return <p className={cn('text-sm text-destructive', className)}>The engine could not start: {readout.error}</p>;
  }
  if (readout.status === 'starting') {
    return (
      <p className={cn(tone, 'flex items-center gap-2')}>
        <Spinner /> Starting the engine…
      </p>
    );
  }
  if (readout.thinking) {
    return (
      <p className={cn(tone, 'flex items-center gap-2')}>
        <Spinner /> The engine is looking{readout.depth ? `, depth ${readout.depth}` : '…'}
      </p>
    );
  }
  if (readout.depth) return <p className={tone}>{`Depth ${readout.depth}, ${readout.source ?? 'live'}`}</p>;
  return null;
}

/**
 * The engine's best lines, best first: each a score and a move run. A click on a move plays the line up to it
 * (`onPlay` gets the UCI moves); hovering a move previews its position.
 */
export function EngineLines({
  lines,
  firstPly,
  orientation,
  onPlay,
  max,
}: {
  lines: EvalLine[];
  /** The ply of the first move of each line, for move numbers. */
  firstPly: number;
  orientation?: 'white' | 'black';
  onPlay?: (ucis: string[]) => void;
  /** Show at most this many lines. */
  max?: number;
}) {
  const shown = lines.filter((line) => line.moves.length > 0).slice(0, max);
  if (!shown.length) return null;
  return (
    <ol className="grid gap-2" aria-label="The engine's best lines">
      {shown.map((line, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <Badge variant="secondary" className="w-14 shrink-0 justify-center font-mono tabular-nums">
            {evalWords(line.score, siteConfig.judge.evalWords).number}
          </Badge>
          <MoveRun
            moves={line.moves.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
            firstPly={firstPly}
            orientation={orientation}
            onSelect={onPlay ? (index) => onPlay(line.pv.slice(0, index + 1)) : undefined}
          />
        </li>
      ))}
    </ol>
  );
}

/**
 * The engine's card beside a board (docs/v2/components/board-eval.md, the `lines` view): the evaluation in words and
 * numbers, where it came from and how deep, and the best lines. With `controls`, its header turns the engine on and off
 * and picks how many lines, through the board settings every board shares.
 */
export function BoardEval({
  readout,
  firstPly,
  orientation,
  onPlay,
  controls = true,
  title = 'Engine',
  className,
}: {
  readout: EvalReadout;
  firstPly: number;
  orientation?: 'white' | 'black';
  onPlay?: (ucis: string[]) => void;
  controls?: boolean;
  title?: string;
  className?: string;
}) {
  const settings = useBoardSettings();
  const score = readout.lines[0]?.score ?? null;
  return (
    <Card className={cn('gap-3 py-4', className)}>
      <CardHeader className="px-4">
        <CardTitle className="text-base">{title}</CardTitle>
        {controls ? (
          <CardAction className="flex items-center gap-3">
            {settings.engineOn ? (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                spacing={0}
                aria-label="Lines shown"
                value={String(Math.min(settings.engineLines, LINE_CHOICES.length))}
                onValueChange={(value) => value && setBoardSetting('engineLines', Number(value))}
              >
                {LINE_CHOICES.map((n) => (
                  <ToggleGroupItem
                    key={n}
                    value={String(n)}
                    className="tabular-nums"
                    aria-label={`${n} ${n === 1 ? 'line' : 'lines'}`}
                  >
                    {n}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : null}
            <div className="flex items-center gap-2">
              <Switch
                id="board-eval-engine-on"
                checked={settings.engineOn}
                onCheckedChange={(checked) => setBoardSetting('engineOn', checked)}
              />
              <Label htmlFor="board-eval-engine-on" className="text-sm font-normal">
                {settings.engineOn ? 'On' : 'Off'}
              </Label>
            </div>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 px-4">
        {controls && !settings.engineOn ? (
          <p className="text-sm text-muted-foreground">
            The engine is off. Turn it on to see Stockfish&rsquo;s evaluation and best lines, worked out in your
            browser.
          </p>
        ) : (
          <>
            <div className="grid gap-1">
              <EvalWords score={score} className="text-lg" />
              <EvalStatus readout={readout} />
            </div>
            <EngineLines lines={readout.lines} firstPly={firstPly} orientation={orientation} onPlay={onPlay} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
