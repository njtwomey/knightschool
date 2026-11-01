import { numberedMove } from '@knightschool/core';
import { commentText, countMarks, readPgn, walkGame, type WalkedLine } from './pgn-read';
import type { Problem } from './problems-list';

/** One game or study chapter, and what it will become. */
export type FoundRow = {
  id: string;
  name: string;
  /** Plies of the main moves that can be imported. */
  plies: number;
  lines: WalkedLine[];
  counts: { lines: number; refutations: number; comments: number; marks: number; symbols: number };
  problems: Problem[];
  /** Where the main moves leave a line already written, said in words. */
  joins?: string;
};

/** Reads a PGN text into rows, with their problems. */
export function findRows(
  text: string,
  existingComment?: (before: string, uci: string) => string | null,
  joinsAt?: (ucis: string[]) => string | null,
): FoundRow[] {
  return readPgn(text).map((game, index) => {
    const id = `game-${index}`;
    const name =
      game.headers.ChapterName ??
      (game.headers.Event?.includes(':')
        ? game.headers.Event.split(':').slice(1).join(':').trim()
        : game.headers.Event) ??
      `Game ${index + 1}`;
    const { lines } = walkGame(game);
    const main = lines.find((line) => line.kind === 'main')!;
    const all = lines.flatMap((line) => line.moves);
    const problems: Problem[] = [];
    if (game.headers.FEN && game.headers.SetUp !== '0') {
      problems.push({
        id: `${id}-start`,
        level: 'warning',
        about: { itemId: id, kind: 'line', name },
        what: 'starts from a set-up position, not the usual start.',
        fix: 'Lines are written from the start; it imports, but no opening reaches it yet.',
      });
    }
    for (const line of lines) {
      if (!line.illegal) continue;
      const stop = line.moves[line.moves.length - 1];
      problems.push({
        id: `${id}-illegal-${line.startPly}-${line.illegal.ply}`,
        level: 'blocking',
        about: { itemId: id, kind: 'line', name: line.kind === 'main' ? name : `${name}, side line` },
        what: `move ${numberedMove(line.illegal.ply, line.illegal.san)} is not legal; ${stop ? `it stops at ${numberedMove(stop.ply, stop.san)}` : 'nothing before it imports'}.`,
        fix: 'Ticked, it imports up to that move.',
      });
    }
    for (const move of all) {
      const existing = move.comment && existingComment?.(move.before, move.uci);
      if (!existing) continue;
      problems.push({
        id: `${id}-clash-${move.ply}-${move.uci}`,
        level: 'warning',
        about: { itemId: id, kind: 'move', name, move: { ply: move.ply, san: move.san, epd: move.epd } },
        what: `already has a comment: “${existing}”`,
        fix: `The existing one stays. The import’s: “${commentText(move.comment)}”`,
      });
    }
    return {
      id,
      name,
      plies: main.moves.length,
      lines,
      counts: {
        lines: lines.filter((line) => line.kind !== 'refutation' && line.moves.length > 0).length,
        refutations: lines.filter((line) => line.kind === 'refutation' && line.moves.length > 0).length,
        comments: all.filter((move) => commentText(move.comment)).length,
        marks: all.reduce((sum, move) => sum + countMarks(move.comment), 0),
        symbols: all.reduce((sum, move) => sum + move.nags.length, 0),
      },
      problems,
      joins: joinsAt?.(main.moves.map((move) => move.uci)) ?? undefined,
    };
  });
}
