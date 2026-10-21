/**
 * Move numbers, written one way everywhere: a single move as a label with no space ("1.e4", "1...e5"), a run of moves
 * with a space after each number ("1. e4 e5 2. Nf3", "3... Nf6 4. Ng5"). `ply` counts the moves played before.
 */

/** The number of the move played after `ply` plies: 1 for plies 0 and 1. */
export const moveNumber = (ply: number) => Math.floor(ply / 2) + 1;

/** "1." before a White move, "1..." before a Black one. */
export const moveNumberLabel = (ply: number) => `${moveNumber(ply)}${ply % 2 ? '...' : '.'}`;

/** "1.e4", "1...e5": a move with its number, from the plies before it. */
export const numberedMove = (ply: number, san: string) => `${moveNumberLabel(ply)}${san}`;

/** Moves as numbered text, "4. b4 Bxb4 5. c3", where the first is played after `from` plies. */
export function numberedLine(sans: readonly string[], from = 0): string {
  return sans
    .map((san, index) => (index === 0 || (from + index) % 2 === 0 ? `${moveNumberLabel(from + index)} ${san}` : san))
    .join(' ');
}
