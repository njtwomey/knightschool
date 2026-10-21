import { lichessUrlForCourse, lichessUrlForLine } from './lichess';
import { OpeningIndexEntry, type OpeningContent } from './schema/content';
import { introductionOrder } from './training';
import { mainLine, variantPath } from './tree-helpers';

/** What an index row needs beyond the course itself: its place in the study order, and where its lines also appear. */
export type IndexExtras = {
  order: number;
  /** Other courses listing a line, by line id. */
  alsoIn?: (line: string) => string[];
  /** Where a line grows out of the tree: the chapter it branches from and the move it follows. */
  branch?: (line: string) => { parent: string; after: string } | undefined;
};

/** One row of index.json for a course: what the lists show without loading the whole course. */
export function courseIndexEntry(content: OpeningContent, extras: IndexExtras): OpeningIndexEntry {
  const { opening } = content;
  const main = mainLine(content);
  return OpeningIndexEntry.parse({
    ...opening,
    order: extras.order,
    variants: opening.variants.length,
    cards: introductionOrder(content, { minPopularity: 0 }).length,
    lichess: lichessUrlForCourse(content),
    keyEpd: main[Math.min(5, main.length - 1)]?.to ?? opening.rootEpd,
    lines: opening.variants.map(({ id, name, kind, opponent, weight, whose, alternative }) => {
      // A position partway along the line, for its thumbnail.
      const path = variantPath(content, id);
      return {
        id,
        name,
        kind,
        opponent,
        weight,
        whose,
        alternative,
        epd: path[Math.min(7, path.length - 1)]?.to ?? opening.rootEpd,
        epds: path.slice(1, 14).map((edge) => edge.to),
        alsoIn: (extras.alsoIn?.(id) ?? []).filter((course) => course !== opening.id),
        lichess: lichessUrlForLine(content, id),
        branch: extras.branch?.(id),
      };
    }),
  });
}
