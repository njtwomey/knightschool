import { START_EPD, sideToMove, type Side } from '../chess/epd';
import { gameOver, replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import type { FactCounts } from '../content/facts';
import type { Exercise } from '../exercise/exercise';
import type { Grade } from '../judge/grade';

type OpeningLines = Pick<BuiltOpening, 'side' | 'startPly' | 'lines' | 'positions'>;

/** Where a line ends: the position Play on starts from (docs/v2/pages/play-on.md). */
export type LineEnd = { line: string; epd: string; plies: number };

/**
 * The ends of an opening's lines, in its order, to play on from: alternatives (shown, never drilled) and lines that end
 * the game are left out, and two lines ending in one position give it once.
 */
export function lineEnds(opening: OpeningLines, only?: readonly string[]): LineEnd[] {
  const ends: LineEnd[] = [];
  const seen = new Set<string>();
  for (const line of opening.lines) {
    if (line.alternative || (only && !only.includes(line.id))) continue;
    const played = replay(START_EPD, line.moves);
    const epd = played.at(-1)?.epd;
    if (!epd || played.length < line.moves.length || gameOver(epd) || seen.has(epd)) continue;
    seen.add(epd);
    ends.push({ line: line.id, epd, plies: played.length });
  }
  return ends;
}

/** A popular reply the opening does not answer, partway through a line: where the computer leaves the book. */
export type BookExit = {
  line: string;
  /** Plies of the line played before the reply. */
  ply: number;
  /** The position before the reply, and after it (where the learner takes over). */
  before: string;
  after: string;
  uci: string;
  san: string;
  games: number;
  /** Its share of the games at the band from `before` (0 to 1). */
  share: number;
};

/**
 * Every way the opponent can leave the book along a line: at each of their turns inside the opening (after its start)
 * where the band's counts are known, the moves players make that the opening has no answer for.
 */
export function bookExits(opening: OpeningLines, counts: Record<string, FactCounts>, lineId: string): BookExit[] {
  const line = opening.lines.find((candidate) => candidate.id === lineId);
  if (!line) return [];
  const played = replay(START_EPD, line.moves);
  const exits: BookExit[] = [];
  played.forEach((_, ply) => {
    const before = ply === 0 ? START_EPD : played[ply - 1]!.epd;
    if (ply < opening.startPly || sideToMove(before) === opening.side) return;
    const here = counts[before];
    if (!here || here.games <= 0) return;
    const book = new Set(opening.positions[before]?.moves.map((move) => move.uci) ?? []);
    for (const move of here.moves) {
      if (book.has(move.uci) || move.games <= 0) continue;
      const after = replay(before, [move.uci])[0];
      if (!after || gameOver(after.epd)) continue;
      exits.push({
        line: lineId,
        ply,
        before,
        after: after.epd,
        uci: after.uci,
        san: after.san,
        games: move.games,
        share: move.games / here.games,
      });
    }
  });
  return exits;
}

/**
 * Play on as an exercise: from `start`, the learner's side keeps its advantage for `learnerMoves` moves; any move no
 * worse than `worst` passes; the computer answers as players at the band do, then with the engine.
 */
export function playOnExercise(
  id: string,
  start: string,
  side: Side,
  options: { learnerMoves: number; worst: Grade },
): Exercise {
  return {
    id,
    mode: 'play-on',
    start,
    side,
    grader: { kind: 'tolerant', worst: options.worst },
    responder: { kind: 'popular' },
    learnerMoves: options.learnerMoves,
  };
}
