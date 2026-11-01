import { forgivingMatch, normalise } from './text-match';

/** The words of the text a forgiven slip was matched against, as written ("Scandinavian", not "scandinavian"). */
function asWritten(near: string, text: string): string {
  const words = text.split(/\s+/);
  const wanted = near.split(' ');
  for (let i = 0; i + wanted.length <= words.length; i++) {
    const run = words.slice(i, i + wanted.length);
    if (normalise(run.join(' ')) === near) return run.join(' ').replace(/[,:;.]$/, '');
  }
  return near;
}

export type SearchKind = 'opening' | 'variation' | 'line' | 'idea';

/** One thing the search box can find. */
export type SearchItem = {
  id: string;
  kind: SearchKind;
  name: string;
  href: string;
  /** The opening a variation or line belongs to. */
  opening?: string;
  /** Lines inside an opening or variation, by name. */
  inside?: string[];
  description?: string;
  /** A short line under the name: the moves, the side, the kind. */
  meta?: string;
  /** Rare lines are found but ranked lower. */
  rare?: boolean;
  /** An opening the learner wrote. */
  yours?: boolean;
};

export type SearchResult = { item: SearchItem; score: number; why: string };

const KIND_ORDER: Record<SearchKind, number> = { opening: 3, variation: 2, line: 1, idea: 0 };

/**
 * Ranks items against a query, each with why it matched: a name match first, then a match in a line's name, then the
 * text around it (docs/v2/components/search-box.md).
 */
export function searchItems(items: readonly SearchItem[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const results: SearchResult[] = [];
  for (const item of items) {
    const close = (near: string | undefined, why: string, text = item.name) =>
      near ? `Close to '${asWritten(near, text)}'` : why;
    const name = forgivingMatch(query, item.name);
    if (name) {
      results.push({ item, score: 100 + name.score * 10, why: close(name.near, 'Name') });
      continue;
    }
    const inside = (item.inside ?? []).filter((line) => forgivingMatch(query, line));
    if (inside.length > 0) {
      results.push({ item, score: 60 + inside.length, why: `Lines inside: ${inside.slice(0, 3).join(', ')}` });
      continue;
    }
    const opening = item.opening ? forgivingMatch(query, item.opening) : null;
    if (opening) {
      results.push({
        item,
        score: 40 + opening.score,
        why: close(opening.near, `In the ${item.opening}`, item.opening),
      });
      continue;
    }
    const description = item.description ? forgivingMatch(query, item.description) : null;
    if (description) {
      results.push({
        item,
        score: 20 + description.score,
        why: close(description.near, 'In its description', item.description),
      });
    }
  }
  return results
    .map((result) => (result.item.rare ? { ...result, score: result.score - 15 } : result))
    .sort((a, b) => b.score - a.score || KIND_ORDER[b.item.kind] - KIND_ORDER[a.item.kind]);
}

export const KIND_NAME: Record<SearchKind, string> = {
  opening: 'Opening',
  variation: 'Variation',
  line: 'Line',
  idea: 'Idea',
};
