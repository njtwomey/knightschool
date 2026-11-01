import type { Score } from '@knightschool/core';
import { BoardThumb } from '@/components/board/board-thumb';
import { StateBadge } from '@/components/progress/state-badge';
import type { ProgressState } from '@/components/progress/states';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EvalWords } from './eval-words';
import { KindBadge, type LineKind } from './kind-badge';
import { MoveRun, type RunMove } from './move-run';
import { OpeningName, type OpeningNameProps } from './opening-name';
import { PositionPreview } from './position-preview';

export type CardLine = {
  id: string;
  name: string;
  kind: LineKind;
  href: string;
  /** Where the line goes, for the preview on hover. */
  endEpd?: string;
};

export type PositionCardProps = {
  epd: string;
  /** Turned to the side that matters for the list. */
  orientation?: 'white' | 'black';
  lastMove?: { from: string; to: string };
  /** The position's name, or the deepest named position before it. */
  name?: OpeningNameProps;
  /** The last few moves that reach it, cut with "…" at the front. */
  moves?: { run: RunMove[]; firstPly: number; cut?: boolean };
  /** Share of games at the band that reach it, in percent. */
  sharePct?: number;
  band?: string;
  /** The lines through it; transpositions count. */
  lines?: CardLine[];
  /** The openings that teach it, with the learner's state when it is in their repertoire. */
  openings?: { name: string; state?: ProgressState }[];
  score?: Score | null;
  /** Why it is in this list: "matches your board search", "shows a fork". */
  reason?: string;
  /** The board page, or the line page when the card is for one line. */
  href: string;
  layout?: 'card' | 'row';
  loading?: boolean;
};

/** Controls inside the card keep their own clicks, above the link stretched over it. */
const ABOVE = 'relative z-10';

function LineLink({ line }: { line: CardLine }) {
  const link = (
    <a href={line.href} className={cn(ABOVE, 'min-w-0 truncate text-sm underline-offset-2 hover:underline')}>
      {line.name}
    </a>
  );
  return (
    <li className="flex min-w-0 items-center gap-2">
      {line.endEpd ? (
        <PositionPreview position={{ epd: line.endEpd, caption: <>Where {line.name} goes</> }}>{link}</PositionPreview>
      ) : (
        link
      )}
      <span className={ABOVE}>
        <KindBadge kind={line.kind} />
      </span>
    </li>
  );
}

/**
 * A position as a card in a list: a thumb, its name, how often players reach it, and the lines and openings through
 * it (docs/v2/components/position-card.md). The whole card is a link; links inside keep their own clicks.
 */
export function PositionCard({
  epd,
  orientation = 'white',
  lastMove,
  name,
  moves,
  sharePct,
  band = '1000 to 1600',
  lines = [],
  openings = [],
  score,
  reason,
  href,
  layout = 'card',
  loading,
}: PositionCardProps) {
  const row = layout === 'row';
  const label = name?.name ?? 'Open this position';
  return (
    <Card
      className={cn(
        'relative content-start gap-3 p-3 transition-colors hover:border-primary/40 has-[a[data-card-link]:focus-visible]:ring-2 has-[a[data-card-link]:focus-visible]:ring-ring',
        row ? 'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4' : 'grid',
      )}
    >
      <a href={href} data-card-link className="absolute inset-0 rounded-xl outline-none" aria-label={label} />
      {loading ? (
        <Skeleton className={cn('aspect-square', row ? 'w-24' : 'w-full')} />
      ) : (
        <BoardThumb
          epd={epd}
          orientation={orientation}
          lastMove={lastMove}
          className={row ? 'w-24' : 'w-full'}
          id={`card-${epd.replace(/[^a-z0-9]/gi, '').slice(0, 40)}`}
        />
      )}
      <div className="grid min-w-0 content-start gap-2">
        {name ? <OpeningName {...name} oneLine={row} className={cn('text-sm', ABOVE)} /> : null}
        {moves ? (
          <p className={cn('flex min-w-0 items-baseline gap-0.5 text-muted-foreground', ABOVE)}>
            {moves.cut ? <span aria-label="earlier moves">…</span> : null}
            <MoveRun moves={moves.run} firstPly={moves.firstPly} orientation={orientation} />
          </p>
        ) : null}
        {loading ? (
          <Skeleton className="h-4 w-3/4" />
        ) : sharePct !== undefined ? (
          <p className="text-xs text-muted-foreground">
            Reached in {sharePct < 0.1 ? 'under 0.1' : sharePct < 1 ? sharePct.toFixed(1) : Math.round(sharePct)}% of
            games at {band}
          </p>
        ) : null}
        {score !== undefined ? <EvalWords score={score} className="text-sm" /> : null}
        {lines.length > 0 ? (
          <ul className="grid gap-1">
            {lines.slice(0, 3).map((line) => (
              <LineLink key={line.id} line={line} />
            ))}
            {lines.length > 3 ? <li className="text-xs text-muted-foreground">and {lines.length - 3} more</li> : null}
          </ul>
        ) : null}
        {openings.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {openings.map((opening) => (
              <li key={opening.name} className={cn('flex items-center gap-1.5 text-xs', ABOVE)}>
                {opening.state ? <StateBadge state={opening.state} of="variation" size="dot" /> : null}
                {opening.name}
              </li>
            ))}
          </ul>
        ) : null}
        {reason ? <p className="text-xs text-muted-foreground italic">{reason}</p> : null}
      </div>
    </Card>
  );
}
