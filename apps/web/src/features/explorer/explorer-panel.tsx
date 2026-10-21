import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/data/storage';
import { to } from '@/router/location';
import { createExplorer, getToken } from './service';
import { profileHref } from '@/router/hrefs';
import { useAsync } from '@/hooks/use-async';

const share = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/** What people at 1000 to 1600 play here. Not shown at all until a Lichess token has been added in Settings. */
export function ExplorerPanel({ epd, onPlay }: { epd: string; onPlay?: (uci: string) => void }) {
  const storage = useStorage((state) => state.storage?.storage);
  const token = getToken();
  const explorer = useMemo(() => (storage && token ? createExplorer({ storage, token }) : null), [storage, token]);
  // Only the answer for this position: a slow reply for the last one cannot show on this board.
  const lookup = useAsync(explorer ? () => explorer.lookup(epd) : null, [explorer, epd]);

  if (!token) {
    return (
      <div className="grid gap-1.5 rounded-lg border border-dashed bg-card p-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Users className="size-4" aria-hidden /> What people play here
        </p>
        <p className="text-muted-foreground">
          See the moves players at 1000 to 1600 choose from this position, and how those games go.{' '}
          <a href={to(profileHref('settings'))} className="font-medium text-foreground underline underline-offset-4">
            Add your Lichess token
          </a>{' '}
          to turn it on.
        </p>
      </div>
    );
  }
  if (!explorer) return null;
  const here = lookup.loading ? null : (lookup.data ?? null);
  const problem = lookup.loading ? null : lookup.error;
  const games = here ? here.white + here.draws + here.black : 0;

  return (
    <div className="grid gap-2 rounded-lg border bg-card p-3 text-sm">
      <p className="flex items-center gap-1.5 font-medium">
        <Users className="size-4" aria-hidden /> What people play here
      </p>
      {problem && <p className="text-muted-foreground">{problem}</p>}
      {!problem && !here && <p className="text-muted-foreground">Asking Lichess…</p>}
      {here && games === 0 && <p className="text-muted-foreground">No games reach this position at 1000 to 1600.</p>}
      {here && games > 0 && (
        <>
          <ul className="grid gap-1.5">
            {here.moves.slice(0, 6).map((move) => {
              const total = move.white + move.draws + move.black;
              return (
                <li key={move.uci} className="grid grid-cols-[3.5rem_2.5rem_1fr] items-center gap-2">
                  {onPlay ? (
                    <Button
                      variant="secondary"
                      size="xs"
                      className="justify-start font-mono"
                      onClick={() => onPlay(move.uci)}
                      aria-label={`Play ${move.san} on the board`}
                    >
                      {move.san}
                    </Button>
                  ) : (
                    <span className="font-mono">{move.san}</span>
                  )}
                  <span className="text-right text-xs text-muted-foreground">{share(total, games)}%</span>
                  <span
                    className="flex h-2 overflow-hidden rounded-full bg-muted"
                    title={`White ${share(move.white, total)}%, draws ${share(move.draws, total)}%, Black ${share(move.black, total)}%`}
                  >
                    <span className="bg-neutral-100" style={{ width: `${share(move.white, total)}%` }} />
                    <span className="bg-neutral-500" style={{ width: `${share(move.draws, total)}%` }} />
                    <span
                      className="bg-neutral-900 dark:bg-neutral-950"
                      style={{ width: `${share(move.black, total)}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            {games.toLocaleString()} games, blitz and rapid, 1000 to 1600. Bars show White wins, draws and Black wins.
            {onPlay ? ' Click a move to try it on the board.' : ''}
          </p>
        </>
      )}
    </div>
  );
}
