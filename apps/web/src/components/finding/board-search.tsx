import { numberedMove, playMove, START_EPD, type Played } from '@knightschool/core';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import { BoardTargetContext, useBoardTarget, type BoardTarget } from '@/components/board/key-owner';
import { KindBadge } from '@/components/chess/kind-badge';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun } from '@/components/chess/move-run';
import { OpeningName } from '@/components/chess/opening-name';
import { ABOVE_ROW_LINK_GROUP } from '@/components/shared/card-link';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FilterToggle } from './filter-toggle';
import { indexLines, linesAt, nextMoves, type FindKind, type PositionHit, type PositionLine } from './search';
import { RowLink } from './sortable-table';

export type { FindKind, PositionLine } from './search';

const KIND_FILTER = [
  { value: 'all' as const, label: 'Lines and traps' },
  { value: 'lines' as const, label: 'Lines' },
  { value: 'traps' as const, label: 'Traps' },
];

/** Moves of a line shown after the searched position. */
const CONTINUATION_MOVES = 10;

const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });

/**
 * One line through the position. Hovering it shows on the board where the line leads; hovering a move of what it
 * continues to shows that position, and leaving the move goes back to where the line leads.
 */
function HitRow({
  hit: { line, ply, transposed },
  onFollow,
}: {
  hit: PositionHit;
  /** A move of what it continues to was clicked: play the line up to it. */
  onFollow: (moves: PositionLine['moves']) => void;
}) {
  const target = useBoardTarget();
  const end = line.moves.at(-1);
  const showEnd = useCallback(() => {
    if (target && end) target.preview(end.after, squares(end.uci));
  }, [target, end]);
  const clear = () => target?.preview(null);
  const rowTarget = useMemo<BoardTarget | null>(
    () => target && { ...target, preview: (epd, lastMove) => (epd ? target.preview(epd, lastMove) : showEnd()) },
    [target, showEnd],
  );
  const left = line.moves.length - ply;
  const ahead = line.moves.slice(ply, ply + CONTINUATION_MOVES);
  return (
    <li
      className="relative grid gap-1 rounded-lg border p-3 transition-colors hover:bg-muted/50"
      onMouseEnter={showEnd}
      onMouseLeave={clear}
    >
      <BoardTargetContext.Provider value={rowTarget}>
        <div className="flex flex-wrap items-center gap-2">
          <span onFocus={showEnd} onBlur={clear}>
            <RowLink href={line.href(ply)}>{line.name}</RowLink>
          </span>
          <KindBadge kind={line.kind} writtenFor={line.writtenFor} />
        </div>
        <p className="text-sm text-muted-foreground">
          {line.opening}
          {ply > 0 ? `, at ${numberedMove(ply - 1, line.moves[ply - 1]!.san)}` : ', from the start'}
          {left > 0 ? `; ${left} moves to go` : '; where the line ends'}
        </p>
        {ahead.length > 0 ? (
          <p className={cn('text-sm text-muted-foreground', ABOVE_ROW_LINK_GROUP)}>
            <MoveRun
              moves={ahead}
              firstPly={ply}
              side={line.writtenFor}
              onSelect={(i) => onFollow(ahead.slice(0, i + 1))}
            />
            {left > ahead.length ? <span className="ml-1 text-xs">and {left - ahead.length} more</span> : null}
          </p>
        ) : null}
        {transposed && ply > 0 ? (
          <p className="text-xs text-muted-foreground">
            Reached by another move order: the line plays{' '}
            <span className={ABOVE_ROW_LINK_GROUP}>
              <MoveRun moves={line.moves.slice(0, ply)} />
            </span>
          </p>
        ) : null}
      </BoardTargetContext.Provider>
    </li>
  );
}

export type BoardSearchProps = {
  lines: readonly PositionLine[];
  /** `dialog` from the search box; `panel` inside a page. */
  form?: 'dialog' | 'panel';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Moves (SAN or UCI) to begin from. */
  start?: readonly string[];
  kind?: FindKind;
  onKind?: (kind: FindKind) => void;
  /** Called after each change of the moves up to the position shown, for the address hash (`bm`). */
  onMoves?: (sans: string[], ucis: string[]) => void;
  /** "Open on the board", when no line passes through. */
  boardHref?: (sans: string[], ucis: string[]) => string;
  /** The opening's name at a position, shown over the results. */
  positionName?: (epd: string) => string | undefined;
  /** Lines listed before "Show more"; all of them without it. */
  pageSize?: number;
};

