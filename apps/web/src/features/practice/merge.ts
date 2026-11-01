import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';

/*
 * A session runs over one opening's tree and facts (its notes, refutations and explorer counts). A review mixes
 * openings, so their trees and facts are merged by position: a position two openings share keeps every move once.
 */

export function mergeOpenings(openings: readonly BuiltOpening[]): BuiltOpening | undefined {
  const [first, ...rest] = openings;
  if (!first || !rest.length) return first;
  const positions: BuiltOpening['positions'] = {};
  for (const opening of openings) {
    for (const [epd, node] of Object.entries(opening.positions)) {
      const seen = positions[epd];
      if (!seen) {
        positions[epd] = { ...node, moves: [...node.moves] };
        continue;
      }
      for (const move of node.moves) if (!seen.moves.some((m) => m.uci === move.uci)) seen.moves.push(move);
      if (node.refutations?.length) seen.refutations = [...(seen.refutations ?? []), ...node.refutations];
    }
  }
  return { ...first, positions };
}

export function mergeFacts(facts: readonly (OpeningFacts | undefined)[]): OpeningFacts | undefined {
  const present = facts.filter((one): one is OpeningFacts => Boolean(one));
  if (present.length <= 1) return present[0];
  return {
    ...present[0]!,
    evals: Object.assign({}, ...present.map((one) => one.evals)) as OpeningFacts['evals'],
    counts: Object.assign({}, ...present.map((one) => one.counts)) as OpeningFacts['counts'],
  };
}
