import { parseArrow, parseRing, type MarkColour, type Marks } from '@knightschool/core';

export type MarkSet = Pick<Marks, 'arrows' | 'circles'>;

/** Drawing the same arrow again takes it away; drawing it in another colour changes its colour. */
export function toggleArrow(marks: MarkSet, colour: MarkColour, from: string, to: string): MarkSet {
  const index = marks.arrows.findIndex((text) => {
    const arrow = parseArrow(text);
    return arrow?.from === from && arrow.to === to;
  });
  const text = `${colour}${from}${to}`;
  if (index === -1) return { ...marks, arrows: [...marks.arrows, text] };
  const same = marks.arrows[index] === text;
  return { ...marks, arrows: marks.arrows.flatMap((old, i) => (i !== index ? [old] : same ? [] : [text])) };
}

/** As `toggleArrow`, for a ring on one square. */
export function toggleRing(marks: MarkSet, colour: MarkColour, square: string): MarkSet {
  const index = marks.circles.findIndex((text) => parseRing(text)?.square === square);
  const text = `${colour}${square}`;
  if (index === -1) return { ...marks, circles: [...marks.circles, text] };
  const same = marks.circles[index] === text;
  return { ...marks, circles: marks.circles.flatMap((old, i) => (i !== index ? [old] : same ? [] : [text])) };
}

/** As on Lichess: Shift draws red (Threat), Alt blue (Support), both yellow (Target); otherwise the picked colour. */
export function markColourFor(event: { shiftKey: boolean; altKey: boolean }, picked: MarkColour): MarkColour {
  if (event.shiftKey && event.altKey) return 'Y';
  if (event.shiftKey) return 'R';
  if (event.altKey) return 'B';
  return picked;
}
