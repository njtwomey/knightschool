/** Moves cut into paragraphs, each ending at a move with a comment (the last may have none). */
export function moveParagraphs<T extends { comment?: string }>(moves: readonly T[]): T[][] {
  const paragraphs: T[][] = [[]];
  for (const entry of moves) {
    paragraphs.at(-1)!.push(entry);
    if (entry.comment) paragraphs.push([]);
  }
  return paragraphs.filter((paragraph) => paragraph.length > 0);
}
