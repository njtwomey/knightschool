import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

/** Moves played so far as a table of full moves, with the latest marked. For screens that show how a position was reached. */
export function MoveTable({
  sans,
  label = 'Moves so far',
  selected,
  onSelect,
}: {
  sans: string[];
  label?: string;
  /** The move being looked at, when it is not the latest. */
  selected?: number | null;
  /** Makes each move clickable; it gets the move's index. */
  onSelect?: (index: number) => void;
}) {
  const rows = Math.ceil(sans.length / 2);
  if (rows === 0) return <p className="text-sm text-muted-foreground">The game is about to begin.</p>;
  const cell = (i: number) => {
    const san = sans[i];
    if (san === undefined) return <TableCell />;
    const current = i === (selected ?? sans.length - 1);
    const text = <span className={current ? 'rounded bg-secondary px-1 font-medium' : 'px-1'}>{san}</span>;
    return (
      <TableCell className="py-1 font-mono">
        {onSelect ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-auto px-0 font-mono hover:bg-transparent hover:underline"
            onClick={() => onSelect(i)}
          >
            {text}
          </Button>
        ) : (
          text
        )}
      </TableCell>
    );
  };
  return (
    <Table aria-label={label}>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow key={row}>
            <TableCell className="w-8 py-1 font-mono text-muted-foreground">{row + 1}.</TableCell>
            {cell(row * 2)}
            {cell(row * 2 + 1)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
