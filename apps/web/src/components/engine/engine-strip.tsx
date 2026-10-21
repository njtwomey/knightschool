import { engineExplainer, pvToSan } from '@knightschool/core';
import { formatScore } from '@knightschool/engine';
import { useEffect } from 'react';
import { isBaked } from '@/data/analysis';
import { useEngine } from '@/data/engine/store';

/**
 * One quiet line under the board: what the engine thinks of `epd` and its best continuation, and, when it has looked at
 * the position before the last move too, why that move cost something. Nothing when the engine is off; it is switched
 * on and off in Settings.
 */
export function EngineStrip({
  epd,
  before,
  lastMove,
}: {
  epd: string;
  /** The position before the last move, to say what the move cost. */
  before?: string;
  lastMove?: { uci: string; san: string };
}) {
  const { status, current, thinking, seen } = useEngine();

  useEffect(() => {
    if (status !== 'off') void useEngine.getState().analyse(epd);
  }, [status, epd]);

  if (status === 'off') return null;

  const verdict =
    lastMove && before && seen[before] && seen[epd]
      ? engineExplainer.explain(before, lastMove.uci, { evalBefore: seen[before], evalAfter: seen[epd] })[0]
      : undefined;
  const best = current?.epd === epd ? current.lines[0] : undefined;

  return (
    <div className="grid gap-1.5 text-sm" aria-live="polite">
      <p className="flex items-baseline gap-3">
        <span className="w-14 shrink-0 font-mono font-medium">{best ? formatScore(best) : thinking ? '…' : ''}</span>
        {/* No width of its own (w-0 flex-1), so a long line is cut short instead of widening the page. */}
        <span className="w-0 flex-1 truncate font-mono text-muted-foreground" title="The engine's best continuation">
          {best ? pvToSan(epd, best.pv, 8) : thinking ? 'The engine is looking…' : ''}
        </span>
        {best && current && (
          <span
            className="ml-auto shrink-0 text-xs text-muted-foreground"
            title={
              isBaked(current) ? 'Searched ahead of time with a stronger engine' : 'Searched just now in your browser'
            }
          >
            {isBaked(current) ? `depth ${current.depth}, baked` : `depth ${current.depth}, live`}
          </span>
        )}
      </p>
      {verdict && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2">
          <span className="font-medium">{lastMove?.san}: </span>
          {verdict.text}
        </p>
      )}
    </div>
  );
}