function BoardSearchBody({
  lines,
  start = [],
  kind: controlledKind,
  onKind,
  onMoves,
  boardHref,
  positionName,
  pageSize,
  bounded,
}: BoardSearchProps & { bounded?: boolean }) {
  const index = useMemo(() => indexLines(lines), [lines]);
  const [moves, setMoves] = useState<Played[]>(() => {
    const played: Played[] = [];
    for (const move of start) {
      const next = playMove(played.at(-1)?.epd ?? START_EPD, move);
      if (!next) break;
      played.push(next);
    }
    return played;
  });
  const [cursor, setCursorState] = useState(moves.length);
  const [ownKind, setOwnKind] = useState<FindKind>('all');
  const [more, setMore] = useState(0);
  // The results sit beside the board, not in its caption, so they reach it through this.
  const boardTarget = useRef<BoardTarget | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const nearBoard = useMemo<BoardTarget>(
    () => ({
      show: (...args) => boardTarget.current?.show(...args),
      light: (move) => boardTarget.current?.light(move),
      preview: (position, lastMove) => {
        setPreviewing(Boolean(position));
        boardTarget.current?.preview(position, lastMove);
      },
    }),
    [],
  );
  // Stepping beats a hover: a row under the pointer may be gone, and the position it showed goes with it.
  useEffect(() => nearBoard.preview(null), [nearBoard, cursor]);
  const kind = controlledKind ?? ownKind;
  const epd = cursor === 0 ? START_EPD : moves[cursor - 1]!.epd;
  const report = (played: readonly Played[]) =>
    onMoves?.(
      played.map((move) => move.san),
      played.map((move) => move.uci),
    );

  const setCursor = (next: number) => {
    setCursorState(next);
    setMore(0);
    report(moves.slice(0, next));
  };

  const positions: BoardPosition[] = [
    { epd: START_EPD },
    ...moves.map((move) => ({ epd: move.epd, lastMove: { from: move.from, to: move.to } })),
  ];

  const hits = linesAt(index, epd, moves.slice(0, cursor), kind);
  const next = nextMoves(hits);
  const name = cursor > 0 ? positionName?.(epd) : undefined;
  const shown = pageSize === undefined ? hits : hits.slice(0, pageSize + more);

  const play = (move: string) => {
    const played = playMove(epd, move);
    if (!played) return false;
    const kept = moves[cursor]?.uci === played.uci ? moves : [...moves.slice(0, cursor), played];
    setMoves(kept);
    setCursorState(cursor + 1);
    setMore(0);
    report(kept.slice(0, cursor + 1));
    return true;
  };
  const onMove = (from: string, to: string) => play(from + to) || play(`${from}${to}q`);
  const follow = (run: PositionLine['moves']) => {
    const kept = [
      ...moves.slice(0, cursor),
      ...run.map(({ san, uci, after }) => ({ san, uci, ...squares(uci), epd: after })),
    ];
    setMoves(kept);
    setCursorState(kept.length);
    setMore(0);
    report(kept);
  };

  return (
    <div
      className={cn(
        'grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]',
        // In the dialog the row is bounded, so the results scroll on their own beside a board that stays put.
        bounded && 'min-h-0 overflow-y-auto md:grid-rows-[minmax(0,1fr)] md:overflow-hidden',
      )}
    >
      <div className={cn('grid content-start gap-2', bounded && 'min-h-0 md:overflow-y-auto')}>
        <div className="min-h-6 text-sm">
          {moves.length === 0 ? (
            <span className="text-muted-foreground">Play the moves on the board.</span>
          ) : (
            <MoveRun
              moves={moves.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
              current={cursor - 1}
              onSelect={(i) => setCursor(i + 1)}
            />
          )}
        </div>
        <Board
          positions={positions}
          index={cursor}
          onIndex={setCursor}
          interactive
          onMove={onMove}
          reveal="test"
          keys
          targetRef={boardTarget}
          arrows={
            previewing ? [] : next.slice(0, 4).map((move) => ({ ...squares(move.uci), kind: 'preview' as const }))
          }
          actions={
            moves.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMoves([]);
                  setCursor(0);
                }}
              >
                Clear
              </Button>
            ) : null
          }
        />
      </div>
      <BoardTargetContext.Provider value={nearBoard}>
        <div className={cn('grid content-start gap-3', bounded && 'min-h-0 md:overflow-y-auto md:pr-2')}>
          <FilterToggle
            label="Find"
            value={kind}
            options={KIND_FILTER}
            allValue="all"
            size="sm"
            onChange={(next) => {
              setOwnKind(next);
              onKind?.(next);
            }}
          />
          {name ? <OpeningName name={name} className="text-base" /> : null}
          {next.length > 0 ? (
            <div className="grid gap-1.5">
              <p className="text-sm text-muted-foreground">Moves in the lines</p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1">
                {next.map((move) => (
                  <li key={move.uci} className="inline-flex items-baseline gap-1">
                    <MoveChip
                      ply={cursor}
                      san={move.san}
                      epd={move.after}
                      from={move.uci.slice(0, 2)}
                      to={move.uci.slice(2, 4)}
                      onSelect={() => play(move.uci)}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {move.lines} {move.lines === 1 ? 'line' : 'lines'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {cursor === 0 ? (
            <p className="text-sm text-muted-foreground">Play a move to start.</p>
          ) : hits.length === 0 ? (
            <EmptyState
              kind="not-covered"
              text="No line here: none of the openings passes through this position."
              action={
                boardHref
                  ? {
                      label: 'Open on the board',
                      href: boardHref(
                        moves.slice(0, cursor).map((move) => move.san),
                        moves.slice(0, cursor).map((move) => move.uci),
                      ),
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {hits.length} {hits.length === 1 ? 'line passes' : 'lines pass'} through this position
              </p>
              <ul className="grid gap-2">
                {shown.map((hit) => (
                  <HitRow key={hit.line.id} hit={hit} onFollow={follow} />
                ))}
              </ul>
              {shown.length < hits.length ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => setMore(more + (pageSize ?? 0))}
                >
                  Show {Math.min(pageSize ?? 0, hits.length - shown.length)} more
                </Button>
              ) : null}
            </>
          )}
        </div>
      </BoardTargetContext.Provider>
    </div>
  );
}

/**
 * Search by playing an opening's moves on a board: every line through the position, transpositions included
 * (docs/v2/components/board-search.md).
 */
export function BoardSearch(props: BoardSearchProps) {
  if (props.form !== 'dialog') return <BoardSearchBody {...props} />;
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="h-[min(calc(100dvh-2rem),54rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-4" aria-hidden />
            Search by position
          </DialogTitle>
          <DialogDescription>Play the moves; every line through the position is listed as you go.</DialogDescription>
        </DialogHeader>
        <BoardSearchBody {...props} bounded />
        <DialogFooter>
          <Button onClick={() => props.onOpenChange?.(false)}>Show the results</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
