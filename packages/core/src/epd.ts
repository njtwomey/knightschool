/**
 * Positions are keyed by EPD: the first four FEN fields (placement, side to move,
 * castling, en passant), without the halfmove and fullmove counters. Two move orders
 * that reach the same position therefore share one key.
 */
export function fenToEpd(fen: string): string {
  const fields = fen.trim().split(/\s+/);
  if (fields.length < 4) {
    throw new Error(`Not a FEN: "${fen}"`);
  }
  return fields.slice(0, 4).join(' ');
}

/** Turns an EPD back into a FEN that chess.js accepts, with counters reset. */
export function epdToFen(epd: string, halfmove = 0, fullmove = 1): string {
  return `${fenToEpd(epd)} ${halfmove} ${fullmove}`;
}

export const START_EPD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
