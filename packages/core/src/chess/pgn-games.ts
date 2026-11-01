import { parse } from '@mliebelt/pgn-parser';

/** One game of a PGN file: its headers and the SAN moves of its main line (comments, NAGs and variations left out). */
export type PgnGame = { tags: Record<string, string>; sans: string[] };

type ParsedGame = { tags?: Record<string, unknown>; moves?: { notation: { notation: string } }[] };

/**
 * Every game in a PGN text, such as a Lichess game export, read with the same parser as the line files. Throws when the
 * text does not parse.
 */
export function readPgnGames(text: string): PgnGame[] {
  if (!text.trim()) return [];
  // Castling written with zeros ("0-0"), as some sites export it, reads as the standard "O-O".
  const standard = text.replace(/\b0-0-0\b/g, 'O-O-O').replace(/\b0-0\b/g, 'O-O');
  const games = parse(standard, { startRule: 'games' }) as unknown as ParsedGame[];
  return games.map((game) => ({
    tags: Object.fromEntries(
      Object.entries(game.tags ?? {}).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])),
    ),
    sans: (game.moves ?? []).map((move) => move.notation.notation),
  }));
}
