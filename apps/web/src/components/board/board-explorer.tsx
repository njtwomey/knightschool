import type { Grade } from '@knightschool/core';
import { BookOpen, ChevronDown, ChevronUp, CircleAlert, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { MoveChip } from '@/components/chess/move-chip';
import { VerdictBadge } from '@/components/chess/verdict-badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Reveal } from './board';

export type ExplorerRow = {
  uci: string;
  san: string;
  games: number;
  white: number;
  draws: number;
  black: number;
  /** The position after the move, for the chip's preview. */
  after?: string;
  /** The judgement, where the evaluations are known. */
  grade?: Grade;
  /** The opening's own move here. */
  book?: boolean;
  /** A common reply the opening does not answer yet. */
  gap?: boolean;
};

export type ExplorerState =
  | { status: 'ready'; rows: ExplorerRow[]; games: number; source: 'baked' | 'live' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'no-token' };

export type BoardExplorerProps = {
  state: ExplorerState;
  /** The ply of the move to be played from here (for move numbers). */
  ply: number;
  /** The band, from the learner's level (`level.band`). */
  band?: string;
  /** Hidden at the `learn` and `test` reveal levels. */
  reveal?: Reveal;
  /** Rows shown before More. */
  limit?: number;
  /** `explorer.minShare`: rows below it fold under More whatever the limit. */
  minShare?: number;
  /** Hover a row: the move is drawn as a candidate arrow on the board; null when the pointer leaves. */
  onHover?: (uci: string | null) => void;
  /** Click a row: the move is played as an explored move. Without it, a click only shows the move. */
  onPlay?: (uci: string) => void;
  /** Where a gap's "not covered" leads (gap-link). */
  gapHref?: (uci: string) => string;
  settingsHref?: string;
  orientation?: 'white' | 'black';
};

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const count = (n: number) => n.toLocaleString('en-GB');
/** One grid for the header and every row, fixed tracks, so every bar starts and ends at the same place. */
const EXPLORER_COLUMNS = 'grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,1.5fr)_6.5rem]';
/** A segment narrower than this holds no label. */
const LABEL_MIN = 14;

function Segment({ value, className }: { value: number; className: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center overflow-hidden text-[0.7rem] leading-none tabular-nums',
        className,
      )}
      style={{ width: `${value}%` }}
    >
      {value >= LABEL_MIN ? `${Math.round(value)}%` : null}
    </span>
  );
}

function ResultsBar({ row }: { row: ExplorerRow }) {
  const w = pct(row.white, row.games);
  const d = pct(row.draws, row.games);
  const b = pct(row.black, row.games);
  return (
    <div
      className="flex h-5 w-full overflow-hidden rounded-sm ring-1 ring-border"
      role="img"
      aria-label={`White wins ${Math.round(w)}%, draws ${Math.round(d)}%, Black wins ${Math.round(b)}%`}
    >
      <Segment value={w} className="bg-eval-white text-eval-black" />
      <Segment value={d} className="bg-muted-foreground/45 text-foreground" />
      <Segment value={b} className="bg-eval-black text-eval-white" />
    </div>
  );
}

function PlayedBar({ value }: { value: number }) {
  return (
    <div
      className="relative h-5 w-full overflow-hidden rounded-sm bg-muted"
      role="img"
      aria-label={`Played in ${Math.round(value)}% of games`}
    >
      <div className="h-full bg-foreground/20" style={{ width: `${value}%` }} />
      <span className="absolute inset-y-0 left-1.5 flex items-center text-[0.7rem] leading-none font-medium tabular-nums">
        {Math.round(value)}%
      </span>
    </div>
  );
}

const QUIET = 'text-xs text-muted-foreground';

