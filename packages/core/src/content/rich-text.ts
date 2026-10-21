import { Chess } from 'chess.js';
import { epdToFen, fenToEpd } from '../chess/epd';

/**
 * Comments, summaries and plans may point at a position: `[Nxf7](r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq -)`.
 * The text in square brackets is what the learner reads; the target is any legal FEN or EPD. Wherever the text is
 * shown beside a board, hovering the words shows that position on the board.
 */
export type RichSegment = { kind: 'text'; text: string } | { kind: 'position'; label: string; epd: string };

const LINK = /\[([^[\]]+)\]\(([^()]+)\)/g;

/** The text split into plain stretches and position links. A link whose target is not a position stays plain text. */
export function parseRichText(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  let at = 0;
  for (const match of text.matchAll(LINK)) {
    const epd = positionOf(match[2]!);
    if (!epd) continue;
    if (match.index! > at) segments.push({ kind: 'text', text: text.slice(at, match.index) });
    segments.push({ kind: 'position', label: match[1]!, epd });
    at = match.index! + match[0].length;
  }
  if (at < text.length) segments.push({ kind: 'text', text: text.slice(at) });
  return segments;
}

/** The text as plain words: each position link becomes its label. For search, summaries and anywhere without a board. */
export function plainText(text: string): string {
  return parseRichText(text)
    .map((segment) => (segment.kind === 'text' ? segment.text : segment.label))
    .join('');
}

/** The EPD a link target names, or undefined when it is not a legal position. */
export function positionOf(target: string): string | undefined {
  try {
    const epd = fenToEpd(target);
    new Chess(epdToFen(epd)); // throws on an illegal position
    return epd;
  } catch {
    return undefined;
  }
}

/** Throws, naming `where`, if any `[label](target)` in the text has a target that is not a legal FEN or EPD. */
export function checkRichText(text: string, where: string): void {
  for (const match of text.matchAll(LINK)) {
    // Ordinary brackets followed by parentheses (a note such as "[sic](see above)") are only an error if the target
    // looks like a position: it has a rank separator.
    if (!match[2]!.includes('/')) continue;
    if (!positionOf(match[2]!))
      throw new Error(`${where}: "${match[1]}" links to "${match[2]}", which is not a legal FEN`);
  }
}
