import type { MarkColour } from '@knightschool/core';

/*
 * The board's colours, as references to the tokens in index.css (docs/v2/patterns/colours.md): every value lives
 * there, once, for light and dark. CSS variables work in inline styles and in the SVG the board draws arrows with.
 */
export const MARK_COLOUR: Record<MarkColour, string> = {
  G: 'var(--mark-idea)',
  R: 'var(--mark-threat)',
  Y: 'var(--mark-target)',
  B: 'var(--mark-support)',
};

/** System arrows: never one of the four mark colours, so "play this" never looks like an Idea. */
export const SYSTEM_COLOUR = {
  play: 'var(--arrow-play)',
  engine: 'var(--arrow-engine)',
  wrong: 'var(--arrow-wrong)',
  preview: 'var(--arrow-preview)',
} as const;

export const BOARD_COLOUR = {
  lastMove: 'var(--board-last-move)',
  lit: 'var(--board-lit)',
  dot: 'var(--board-dot)',
} as const;

/** A colour token made see-through, for tints over a square. */
export const tint = (colour: string, percent: number) => `color-mix(in srgb, ${colour} ${percent}%, transparent)`;

/** How strongly the engine's first, second and third choices are drawn. */
export const ENGINE_ARROW_STRENGTH = [100, 60, 35];
