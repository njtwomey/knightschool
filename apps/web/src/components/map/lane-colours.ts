/*
 * A line's lane colour: identity only, no meaning (docs/v2/patterns/colours.md, `--line-0` to `--line-9`). index.css
 * does not define the ten tokens yet, so each falls back to v1's hue until it does.
 */
const FALLBACK = [
  'oklch(0.55 0.15 250)',
  'oklch(0.6 0.16 30)',
  'oklch(0.58 0.14 150)',
  'oklch(0.55 0.17 310)',
  'oklch(0.65 0.14 80)',
  'oklch(0.55 0.12 200)',
  'oklch(0.58 0.17 0)',
  'oklch(0.5 0.12 120)',
  'oklch(0.55 0.15 280)',
  'oklch(0.6 0.12 50)',
];

export const laneColour = (lane: number): string => `var(--line-${lane % 10}, ${FALLBACK[lane % 10]})`;
