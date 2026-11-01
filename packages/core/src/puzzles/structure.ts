/**
 * The pawns of a position, as the board part of a FEN with every other piece removed:
 * `8/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/8`. Two positions with the same key have the same pawn structure. Takes an EPD or a
 * FEN (only the board is read).
 */
export function pawnStructure(epd: string): string {
  const board = epd.trim().split(/\s+/)[0] ?? '';
  return board
    .split('/')
    .map((rank) => {
      let out = '';
      let empty = 0;
      for (const char of rank) {
        if (char >= '1' && char <= '8') empty += Number(char);
        else if (char === 'p' || char === 'P') {
          if (empty) out += String(empty);
          out += char;
          empty = 0;
        } else empty += 1;
      }
      return empty ? out + String(empty) : out;
    })
    .join('/');
}

/** The squares holding pawns in a structure key, as `Pe4`, `pe5`, ... */
export function pawnSquares(structure: string): string[] {
  const squares: string[] = [];
  structure.split('/').forEach((rank, index) => {
    let file = 0;
    for (const char of rank) {
      if (char >= '1' && char <= '8') file += Number(char);
      else {
        squares.push(`${char}${'abcdefgh'[file]}${8 - index}`);
        file += 1;
      }
    }
  });
  return squares;
}

/** How many pawns two structures do not share (each side's extra pawns counted): 0 is the same structure. */
export function structureDistance(a: string, b: string): number {
  const left = new Set(pawnSquares(a));
  const right = new Set(pawnSquares(b));
  let differ = 0;
  for (const square of left) if (!right.has(square)) differ += 1;
  for (const square of right) if (!left.has(square)) differ += 1;
  return differ;
}
