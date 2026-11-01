import type { MarkColour } from '@knightschool/core';

/*
 * Colours for things the board draws in SVG (arrows), where CSS variables cannot be used. They match the tokens of the
 * same name in index.css (docs/v2/patterns/colours.md).
 */
export const MARK_RGB: Record<MarkColour, string> = {
  G: 'rgb(21 128 61 / 0.85)',
  R: 'rgb(185 28 28 / 0.85)',
  Y: 'rgb(202 138 4 / 0.9)',
  B: 'rgb(29 78 216 / 0.85)',
};

/** System arrows: never one of the four mark colours, so "play this" never looks like an Idea. */
export const SYSTEM_RGB = {
  play: 'rgb(124 58 237 / 0.8)',
  engine: 'rgb(100 116 139 / 0.75)',
  wrong: 'rgb(219 39 119 / 0.8)',
  preview: 'rgb(100 116 139 / 0.5)',
} as const;

export const BOARD_SQUARES = { light: '#eeeed2', dark: '#769656' } as const;
