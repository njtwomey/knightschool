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

/**
 * How much an item weighs in a practice draw: the one meaning of "favouring what players meet most" in Quiz, Name it and
 * Speed. At random every item weighs the same; favouring popular, an item weighs the share of games that reach the
 * position that decides it (`decidingIndex`): for a question or a position to name, that position itself.
 */
export const practiceWeight = (weighting: Weighting, popularity: number | undefined) =>
  weighting === 'popular' ? popularityWeight(popularity) : 1;

/**
 * Where a run of moves becomes itself, for weighing it by popularity. `positions` are the positions along it from the
 * start (index 0 the start position). It is the first position from `from` on (where its own moves may begin) that no
 * other item reaches (`seen`), so a line weighs as much as the games that go its way rather than the games that share
 * its first moves; and never past `to`, the last position actually played (a line cut short weighs where it stops).
 */
export function decidingIndex(
  positions: readonly string[],
  { from = 0, to = positions.length - 1, seen }: { from?: number; to?: number; seen?: ReadonlySet<string> } = {},
): number {
  const last = Math.max(0, Math.min(to, positions.length - 1));
  for (let i = Math.max(0, Math.min(from, last)); i <= last; i++) if (!seen?.has(positions[i]!)) return i;
  return last;
}
