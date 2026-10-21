/** How practice picks what to ask: an even draw, or favouring what players actually meet. */
export type Weighting = 'random' | 'popular';

/**
 * A weight from a position's popularity (the share of games that reach it, 0 to 1). A position nobody has counted yet
 * is treated as rare rather than as zero, so it can still come up; nothing ever gets a weight of exactly nothing.
 */
export const popularityWeight = (popularity: number | undefined) => Math.max(popularity ?? 0.005, 0.0005);

/**
 * `count` items drawn without repeats, each more likely the heavier its weight (Efraimidis and Spirakis): with equal
 * weights it is a plain random sample. `random` is injectable for tests.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weightOf: (item: T) => number,
  count: number,
  random: () => number = Math.random,
): T[] {
  return items
    .map((item) => ({ item, key: Math.pow(Math.max(random(), Number.MIN_VALUE), 1 / Math.max(weightOf(item), 1e-9)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map(({ item }) => item);
}

/** The items in a random order (Fisher and Yates), as a new array. `random` is injectable for tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
