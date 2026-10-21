import type { Annotation } from '@knightschool/core';
import type { CSSProperties } from 'react';

type BoardArrow = { startSquare: string; endSquare: string; color: string };

// PGN [%cal] / [%csl] colour letters.
const COLOURS: Record<string, string> = {
  G: 'rgba(21, 128, 61, 0.85)',
  R: 'rgba(185, 28, 28, 0.85)',
  Y: 'rgba(202, 138, 4, 0.85)',
  B: 'rgba(29, 78, 216, 0.85)',
};
const DEFAULT_COLOUR = COLOURS.G!;

/** 'Ge2e4' to an arrow from e2 to e4. Malformed entries are skipped. */
export function arrowsOf(annotation: Annotation | undefined): BoardArrow[] {
  return (annotation?.arrows ?? []).flatMap((shape) => {
    const match = /^([GRYB])?([a-h][1-8])([a-h][1-8])$/.exec(shape);
    if (!match) return [];
    return [{ startSquare: match[2]!, endSquare: match[3]!, color: COLOURS[match[1] ?? 'G'] ?? DEFAULT_COLOUR }];
  });
}

/** Square styles for the last move and for annotation circles ('Ge4' rings e4 in green). */
export function squareStylesOf(lastUci: string | undefined, annotation: Annotation | undefined) {
  const styles: Record<string, CSSProperties> = {};
  if (lastUci) {
    for (const square of [lastUci.slice(0, 2), lastUci.slice(2, 4)]) {
      styles[square] = { backgroundColor: 'var(--board-highlight)' };
    }
  }
  for (const shape of annotation?.circles ?? []) {
    const match = /^([GRYB])?([a-h][1-8])$/.exec(shape);
    if (!match) continue;
    const colour = COLOURS[match[1] ?? 'G'] ?? DEFAULT_COLOUR;
    styles[match[2]!] = { ...styles[match[2]!], boxShadow: `inset 0 0 0 4px ${colour}` };
  }
  return styles;
}
