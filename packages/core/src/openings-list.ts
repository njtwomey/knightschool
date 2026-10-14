import { fenToEpd } from './epd';
import { Chess } from 'chess.js';

export type NamedPosition = { eco: string; name: string };

/**
 * Parses a lichess-org/chess-openings TSV (eco, name, pgn, and optionally uci and epd columns) into a lookup by EPD.
 * Where the file has no epd column the position is found by replaying the pgn.
 */
export function parseOpeningsTsv(tsv: string): Map<string, NamedPosition> {
  const [header, ...rows] = tsv.trim().split(/\r?\n/);
  const columns = header!.split('\t');
  const col = (name: string) => columns.indexOf(name);
  const [eco, name, pgn, epd] = [col('eco'), col('name'), col('pgn'), col('epd')];
  if (eco < 0 || name < 0 || (pgn < 0 && epd < 0))
    throw new Error('openings TSV needs eco, name and pgn or epd columns');
  const index = new Map<string, NamedPosition>();
  for (const row of rows) {
    const cells = row.split('\t');
    let key: string;
    if (epd >= 0 && cells[epd]) key = cells[epd]!;
    else {
      const chess = new Chess();
      chess.loadPgn(cells[pgn]!);
      key = fenToEpd(chess.fen());
    }
    index.set(key, { eco: cells[eco]!, name: cells[name]! });
  }
  return index;
}

/** Sets `name` on every position the list knows. Returns a new content object. */
export function applyNames<T extends { nodes: Record<string, { name?: string }> }>(
  content: T,
  names: ReadonlyMap<string, NamedPosition>,
): T {
  const nodes = Object.fromEntries(
    Object.entries(content.nodes).map(([epd, node]) => {
      const found = names.get(epd);
      return [epd, found ? { ...node, name: found.name } : node];
    }),
  );
  return { ...content, nodes };
}
