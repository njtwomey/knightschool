import { BookOpen, Eye, Target } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import { KindBadge, type LineKind, type Risk } from '@/components/chess/kind-badge';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun, type RunMove } from '@/components/chess/move-run';
import type { ProgressCounts } from '@/components/progress/counts';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Hint } from '@/components/shared/hint';
import { ABOVE_ROW_LINK, IconAction } from '@/components/shared/icon-action';
import { cn } from '@/lib/utils';
import type { Side, Thumb } from './types';

/** One line as a list shows it. A line has no state of its own: only the share of its moves the learner knows. */
export type LineData = {
  id: string;
  name: string;
  /** The opening it is seen in, when the list mixes openings. */
  opening?: string;
  kind: LineKind;
  /** The side the line is written for; a trap for the other side shows flipped. */
  writtenFor?: Side;
  risk?: Risk;
  /** The opponent's move that reaches it. */
  opponent?: { ply: number; move: RunMove };
  /** Its moves from where it branches, from `firstPly`. */
  moves: RunMove[];
  firstPly: number;
  /** The learner's side. */
  side: Side;
  known: ProgressCounts;
  /** The position that names it. */
  thumb: Thumb;
  /** A second answer: shown, not drilled. */
  alternative?: boolean;
  href: string;
  learnHref?: string;
  drillHref?: string;
};

export type LineColumn = 'kind' | 'opponent' | 'moves' | 'known';
const ALL_COLUMNS: LineColumn[] = ['kind', 'opponent', 'moves', 'known'];

type Shared = {
  /** Show puts the line's last position on the page's board without leaving the page. */
  onShow?: (line: LineData) => void;
  /** Moves shown before "and 6 more". */
  maxMoves?: number;
};

function KnownBar({ known, className }: { known: ProgressCounts; className?: string }) {
  const share = (n: number) => (known.total ? (n / known.total) * 100 : 0);
  const text = known.known
    ? `${known.known} of ${known.total} of your moves known${known.mastered ? `, ${known.mastered} mastered` : ''}`
    : `None of its ${known.total} moves known yet`;
  return (
    <Hint text={text}>
      <span tabIndex={0} className={cn('inline-flex items-center gap-2', ABOVE_ROW_LINK, className)} aria-label={text}>
        <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <span className="absolute inset-y-0 left-0 bg-state-known/70" style={{ width: `${share(known.known)}%` }} />
          <span
            className="absolute inset-y-0 left-0 bg-state-mastered"
            style={{ width: `${share(known.mastered)}%` }}
          />
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {known.known}/{known.total}
        </span>
      </span>
    </Hint>
  );
}

function Moves({ line, max }: { line: LineData; max: number }) {
  const shown = line.moves.slice(0, max);
  const more = line.moves.length - shown.length;
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1', ABOVE_ROW_LINK)}>
      <MoveRun moves={shown} firstPly={line.firstPly} side={line.side} orientation={line.side} />
      {more > 0 ? <span className="text-xs text-muted-foreground">and {more} more</span> : null}
    </span>
  );
}

function Actions({ line, onShow }: { line: LineData; onShow?: (line: LineData) => void }) {
  return (
    <span className="inline-flex items-center">
      {onShow ? (
        <IconAction label="Show on the board" onClick={() => onShow(line)}>
          <Eye />
        </IconAction>
      ) : null}
      {line.learnHref ? (
        <IconAction label="Learn this line" href={line.learnHref}>
          <BookOpen />
        </IconAction>
      ) : null}
      {line.drillHref && !line.alternative ? (
        <IconAction label="Drill this line" href={line.drillHref}>
          <Target />
        </IconAction>
      ) : null}
    </span>
  );
}

function Name({ line, stretched }: { line: LineData; stretched?: boolean }) {
  return (
    <span className="grid gap-0.5">
      <a
        href={line.href}
        className={cn(
          'font-medium no-underline hover:underline focus-visible:outline-none',
          stretched &&
            'after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring',
        )}
      >
        {line.name}
      </a>
      {line.opening ? <span className="text-xs text-muted-foreground">in the {line.opening}</span> : null}
      {line.alternative ? <span className="text-xs text-muted-foreground">Alternative: shown, not drilled</span> : null}
    </span>
  );
}

