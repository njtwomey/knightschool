import { gameOver, gradeOf, moveCost, sideToMove, type Grade, type Score } from '@knightschool/core';
import { siteConfig } from '@/data/site-config';
import type { BoardPosition } from '@/components/board/board';
import raw from './italian.json';

/**
 * The mocks' one example: the Italian Game for White, the Giuoco Piano main line with two side branches and the Legal
 * Mate trap, with real explorer counts (1000 to 1600, blitz and rapid), Stockfish evaluations at depth 18 and Lichess
 * puzzles from the Giuoco Piano. Taken from v1's content before it was removed.
 */
export type ExampleNote = { text?: string; arrows?: string[]; circles?: string[] };
export type ExampleMove = {
  san: string;
  uci: string;
  before: string;
  after: string;
  note?: ExampleNote;
  nag?: number[];
};
export type ExampleLine = { id: string; name: string; kind: string; variation: string; moves: ExampleMove[] };
type EngineLine = { multipv: number; cp?: number; mate?: number; pv: string[] };
type Position = {
  games: number | null;
  moves: { uci: string; san: string; games: number; white: number; draws: number; black: number }[];
};
export type ExamplePuzzle = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  popularity: number;
  plays: number;
  themes: string[];
  gameUrl: string;
  openingTags: string[];
};

type Example = {
  opening: {
    id: string;
    name: string;
    side: 'white' | 'black';
    eco: string;
    level: string;
    style: string[];
    summary: string;
    about: { idea: string; risks: string; suits: string };
    variations: { id: string; name: string; intro: string; lines: string[] }[];
  };
  lines: Record<string, ExampleLine>;
  positions: Record<string, Position>;
  evals: Record<string, { depth: number; lines: EngineLine[] }>;
  puzzles: ExamplePuzzle[];
};

export const example = raw as unknown as Example;

export const line = (id: string): ExampleLine => example.lines[id]!;
export const mainLine = line('giuoco-piano-main');

/** The engine's score of a position (its best line), from White's point of view. */
export function scoreOf(epd: string): Score | null {
  const over = gameOver(epd);
  if (over) return { over };
  const best = example.evals[epd]?.lines[0];
  if (!best) return null;
  return best.mate !== undefined ? { mate: best.mate } : { cp: best.cp ?? 0 };
}

export const engineLines = (epd: string): EngineLine[] => example.evals[epd]?.lines ?? [];

/** What players at the band play from a position, most played first. */
export const explorerMoves = (epd: string) => example.positions[epd]?.moves ?? [];
export const gamesAt = (epd: string) => example.positions[epd]?.games ?? null;

/**
 * A move played instead of the line's move, judged against it: its cost and grade, from the stored evaluations of the
 * position after each.
 */
export function judgeAgainstLine(move: ExampleMove, played: { uci: string; after: string }) {
  const lineScore = scoreOf(move.after);
  const playedScore = scoreOf(played.after);
  if (!lineScore || !playedScore) return null;
  const cost = moveCost(lineScore, playedScore, sideToMove(move.before));
  const grade: Grade = played.uci === move.uci ? 'book' : gradeOf(cost, siteConfig.judge.grades);
  return { cost, grade };
}

/** A line as board positions: the start, then after each move, with its marks, score and the next move. */
export function positionsOf(lineId: string): BoardPosition[] {
  const moves = line(lineId).moves;
  return [
    { epd: moves[0]!.before, score: scoreOf(moves[0]!.before), next: squares(moves[0]!.uci) },
    ...moves.map((move, i) => ({
      epd: move.after,
      lastMove: squares(move.uci),
      marks: move.note,
      score: scoreOf(move.after),
      next: moves[i + 1] ? squares(moves[i + 1]!.uci) : undefined,
    })),
  ];
}

export const squares = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
