import type { EngineLine } from './types';

export type Info = { depth: number; multipv: number; line: EngineLine };

/** `info depth 12 multipv 2 score cp -31 ... pv e2e4 e7e5`. Returns null for lines that carry no score and pv. */
export function parseInfo(text: string, sideToMove: 'white' | 'black'): Info | null {
  const words = text.trim().split(/\s+/);
  if (words[0] !== 'info') return null;
  const at = (key: string) => words.indexOf(key);
  const scoreAt = at('score');
  const pvAt = at('pv');
  const depth = Number(words[at('depth') + 1]);
  if (scoreAt < 0 || pvAt < 0 || !Number.isFinite(depth) || at('depth') < 0) return null;
  // Bound scores (lowerbound / upperbound) are partial results of a search window: skip them.
  if (words.includes('lowerbound') || words.includes('upperbound')) return null;

  const kind = words[scoreAt + 1];
  const raw = Number(words[scoreAt + 2]);
  if (!Number.isFinite(raw) || (kind !== 'cp' && kind !== 'mate')) return null;
  // The engine reports from the side to move; everything above this module wants White's point of view.
  const signed = sideToMove === 'white' ? raw : -raw;
  const multipv = at('multipv') >= 0 ? Number(words[at('multipv') + 1]) : 1;
  return {
    depth,
    multipv,
    line: { ...(kind === 'cp' ? { cp: signed } : { mate: signed }), pv: words.slice(pvAt + 1) },
  };
}

export function parseBestMove(text: string): string | null {
  const match = /^bestmove\s+(\S+)/.exec(text.trim());
  return match ? match[1]! : null;
}

export const sideToMove = (epd: string): 'white' | 'black' => (epd.split(' ')[1] === 'w' ? 'white' : 'black');

/** "+0.31", "-1.20", "M3" for a mate in 3 for White, "-M2" for a mate in 2 for Black. White's point of view. */
export function formatScore(line: { cp?: number; mate?: number }): string {
  if (line.mate !== undefined) return `${line.mate < 0 ? '-' : ''}M${Math.abs(line.mate)}`;
  const pawns = (line.cp ?? 0) / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

/** White's share of the bar, 0 to 1: 0.5 when level, flattening towards 0 and 1 for big advantages, 1 or 0 for mate. */
export function whiteShare(line: { cp?: number; mate?: number }): number {
  if (line.mate !== undefined) return line.mate < 0 ? 0 : 1;
  return 1 / (1 + Math.exp(-(line.cp ?? 0) / 400));
}
