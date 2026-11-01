import {
  bookExits,
  lineEnds,
  moveCardId,
  pickWeighted,
  playOnExercise,
  type BookExit,
  type Exercise,
  type Score,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import type { PracticeConfig } from '@/components/practice/practice-config';
import { startEngine } from '@/data/engine/store';
import { siteConfig } from '@/data/site-config';
import { bakedScore, lineMoves } from '@/features/learn/model';
import { to } from '@/router/location';

export const playOnHref = (opening?: string, line?: string) =>
  to(`/practice/play-on${opening ? `/${opening}` : ''}${line ? `/lines/${line}` : ''}`);

/** One position to play on from: a line's end, or a reply partway through it that leaves the book. */
export type PlayOnStart = {
  line: string;
  lineName: string;
  /** Where the learner takes over. */
  epd: string;
  /** The moves from the initial position to `epd` (UCI), for the Board page and move numbers. */
  moves: string[];
  exit?: BookExit;
};

/** Whether the learner has every one of their moves of a line in their reviews. */
function learned(opening: BuiltOpening, lineId: string, cards: ReadonlySet<string>): boolean {
  const mine = lineMoves(opening, lineId).filter((move) => move.mine);
  return mine.length > 0 && mine.every((move) => cards.has(moveCardId(move.before, move.uci)));
}

const nameOf = (opening: BuiltOpening, lineId: string) => {
  const line = opening.lines.find((l) => l.id === lineId);
  return line?.name ?? lineId.replace(/-/g, ' ');
};

/**
 * The positions of a Play on session (docs/v2/pages/play-on.md), in the opening's order, the lines the learner has
 * learned first. From the line's end, or with `leave` the computer leaves the book partway through each line with a
 * popular reply the opening does not answer (lines with no such reply are left out).
 */
export function playOnStarts(
  opening: BuiltOpening,
  facts: OpeningFacts | undefined,
  cards: ReadonlySet<string>,
  options: { leave: boolean; only?: string[]; random?: () => number },
): PlayOnStart[] {
  const random = options.random ?? Math.random;
  const ends = lineEnds(opening, options.only);
  const ordered = [
    ...ends.filter((end) => learned(opening, end.line, cards)),
    ...ends.filter((end) => !learned(opening, end.line, cards)),
  ];
  return ordered.flatMap((end): PlayOnStart[] => {
    const line = opening.lines.find((l) => l.id === end.line)!;
    if (!options.leave)
      return [{ line: end.line, lineName: nameOf(opening, end.line), epd: end.epd, moves: line.moves }];
    const exits = bookExits(opening, facts?.counts ?? {}, end.line);
    const exit = pickWeighted(
      exits.map((one) => ({ one, weight: one.games })),
      random(),
    )?.one;
    if (!exit) return [];
    return [
      {
        line: end.line,
        lineName: nameOf(opening, end.line),
        epd: exit.after,
        moves: [...line.moves.slice(0, exit.ply), exit.uci],
        exit,
      },
    ];
  });
}

/** The exercise for a start: the learner's moves are judged by keeping the position, no single right move to show. */
export function startExercise(opening: BuiltOpening, start: PlayOnStart, config: PracticeConfig): Exercise {
  return {
    ...playOnExercise(
      `play-on:${opening.id}:${start.line}${start.exit ? `:${start.exit.uci}` : ''}`,
      start.epd,
      opening.side,
      {
        learnerMoves: start.exit ? siteConfig.opponent.deviationJudgeAfter : config.playOnMoves,
        worst: config.playOnTolerance,
      },
    ),
    help: false,
    ...(start.exit ? { before: start.exit.uci } : {}),
  };
}

/** A position's score: the shipped evaluation when there is one, else the browser engine's. */
export async function scoreOf(facts: OpeningFacts | undefined, epd: string): Promise<Score | null> {
  const baked = bakedScore(facts, epd);
  if (baked) return baked;
  const engine = await startEngine();
  const result = await engine.evaluate(epd, { depth: siteConfig.engine.liveDepth, multipv: 1 });
  return result.lines[0]?.score ?? null;
}
