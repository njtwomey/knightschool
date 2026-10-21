import { playSan } from '../chess/chess';
import { parsePgn, writePgn, type PgnGame, type PgnMoveNode } from '../chess/pgn';
import type { LineKind, Side, TrapKind } from '../schema/content';

/**
 * Editing a chapter in the app: a chapter is a `PgnGame` (headers and its own moves, as in a content/tree file), and
 * these functions return a changed copy. The editor works on the chapter's main line; side variations already in the
 * PGN are kept as they are.
 */

/** Supplementary tags offered for a move: shown while studying, never asked. Any other word is allowed too. */
export const MOVE_TAGS = ['tip', 'trap', 'blunder'] as const;

const moveText = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'}${san}`;
const bare = (san: string) => san.replace(/[+#!?]+$/, '');
/** The side to move after `ply` moves from the start. */
const sideAt = (ply: number): Side => (ply % 2 === 0 ? 'white' : 'black');

export type NewChapter = {
  title: string;
  /** The opening it belongs to, for [Opening]. */
  opening: string;
  eco: string;
  side: Side;
  kind: LineKind | TrapKind;
  /** [Start], when the chapter branches from another (`startHeader`). */
  start?: string;
};

/** The headers a new chapter needs to build, with plain defaults for the tags the author has not chosen yet. */
export function newChapter(input: NewChapter): PgnGame {
  return {
    tags: {
      Event: 'Knight School',
      Opening: input.opening,
      Variation: input.title,
      ECO: /^[A-E]\d\d$/.test(input.eco) ? input.eco : 'A00',
      Character: 'solid',
      Risk: 'low',
      EarlyMate: 'none',
      Tricks: 'none',
      For: input.side,
      Kind: input.kind,
      Opponent: '',
      ...(input.start ? { Start: input.start } : {}),
    },
    moves: [],
  };
}

/** The PGN text of a chapter whose own moves begin after `startPly` moves. */
export const chapterText = (game: PgnGame, startPly: number) => writePgn(game, startPly);

/** Reads a chapter's PGN text. */
export const readChapter = (pgn: string, source = 'chapter') => parsePgn(pgn, source);

/** Plays `san` at the end of the chapter's main line, from `fromEpd` (the position there). Throws if it is illegal. */
export function appendMove(game: PgnGame, fromEpd: string, san: string): PgnGame {
  const played = playSan(fromEpd, san);
  const move: PgnMoveNode = { san: played.move.san, nags: [], arrows: [], circles: [], variations: [] };
  return { ...game, moves: [...game.moves, move] };
}

/** Keeps the first `count` of the chapter's own moves, dropping the rest (and their variations). */
export const truncateMoves = (game: PgnGame, count: number): PgnGame => ({
  ...game,
  moves: game.moves.slice(0, Math.max(0, count)),
});

/** Sets the comment and the supplementary tags of the chapter's `index`-th own move. Empty means none. */
export function setMoveNote(game: PgnGame, index: number, note: { comment: string; tags: string[] }): PgnGame {
  const comment = note.comment.replace(/\s+/g, ' ').trim();
  const tags = [...new Set(note.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].map((tag) =>
    tag.replace(/[^a-z0-9-]+/g, '-'),
  );
  return {
    ...game,
    moves: game.moves.map((move, i) => {
      if (i !== index) return move;
      const rest: PgnMoveNode = { ...move };
      delete rest.comment;
      delete rest.tags;
      return { ...rest, ...(comment ? { comment } : {}), ...(tags.length ? { tags } : {}) };
    }),
  };
}

/** Sets a header, or removes it when `value` is undefined or blank. */
export function setHeader(game: PgnGame, key: string, value: string | undefined): PgnGame {
  const tags = { ...game.tags };
  if (value === undefined || value.trim() === '') delete tags[key];
  else tags[key] = value.trim();
  return { ...game, tags };
}

/**
 * The [Start] for a branch after the move at `ply` (0-based, counted from the start of the game) of the chapter
 * `ownerId`, whose own moves begin at `ownerStartPly`. Just that move when the chapter writes it once at that ply;
 * otherwise every move of the chapter up to it, so it is never ambiguous.
 */
export function startHeader(owner: PgnGame, ownerId: string, ownerStartPly: number, ply: number): string {
  const index = ply - ownerStartPly;
  const target = owner.moves[index];
  if (!target) throw new Error(`"${ownerId}" has no move at ply ${ply + 1}`);
  let count = 0;
  const walk = (moves: PgnMoveNode[], from: number) =>
    moves.forEach((move, i) => {
      if (from + i === ply && bare(move.san) === bare(target.san)) count++;
      for (const variation of move.variations) walk(variation, from + i);
    });
  walk(owner.moves, ownerStartPly);
  const moves = count === 1 ? [index] : owner.moves.slice(0, index + 1).map((_, i) => i);
  const text = moves
    .map((i, n) => {
      const at = ownerStartPly + i;
      const san = bare(owner.moves[i]!.san);
      return n === 0 ? moveText(at, san) : at % 2 === 0 ? `${at / 2 + 1}.${san}` : san;
    })
    .join(' ');
  return `${ownerId} ${text}`;
}

/**
 * What the opponent does to reach a line, for [Opponent]: the line's first move when the opponent makes it ("4...d6"),
 * else the move before the line, else the opponent's first move in it. `sans` is the whole line from the start and its
 * own moves begin at `startPly`.
 */
export function opponentMove(sans: string[], startPly: number, side: Side): string {
  const theirs = (ply: number) => sideAt(ply) !== side;
  if (sans[startPly] && theirs(startPly)) return moveText(startPly, sans[startPly]!);
  if (startPly > 0 && theirs(startPly - 1)) return moveText(startPly - 1, sans[startPly - 1]!);
  const first = sans.findIndex((_, ply) => ply >= startPly && theirs(ply));
  return first >= 0 ? moveText(first, sans[first]!) : 'any move';
}
