/** The colour of a line's lane: the main line in the text colour, the rest from the line palette. */
export const laneColour = (index: number) => (index === 0 ? 'var(--foreground)' : `var(--line-${(index - 1) % 10})`);
