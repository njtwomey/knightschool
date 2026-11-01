import { fenToEpd, playMove, START_EPD, type Played } from '@knightschool/core';

/*
 * A small PGN reader for the import preview: headers, moves, comments, NAGs and side variations, checked move by move.
 * Enough to say what an import will become before anything is saved; the build's own reader does the real work when
 * the lines are written.
 */

export type PgnMove = { san: string; nags: number[]; comment?: string; variations: PgnMove[][] };
export type PgnGame = { headers: Record<string, string>; moves: PgnMove[] };

const SUFFIX_NAG: Record<string, number> = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };
/** The NAGs that mark a wrong move: `?`, `??`, `?!`. */
export const WRONG_NAGS = new Set([2, 4, 6]);

function tokens(text: string): string[] {
  const out: string[] = [];
  const re = /\{[^}]*\}|;[^\n]*|\(|\)|\$\d+|[^\s(){};]+/g;
  for (const match of text.matchAll(re)) out.push(match[0]);
  return out;
}

function parseMoves(list: string[], at: { i: number }): PgnMove[] {
  const moves: PgnMove[] = [];
  while (at.i < list.length) {
    const token = list[at.i]!;
    if (token === ')') {
      at.i++;
      break;
    }
    at.i++;
    if (token === '(') {
      const variation = parseMoves(list, at);
      moves[moves.length - 1]?.variations.push(variation);
    } else if (token.startsWith('{')) {
      const last = moves[moves.length - 1];
      const comment = token.slice(1, -1).trim();
      if (last) last.comment = last.comment ? `${last.comment} ${comment}` : comment;
    } else if (token.startsWith(';')) {
      continue;
    } else if (token.startsWith('$')) {
      moves[moves.length - 1]?.nags.push(Number(token.slice(1)));
    } else if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)) {
      continue;
    } else {
      const san = token.replace(/^\d+\.+/, '');
      if (!san) continue;
      const suffix = /([!?]{1,2})$/.exec(san)?.[1];
      moves.push({
        san: suffix ? san.slice(0, -suffix.length) : san,
        nags: suffix && SUFFIX_NAG[suffix] ? [SUFFIX_NAG[suffix]] : [],
        variations: [],
      });
    }
  }
  return moves;
}

/** Splits a PGN text into games. */
export function readPgn(text: string): PgnGame[] {
  const games: PgnGame[] = [];
  const chunks = text.replace(/\r/g, '').split(/\n\s*\n(?=\[)/);
  for (const chunk of chunks) {
    const headers: Record<string, string> = {};
    const body = chunk.replace(/^\s*\[(\w+)\s+"([^"]*)"\]\s*$/gm, (_, key: string, value: string) => {
      headers[key] = value;
      return '';
    });
    const moves = parseMoves(tokens(body), { i: 0 });
    if (moves.length > 0 || Object.keys(headers).length > 0) games.push({ headers, moves });
  }
  return games;
}

export type WalkedMove = Played & { ply: number; before: string; nags: number[]; comment?: string };

export type WalkedLine = {
  /** Where the line leaves the one it branches from (0 for the main moves). */
  startPly: number;
  moves: WalkedMove[];
  /** The first move that is not legal, if any; the line stops before it. */
  illegal?: { ply: number; san: string };
  kind: 'main' | 'branch' | 'refutation';
};

/** Plays a game's moves and every side variation, stopping each at its first illegal move. */
export function walkGame(game: PgnGame): { start: string; lines: WalkedLine[] } {
  const start = game.headers.FEN ? fenToEpd(game.headers.FEN) : START_EPD;
  const firstPly = game.headers.FEN ? (start.split(' ')[1] === 'b' ? 1 : 0) : 0;
  const lines: WalkedLine[] = [];
  const walk = (moves: PgnMove[], from: string, ply: number, kind: WalkedLine['kind']) => {
    const line: WalkedLine = { startPly: ply, moves: [], kind };
    lines.push(line);
    let at = from;
    for (const [i, move] of moves.entries()) {
      for (const variation of move.variations) {
        const first = variation[0];
        const wrong = first?.nags.some((nag) => WRONG_NAGS.has(nag)) ?? false;
        walk(variation, at, ply + i, wrong ? 'refutation' : 'branch');
      }
      const played = playMove(at, move.san);
      if (!played) {
        line.illegal = { ply: ply + i, san: move.san };
        break;
      }
      line.moves.push({ ...played, ply: ply + i, before: at, nags: move.nags, comment: move.comment });
      at = played.epd;
    }
  };
  walk(game.moves, start, firstPly, 'main');
  // Keep the main moves first, then the side lines in the order they were met.
  return { start, lines };
}

/** The marks written in a comment, `[%cal Gc4f7,Rd8h4]` and `[%csl Yd5]`. */
export function countMarks(comment: string | undefined): number {
  if (!comment) return 0;
  let count = 0;
  for (const match of comment.matchAll(/\[%(?:cal|csl)\s+([^\]]*)\]/g))
    count += match[1]!.split(',').filter(Boolean).length;
  return count;
}

/** A comment without its mark commands, as text. */
export const commentText = (comment: string | undefined) =>
  (comment ?? '')
    .replace(/\[%[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
