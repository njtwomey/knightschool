import { numberedLine, numberedMove, playMove, START_EPD, type Played } from '@knightschool/core';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import { MoveRun } from '@/components/chess/move-run';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { FilterToggle } from './filter-toggle';
import { RowLink } from './sortable-table';

/** A line the board search can find: its moves with the position before and after each. */
export type PositionLine = {
  id: string;
  name: string;
  opening: string;
  kind: string;
  moves: { san: string; uci: string; before: string; after: string }[];
  /** The line's address at a ply (its board at that move). */
  href: (ply: number) => string;
};

export type FindKind = 'all' | 'lines' | 'traps';

const KIND_FILTER = [
  { value: 'all' as const, label: 'Lines and traps' },
  { value: 'lines' as const, label: 'Lines' },
  { value: 'traps' as const, label: 'Traps' },
];

const isTrap = (kind: string) => kind.startsWith('trap');

type Hit = { line: PositionLine; ply: number; transposed: boolean };

/** Every position of every line, to the lines through it: positions are keyed by EPD, so transpositions match. */
function indexLines(lines: readonly PositionLine[]) {
  const index = new Map<string, { line: PositionLine; ply: number }[]>();
  for (const line of lines) {
    line.moves.forEach((move, i) => {
      for (const [epd, ply] of i === 0
        ? ([
            [move.before, 0],
            [move.after, 1],
          ] as const)
        : ([[move.after, i + 1]] as const)) {
        const hits = index.get(epd) ?? [];
        if (!hits.some((hit) => hit.line.id === line.id)) hits.push({ line, ply });
        index.set(epd, hits);
      }
    });
  }
  return index;
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
  /** Called after each change of moves, for the address hash (`bm`). */
  onMoves?: (sans: string[]) => void;
  /** "Open on the board", when no line passes through. */
  boardHref?: (sans: string[]) => string;
};

function BoardSearchBody({ lines, start = [], kind: controlledKind, onKind, onMoves, boardHref }: BoardSearchProps) {
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
  const [cursor, setCursor] = useState(moves.length);
  const [ownKind, setOwnKind] = useState<FindKind>('all');
  const kind = controlledKind ?? ownKind;
  const epd = cursor === 0 ? START_EPD : moves[cursor - 1]!.epd;
  const sansTo = (n: number) => moves.slice(0, n).map((move) => move.san);

  const positions: BoardPosition[] = [
    { epd: START_EPD },
    ...moves.map((move) => ({ epd: move.epd, lastMove: { from: move.from, to: move.to } })),
  ];

  const hits: Hit[] = (index.get(epd) ?? [])
    .filter(({ line }) => kind === 'all' || (kind === 'traps') === isTrap(line.kind))
    .map(({ line, ply }) => ({
      line,
      ply,
      transposed: ply !== cursor || line.moves.slice(0, ply).some((move, i) => move.uci !== moves[i]?.uci),
    }));

  const onMove = (from: string, to: string) => {
    const next = playMove(epd, from + to) ?? playMove(epd, `${from}${to}q`);
    if (!next) return false;
    const kept = [...moves.slice(0, cursor), next];
    setMoves(kept);
    setCursor(kept.length);
    onMoves?.(kept.map((move) => move.san));
    return true;
  };

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
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
          actions={
            moves.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMoves([]);
                  setCursor(0);
                  onMoves?.([]);
                }}
              >
                Clear
              </Button>
            ) : null
          }
        />
      </div>
      <div className="grid content-start gap-3">
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
        {hits.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No line here</EmptyTitle>
              <EmptyDescription>
                {cursor === 0 ? 'Play a move to start.' : 'None of the openings passes through this position.'}
              </EmptyDescription>
            </EmptyHeader>
            {boardHref && cursor > 0 ? (
              <Button variant="outline" asChild>
                <a href={boardHref(sansTo(cursor))}>Open on the board</a>
              </Button>
            ) : null}
          </Empty>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {hits.length} {hits.length === 1 ? 'line passes' : 'lines pass'} through this position
            </p>
            <ul className="grid gap-2">
              {hits.map(({ line, ply, transposed }) => (
                <li
                  key={line.id}
                  className="relative grid gap-1 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <RowLink href={line.href(ply)}>{line.name}</RowLink>
                    <Badge variant="outline" className={cn(isTrap(line.kind) && 'text-kind-trap-avoid')}>
                      {isTrap(line.kind) ? 'trap' : line.kind}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {line.opening}
                    {ply > 0 ? `, at ${numberedMove(ply - 1, line.moves[ply - 1]!.san)}` : ', from the start'}
                    {ply < line.moves.length ? `; ${line.moves.length - ply} moves to go` : '; where the line ends'}
                  </p>
                  {transposed && ply > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Reached by another move order: the line plays{' '}
                      <span className="font-mono">
                        {numberedLine(line.moves.slice(0, ply).map((move) => move.san))}
                      </span>
                      .
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="size-4" aria-hidden />
            Search by position
          </DialogTitle>
          <DialogDescription>Play the moves; every line through the position is listed as you go.</DialogDescription>
        </DialogHeader>
        <BoardSearchBody {...props} />
      </DialogContent>
    </Dialog>
  );
}
