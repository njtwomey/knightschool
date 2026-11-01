import type { Score } from '@knightschool/core';

export type Info = { depth: number; multipv: number; score: Score; pv: string[] };

type Side = 'white' | 'black';

export const sideToMove = (epd: string): Side => (epd.split(' ')[1] === 'b' ? 'black' : 'white');

const other = (side: Side): Side => (side === 'white' ? 'black' : 'white');

/**
 * `info depth 12 multipv 2 score cp -31 ... pv e2e4 e7e5`, with the score turned to White's point of view (UCI scores
 * are the side to move's). Null for lines without a score, and for bound scores, which are only a search window.
 *
 * A position already over comes as `depth 0` with no moves: `score mate 0` is checkmate, the side to move lost;
 * `score cp 0` is stalemate.
 */
export function parseInfo(text: string, toMove: Side): Info | null {
  const words = text.trim().split(/\s+/);
  if (words[0] !== 'info') return null;
  const at = (key: string) => words.indexOf(key);
  const depthAt = at('depth');
  const scoreAt = at('score');
  if (depthAt < 0 || scoreAt < 0) return null;
  if (words.includes('lowerbound') || words.includes('upperbound')) return null;
  const depth = Number(words[depthAt + 1]);
  const kind = words[scoreAt + 1];
  const raw = Number(words[scoreAt + 2]);
  if (!Number.isInteger(depth) || !Number.isFinite(raw) || (kind !== 'cp' && kind !== 'mate')) return null;
  const multipvAt = at('multipv');
  const multipv = multipvAt >= 0 ? Number(words[multipvAt + 1]) : 1;
  const pvAt = at('pv');
  const pv = pvAt >= 0 ? words.slice(pvAt + 1) : [];

  if (pv.length === 0) {
    if (depth !== 0) return null;
    const score: Score = kind === 'mate' && raw === 0 ? { over: other(toMove) } : { over: 'draw' };
    return { depth, multipv, score, pv };
  }
  const signed = toMove === 'white' ? raw : -raw;
  // `+ 0` turns a -0 into 0, so a level score reads the same from either side.
  const score: Score = kind === 'cp' ? { cp: signed + 0 } : { mate: signed + 0 };
  return { depth, multipv, score, pv };
}

/** `bestmove e2e4 ponder e7e5` gives e2e4; `bestmove (none)` (no legal move) gives null; any other line, undefined. */
export function parseBestMove(text: string): string | null | undefined {
  const match = /^bestmove\s+(\S+)/.exec(text.trim());
  if (!match) return undefined;
  return match[1] === '(none)' ? null : match[1]!;
}
