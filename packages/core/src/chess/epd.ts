/** A position without its move counters: board, side to move, castling, en passant. Transpositions share one EPD. */
export const START_EPD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

export const fenToEpd = (fen: string): string => fen.trim().split(/\s+/).slice(0, 4).join(' ');

export const epdToFen = (epd: string, halfmove = 0, fullmove = 1): string => `${epd} ${halfmove} ${fullmove}`;

export type Side = 'white' | 'black';

export const sideToMove = (epd: string): Side => (epd.split(' ')[1] === 'b' ? 'black' : 'white');
