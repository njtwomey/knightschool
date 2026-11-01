import { moveNumber, type Grade } from '@knightschool/core';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { MoveChip } from './move-chip';

export type TableMove = { san: string; uci: string; after: string; grade?: Grade };

/** The moves so far, two to a row, bound to the board: click a move to go there; the current one marked. */
export function MoveTable({
  moves,
  current,
  onSelect,
  side,
  firstPly = 0,
}: {
  moves: TableMove[];
  /** The index of the move shown (the last move played), or -1 at the start. */
  current: number;
  onSelect?: (index: number) => void;
  side?: 'white' | 'black';
  firstPly?: number;
}) {
  const rows: { number: number; white?: number; black?: number }[] = [];
  moves.forEach((_, i) => {
    const ply = firstPly + i;
    const number = moveNumber(ply);
    if (ply % 2 === 0 || rows.length === 0) rows.push({ number });
    rows[rows.length - 1]![ply % 2 === 0 ? 'white' : 'black'] = i;
  });
  const chip = (i: number | undefined) => {
    if (i === undefined) return null;
    const move = moves[i]!;
    const ply = firstPly + i;
    return (
      <MoveChip
        ply={ply}
        san={move.san}
        epd={move.after}
        from={move.uci.slice(0, 2)}
        to={move.uci.slice(2, 4)}
        grade={move.grade}
        mine={side ? (ply % 2 === 0) === (side === 'white') : false}
        numbered="never"
        current={current === i}
        preview={false}
        onSelect={onSelect ? () => onSelect(i) : undefined}
      />
    );
  };
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <Table>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.number}>
              <TableCell className="w-10 py-1 text-right text-xs text-muted-foreground tabular-nums">
                {row.number}.
              </TableCell>
              <TableCell className="py-1">{chip(row.white)}</TableCell>
              <TableCell className="py-1">{chip(row.black)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
