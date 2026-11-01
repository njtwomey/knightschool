import type { BuiltOpening } from './build-opening';

/**
 * The ply of every position in an opening (half-moves from the start of the game), walking its tree from the start:
 * so an exercise that begins mid-game can number its moves as the game does ("7.Re1", not "1.Re1").
 */
export function positionPlies(opening: Pick<BuiltOpening, 'startEpd' | 'startPly' | 'positions'>): Map<string, number> {
  const plies = new Map<string, number>([[opening.startEpd, opening.startPly]]);
  const queue = [opening.startEpd];
  for (let at = queue.shift(); at !== undefined; at = queue.shift()) {
    const ply = plies.get(at)!;
    for (const move of opening.positions[at]?.moves ?? []) {
      if (plies.has(move.to)) continue;
      plies.set(move.to, ply + 1);
      queue.push(move.to);
    }
  }
  return plies;
}