function Row({
  row,
  total,
  ply,
  onHover,
  onPlay,
  gapHref,
  orientation,
}: {
  row: ExplorerRow;
  total: number;
} & Pick<BoardExplorerProps, 'ply' | 'onHover' | 'onPlay' | 'gapHref' | 'orientation'>) {
  return (
    <li
      className="col-span-4 grid grid-cols-subgrid items-center rounded-md py-1 hover:bg-muted/60"
      onMouseEnter={() => onHover?.(row.uci)}
      onMouseLeave={() => onHover?.(null)}
    >
      <span className="flex items-center gap-1 pl-1">
        <MoveChip
          ply={ply}
          san={row.san}
          epd={row.after}
          from={row.uci.slice(0, 2)}
          to={row.uci.slice(2, 4)}
          numbered="never"
          preview={false}
          onSelect={onPlay ? () => onPlay(row.uci) : undefined}
          onHover={(hovering) => onHover?.(hovering ? row.uci : null)}
          orientation={orientation}
        />
        {row.book ? <BookOpen className="size-3.5 shrink-0 text-verdict-book" aria-label="The opening's move" /> : null}
      </span>
      <PlayedBar value={pct(row.games, total)} />
      <ResultsBar row={row} />
      <span className="flex justify-end pr-1">
        {row.gap ? (
          gapHref ? (
            <a href={gapHref(row.uci)} className={cn(QUIET, 'underline decoration-dashed underline-offset-2')}>
              Not covered
            </a>
          ) : (
            <span className={QUIET}>Not covered</span>
          )
        ) : row.grade ? (
          <VerdictBadge grade={row.grade} size="sm" />
        ) : (
          <span className={QUIET}>Not judged</span>
        )}
      </span>
    </li>
  );
}

/**
 * What players at the learner's level play from the position on the board: how often, how those games went, and how
 * good each move is (docs/v2/components/board-explorer.md).
 */
export function BoardExplorer({
  state,
  ply,
  band = '1000 to 1600',
  reveal = 'study',
  limit = 6,
  minShare = 1,
  onHover,
  onPlay,
  gapHref,
  settingsHref = '/settings#accounts',
  orientation,
}: BoardExplorerProps) {
  const [more, setMore] = useState(false);
  if (reveal === 'learn' || reveal === 'test') return null;

  let body;
  if (state.status === 'loading') {
    body = (
      <div className="grid gap-2" aria-busy>
        <p className="text-sm text-muted-foreground">Asking Lichess…</p>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CircleAlert className="size-4 shrink-0" aria-hidden />
        {state.message}
      </p>
    );
  } else if (state.status === 'no-token') {
    body = (
      <Empty className="p-4">
        <EmptyHeader>
          <EmptyTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="size-4" aria-hidden />
            No numbers for this position yet
          </EmptyTitle>
          <EmptyDescription>
            This position is not in the site's own counts. Add a Lichess token in <a href={settingsHref}>settings</a> to
            ask the live explorer.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else if (state.rows.length === 0) {
    body = <p className="text-sm text-muted-foreground">No games reach this position at {band}.</p>;
  } else {
    // Shares are of every game reaching the position, not only of the rows listed.
    const total = Math.max(
      state.games,
      state.rows.reduce((sum, row) => sum + row.games, 0),
    );
    const sorted = [...state.rows].sort((a, b) => b.games - a.games);
    const main = sorted.filter((row, i) => i < limit && pct(row.games, total) >= minShare);
    const rest = sorted.slice(main.length);
    const shown = more ? sorted : main;
    body = (
      <>
        <ul className={cn('grid gap-x-3', EXPLORER_COLUMNS)}>
          <li className="col-span-4 grid grid-cols-subgrid pb-1 text-xs text-muted-foreground" aria-hidden>
            <span className="pl-1">Move</span>
            <span>Played</span>
            <span>White, draws, Black</span>
            <span className="pr-1 text-right">Verdict</span>
          </li>
          {shown.map((row) => (
            <Row
              key={row.uci}
              row={row}
              total={total}
              ply={ply}
              onHover={onHover}
              onPlay={onPlay}
              gapHref={gapHref}
              orientation={orientation}
            />
          ))}
        </ul>
        {rest.length > 0 ? (
          <Button variant="ghost" size="xs" className="justify-self-start" onClick={() => setMore(!more)}>
            {more ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            {more ? 'Fewer' : `${rest.length} more`}
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {count(state.games)} games on Lichess, blitz and rapid, {band}
          {state.source === 'live' ? ', asked just now' : ''}.
        </p>
      </>
    );
  }
  return (
    <section className="grid content-start gap-2 rounded-lg border p-3" aria-label="What players play here">
      <h3 className="text-sm font-medium">What players at {band} play here</h3>
      {body}
    </section>
  );
}
