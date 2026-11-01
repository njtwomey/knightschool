import { parse } from '@mliebelt/pgn-parser';
import { isWrongNag, noteFrom, type Note } from './note';

export type SourceMove = { san: string; note?: Note; refutations: SourceMove[][] };
export type LineHeaders = { for: string; kind: string; start?: string; name?: string };
export type LineSource = { id: string; headers: LineHeaders; moves: SourceMove[] };

type ParsedMove = {
  notation: { notation: string };
  nag?: string[] | null;
  commentDiag?: Record<string, unknown> | null;
  variations?: ParsedMove[][];
};

/**
 * One line file: standard PGN with the headers For, Kind, Start and Name (docs/v2/schemas/content.md). A bracketed
 * variation must start with a move marked ? or ?? (a refutation); a side line is a line file of its own.
 */
export function readLine(id: string, text: string): LineSource {
  let game: { tags?: Record<string, unknown>; moves: ParsedMove[] };
  try {
    game = parse(text, { startRule: 'game' }) as unknown as typeof game;
  } catch (error) {
    throw new Error(`${id}: the PGN does not read: ${(error as Error).message.split('\n')[0]}`);
  }
  const tag = (name: string) => {
    const value = game.tags?.[name];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };
  const toMoves = (moves: ParsedMove[], where: string): SourceMove[] =>
    moves.map((move) => {
      const san = move.notation.notation;
      const refutations = (move.variations ?? []).map((variation) => {
        const first = variation[0];
        const nag = noteFrom(first?.commentDiag, first?.nag)?.nag;
        if (!first || !isWrongNag(nag)) {
          throw new Error(
            `${id}: the variation at ${where} ${san} does not start with a move marked ? or ??. Write a side line as a line file of its own with [Start].`,
          );
        }
        return toMoves(variation, `${where} (refutation)`);
      });
      return { san, note: noteFrom(move.commentDiag, move.nag), refutations };
    });
  const headers: LineHeaders = { for: tag('For') ?? '', kind: tag('Kind') ?? '' };
  const start = tag('Start');
  const name = tag('Name');
  if (start) headers.start = start;
  if (name) headers.name = name;
  return { id, headers, moves: toMoves(game.moves ?? [], 'move') };
}
