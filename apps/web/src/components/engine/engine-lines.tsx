import { pvToSan } from '@knightschool/core';
import { formatScore } from '@knightschool/engine';
import { useEffect } from 'react';
import { isBaked } from '@/data/analysis';
import { useEngine } from '@/data/engine/store';

/**
 * The engine's best few lines for a position, each with its score: the full view, for the analysis board. It switches
 * the engine on and keeps it looking at whatever position it is given.
 */
export function EngineLines({ epd }: { epd: string | null }) {
  const { status, current, thinking, error } = useEngine();

  useEffect(() => {
    void useEngine.getState().turnOn();
  }, []);
  useEffect(() => {
    if (status !== 'off' && epd) void useEngine.getState().analyse(epd);
  }, [status, epd]);

  if (status === 'error') return <p className="text-sm text-destructive">The engine could not start: {error}</p>;
  if (!epd) return <p className="text-sm text-muted-foreground">Nothing for the engine to look at.</p>;
  const lines = current?.epd === epd ? current.lines : [];

  return (
    <div className="grid gap-1.5 text-sm" aria-live="polite">
      {lines.length === 0 && (
        <p className="text-muted-foreground">{thinking || status === 'starting' ? 'The engine is looking…' : ' '}</p>
      )}
      {lines.map((line, i) => (
        <p key={i} className="flex items-baseline gap-3">
          <span className="w-14 shrink-0 font-mono font-medium">{formatScore(line)}</span>
          <span className="min-w-0 font-mono text-muted-foreground">{pvToSan(epd, line.pv, 10)}</span>
        </p>
      ))}
      {current?.epd === epd && lines.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {isBaked(current) ? `depth ${current.depth}, baked` : `depth ${current.depth}, live`}
        </p>
      )}
    </div>
  );
}
