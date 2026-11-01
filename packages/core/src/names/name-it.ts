import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import type { LichessName, OpeningNames } from './names';

/** A position to name: where it is, the moves that reach it (SAN from the start), the names it goes by, its weight. */
export type NameItPosition = { epd: string; opening: string; sans: string[]; names: LichessName[]; weight: number };

/** What a Name it answer is logged under (attempts, mode `name-it`). */
export const nameItRef = (opening: string, epd: string) => `name-it:${opening}:${epd}`;

/**
 * Every position of an opening that has a name, with the first line's moves that reach it, weighted by the games that
 * reach it (explorer counts; unknown counts weigh as one game).
 */
export function nameItPositions(
  opening: BuiltOpening,
  names: OpeningNames,
  counts: Record<string, { games: number }> | undefined,
): NameItPosition[] {
  const out = new Map<string, NameItPosition>();
  for (const line of opening.lines) {
    const played = replay(START_EPD, line.moves);
    played.forEach((move, i) => {
      if (i + 1 < opening.startPly || out.has(move.epd)) return;
      const known = names.positions[move.epd];
      if (!known?.length) return;
      out.set(move.epd, {
        epd: move.epd,
        opening: opening.id,
        sans: played.slice(0, i + 1).map((one) => one.san),
        names: known,
        weight: Math.max(1, counts?.[move.epd]?.games ?? 1),
      });
    });
  }
  return [...out.values()];
}
