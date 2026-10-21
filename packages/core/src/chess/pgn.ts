import { parseGame } from '@mliebelt/pgn-parser';
import { moveNumberLabel } from './notation';

/** One move of a parsed PGN line, with the comment, NAGs and drawn shapes attached to it. */
export type PgnMoveNode = {
  san: string;
  nags: number[]; // 2 = ?, 4 = ??, ...
  comment?: string;
  arrows: string[]; // 'Ge2e4'
  circles: string[]; // 'Ge4'
  /** Supplementary notes on the move, written `[%tag trap,tip]` in its comment: tip, trap, blunder or any other word. */
  tags?: string[];
  /** Alternatives to this move: each is a line that starts from the position this move was played in. */
  variations: PgnMoveNode[][];
};

/** What a move says beyond its SAN: its comment, NAGs, drawn shapes and tags. */
export type PgnNote = Pick<PgnMoveNode, 'comment' | 'nags' | 'arrows' | 'circles' | 'tags'>;

/** Whether a move carries any note. */
export const hasNote = (note: PgnNote) =>
  Boolean(note.comment) ||
  note.nags.length > 0 ||
  note.arrows.length > 0 ||
  note.circles.length > 0 ||
  (note.tags?.length ?? 0) > 0;

/** A note as the fields of a PGN move, leaving out a missing comment and tags. */
export const noteToMove = (note: PgnNote): PgnNote => ({
  ...(note.comment ? { comment: note.comment } : {}),
  nags: note.nags,
  arrows: note.arrows,
  circles: note.circles,
  ...(note.tags ? { tags: note.tags } : {}),
});

export type PgnGame = {
  tags: Record<string, string>;
  moves: PgnMoveNode[];
};

type ParserMove = ReturnType<typeof parseGame>['moves'][number];

function toNode(move: ParserMove): PgnMoveNode {
  const diag = move.commentDiag;
  const comment = (diag?.comment ?? move.commentAfter ?? '').replace(/\s+/g, ' ').trim();
  const tags = String((diag as { tag?: unknown } | undefined)?.tag ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return {
    san: move.notation.notation,
    nags: (move.nag ?? []).map((nag) => Number(nag.slice(1))),
    ...(comment ? { comment } : {}),
    arrows: [...(diag?.colorArrows ?? [])],
    circles: [...(diag?.colorFields ?? [])],
    ...(tags.length ? { tags } : {}),
    variations: (move.variations ?? []).map((variation) => variation.map(toNode)),
  };
}

/** Parses one game. Throws an Error naming `source` when the PGN is malformed. */
export function parsePgn(text: string, source = 'pgn'): PgnGame {
  let game: ReturnType<typeof parseGame>;
  try {
    game = parseGame(text);
  } catch (error) {
    throw new Error(`${source}: cannot parse PGN: ${error instanceof Error ? error.message : String(error)}`);
  }
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(game.tags ?? {})) {
    if (key === 'messages' || key === 'Result') continue; // parser additions, not part of the file
    tags[key] = String(value);
  }
  return { tags, moves: game.moves.map(toNode) };
}

function formatComment(node: PgnMoveNode): string {
  const parts = [node.comment ?? ''];
  if (node.arrows.length) parts.push(`[%cal ${node.arrows.join(',')}]`);
  if (node.circles.length) parts.push(`[%csl ${node.circles.join(',')}]`);
  if (node.tags?.length) parts.push(`[%tag ${node.tags.join(',')}]`);
  return `{ ${parts.filter(Boolean).join(' ')} }`;
}

function writeLine(moves: PgnMoveNode[], startPly: number): string {
  const out: string[] = [];
  let needNumber = true;
  moves.forEach((node, index) => {
    const ply = startPly + index;
    if (ply % 2 === 0 || needNumber) out.push(moveNumberLabel(ply));
    out.push(node.san);
    for (const nag of node.nags) out.push(`$${nag}`);
    const hasComment =
      Boolean(node.comment) || node.arrows.length > 0 || node.circles.length > 0 || (node.tags?.length ?? 0) > 0;
    if (hasComment) out.push(formatComment(node));
    for (const variation of node.variations) out.push(`( ${writeLine(variation, ply)} )`);
    needNumber = hasComment || node.variations.length > 0;
  });
  return out.join(' ');
}

/**
 * Writes a game back to PGN text. Parsing the result gives the same moves, comments, NAGs and shapes. `startPly`
 * numbers the moves of a game that begins later on (a book chapter): 7 starts with "4... ".
 */
export function writePgn(game: PgnGame, startPly = 0): string {
  const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const header = Object.entries(game.tags).map(([key, value]) => `[${key} "${escape(value)}"]`);
  return `${header.join('\n')}\n\n${writeLine(game.moves, startPly)} *\n`;
}
