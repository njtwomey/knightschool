import { formatPawns, type Grade, numberedMove } from '@knightschool/core';
import { Lightbulb, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VerdictBadge } from './verdict-badge';

export type Try = {
  ply: number;
  /** The line's move, the one asked for. */
  asked: string;
  played: string;
  grade: Grade;
  /** Centipawns lost against the line's move; null while the judgement is still coming. */
  costCp: number | null;
  /** Drop in winning chances, 0 to 2. */
  drop: number | null;
  ms: number;
  hint?: boolean;
  shown?: boolean;
};

/** Every guess in a session, one row per try: what was asked, what you played, its grade, what it cost, how long. */
export function TriesTable({ tries, onSelect }: { tries: Try[]; onSelect?: (index: number) => void }) {
  if (tries.length === 0) {
    return <p className="text-sm text-muted-foreground">Your tries will collect here as you play.</p>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Move</TableHead>
            <TableHead>You played</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Time</TableHead>
            <TableHead className="sr-only">Help</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tries.map((attempt, i) => (
            <TableRow
              key={i}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={onSelect ? () => onSelect(i) : undefined}
            >
              <TableCell className="font-mono text-sm">{numberedMove(attempt.ply, attempt.asked)}</TableCell>
              <TableCell className="font-mono text-sm">{attempt.played}</TableCell>
              <TableCell>
                <VerdictBadge grade={attempt.grade} size="sm" />
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {attempt.costCp === null ? (
                  <span className="text-muted-foreground">…</span>
                ) : attempt.costCp === 0 ? (
                  <span className="text-muted-foreground">0</span>
                ) : (
                  `−${formatPawns(attempt.costCp, { signed: false })}`
                )}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                {(attempt.ms / 1000).toFixed(1)}s
              </TableCell>
              <TableCell className="text-muted-foreground">
                {attempt.hint ? <Lightbulb className="size-4" aria-label="Hint used" /> : null}
                {attempt.shown ? <Eye className="size-4" aria-label="Move shown" /> : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
