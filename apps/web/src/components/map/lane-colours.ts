/** A line's lane colour: identity only, no meaning (`--line-0` to `--line-9` in index.css). */
export const laneColour = (lane: number): string => `var(--line-${lane % 10})`;
