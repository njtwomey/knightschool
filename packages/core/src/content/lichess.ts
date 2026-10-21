import type { LineEdge, OpeningContent } from '../schema/content';
import { pathTo, variantPath } from '../navigation/content-walk';

const LICHESS_OPENING = 'https://lichess.org/opening';

/**
 * The key Lichess uses in an opening page's address: the name without accents or punctuation (apostrophes, colons,
 * commas, dots), hyphens kept, words joined by underscores. "King's Gambit Accepted: Kieseritzky Gambit" becomes
 * "Kings_Gambit_Accepted_Kieseritzky_Gambit".
 */
export const lichessOpeningKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

/**
 * The Lichess opening page for a path of moves: the page of the deepest position along it that has an opening name
 * (names come from Lichess's own list, so the page exists). Without a name, the page for the moves themselves
 * ("e4_c6_Bc4"), which Lichess also serves; with no moves, the list of openings.
 */
export function lichessUrlForPath(content: OpeningContent, path: LineEdge[]): string {
  for (let i = path.length - 1; i >= 0; i--) {
    const name = content.nodes[path[i]!.to]?.name;
    if (name) return `${LICHESS_OPENING}/${lichessOpeningKey(name)}`;
  }
  if (path.length === 0) return LICHESS_OPENING;
  return `${LICHESS_OPENING}/${path
    .slice(0, 10)
    .map((edge) => encodeURIComponent(edge.san))
    .join('_')}`;
}

/** A line's Lichess page: the deepest named position on it. */
export const lichessUrlForLine = (content: OpeningContent, lineId: string) =>
  lichessUrlForPath(content, variantPath(content, lineId));

/** A course's Lichess page: the deepest named position on the way to its trigger. */
export const lichessUrlForCourse = (content: OpeningContent) =>
  lichessUrlForPath(
    content,
    content.opening.triggerEpd === content.opening.rootEpd ? [] : pathTo(content, content.opening.triggerEpd),
  );