function Opponent({ line }: { line: LineData }) {
  if (!line.opponent) return null;
  const { ply, move } = line.opponent;
  return (
    <span className={cn('inline-flex items-baseline gap-1 text-sm text-muted-foreground', ABOVE_ROW_LINK)}>
      after
      <MoveChip
        ply={ply}
        san={move.san}
        epd={move.after}
        from={move.uci.slice(0, 2)}
        to={move.uci.slice(2, 4)}
        orientation={line.side}
      />
    </span>
  );
}

/**
 * One line in a list: name, kind, moves and what the learner knows of it, with Show, Learn and Drill
 * (docs/v2/components/line-row.md). `row` is a table row, used inside `LineTable`; `card` stands alone.
 */
export function LineRow({
  line,
  form = 'row',
  columns = ALL_COLUMNS,
  onShow,
  maxMoves,
  className,
}: { line: LineData; form?: 'row' | 'card'; columns?: LineColumn[]; className?: string } & Shared) {
  if (form === 'card') return <LineCard line={line} onShow={onShow} maxMoves={maxMoves} className={className} />;
  return (
    <TableRow className={cn('relative', className)}>
      <TableCell className="align-top whitespace-normal">
        <Name line={line} stretched />
      </TableCell>
      {columns.includes('kind') ? (
        <TableCell className="align-top">
          <span className={ABOVE_ROW_LINK}>
            <KindBadge
              kind={line.kind}
              writtenFor={line.writtenFor}
              learner={line.side}
              risk={line.risk}
              show="kind and risk"
            />
          </span>
        </TableCell>
      ) : null}
      {columns.includes('opponent') ? (
        <TableCell className="align-top">
          <Opponent line={line} />
        </TableCell>
      ) : null}
      {columns.includes('moves') ? (
        <TableCell className="align-top whitespace-normal">
          <Moves line={line} max={maxMoves ?? 8} />
        </TableCell>
      ) : null}
      {columns.includes('known') ? (
        <TableCell className="align-top">
          <KnownBar known={line.known} />
        </TableCell>
      ) : null}
      <TableCell className="text-right align-top">
        <Actions line={line} onShow={onShow} />
      </TableCell>
    </TableRow>
  );
}

const HEAD: Record<LineColumn, string> = { kind: 'Kind', opponent: 'Reached by', moves: 'Moves', known: 'Known' };

/** Lines as a table of rows; each row is a link to the line's page. */
export function LineTable({
  lines,
  columns = ALL_COLUMNS,
  onShow,
  maxMoves,
}: { lines: LineData[]; columns?: LineColumn[] } & Shared) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Line</TableHead>
          {columns.map((column) => (
            <TableHead key={column}>{HEAD[column]}</TableHead>
          ))}
          <TableHead className="w-28">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((line) => (
          <LineRow key={line.id} line={line} columns={columns} onShow={onShow} maxMoves={maxMoves} />
        ))}
      </TableBody>
    </Table>
  );
}

/** One line as a card with the board that names it (search results, "what grows from it"). */
export function LineCard({ line, onShow, maxMoves = 6, className }: { line: LineData; className?: string } & Shared) {
  return (
    <Card size="sm" className={cn('relative flex-row gap-3 px-3 transition-colors hover:bg-accent/40', className)}>
      <BoardThumb {...line.thumb} className="w-24 shrink-0 self-start" />
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Name line={line} stretched />
          <span className={ABOVE_ROW_LINK}>
            <KindBadge kind={line.kind} writtenFor={line.writtenFor} learner={line.side} risk={line.risk} />
          </span>
        </div>
        <Opponent line={line} />
        <div className="text-sm">
          <Moves line={line} max={maxMoves} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <KnownBar known={line.known} />
          <Actions line={line} onShow={onShow} />
        </div>
      </div>
    </Card>
  );
}
