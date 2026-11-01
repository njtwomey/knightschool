/**
 * Move numbers, the one way they are written: a single move has no space ("1.e4", "1...e5"); a run of moves has a
 * space after each number ("1. e4 e5 2. Nf3", "3... Nf6 4. Ng5"). `ply` counts half-moves from 0 (White's first).
 */
export const moveNumber = (ply: number): number => Math.floor(ply / 2) + 1;

export const numberedMove = (ply: number, san: string): string =>
  ply % 2 === 0 ? `${moveNumber(ply)}.${san}` : `${moveNumber(ply)}...${san}`;

export function numberedLine(sans: readonly string[], firstPly = 0): string {
  return sans
    .map((san, i) => {
      const ply = firstPly + i;
      if (ply % 2 === 0) return `${moveNumber(ply)}. ${san}`;
      return i === 0 ? `${moveNumber(ply)}... ${san}` : san;
    })
    .join(' ');
}
