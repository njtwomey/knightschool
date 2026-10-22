import { placePiece, type PieceLetter, type Setup } from '@knightschool/core';

/** What a click on a square does while setting up: put a piece there, or clear it. */
export type SetupTool = PieceLetter | 'erase';

/** The position with `tool` used on `square`. */
export const applyTool = (setup: Setup, square: string, tool: SetupTool): Setup => ({
  ...setup,
  placement: placePiece(setup.placement, square, tool === 'erase' ? null : tool),
});
