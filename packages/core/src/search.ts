import { z } from 'zod';
import type { OpeningContent } from './schema/content';

/** One line of one course that passes through a position, and the move it plays from there. */
export const SearchLine = z.object({
  course: z.string(),
  line: z.string(),
  kind: z.enum(['line', 'refutation']),
  /** The move this line plays next (UCI), or null if the line ends at this position. */
  next: z.string().nullable(),
});
export type SearchLine = z.infer<typeof SearchLine>;

export const SearchEntry = z.object({
  lines: z.array(SearchLine),
  /** SAN for each move in `lines`, as played from this position. */
  san: z.record(z.string(), z.string()),
});
export type SearchEntry = z.infer<typeof SearchEntry>;

/** Every position in every course, keyed by EPD, so a board can be used as a search field. */
export const SearchIndex = z.record(z.string(), SearchEntry);
export type SearchIndex = z.infer<typeof SearchIndex>;

/**
 * Builds the index at content build time. Keyed by EPD, so a position reached by a different move order matches
 * as well: 1.Nf3 Nc6 2.e4 e5 finds the same entry as 1.e4 e5 2.Nf3 Nc6.
 */
export function buildSearchIndex(contents: OpeningContent[]): SearchIndex {
  type Key = string; // `${course}\t${line}`
  const draft = new Map<string, { nexts: Map<Key, Set<string | null>>; san: Map<string, string> }>();
  const at = (epd: string) => {
    const entry = draft.get(epd) ?? { nexts: new Map(), san: new Map() };
    draft.set(epd, entry);
    return entry;
  };
  const kinds = new Map<Key, SearchLine['kind']>();

  for (const content of contents) {
    for (const variant of content.opening.variants) kinds.set(`${content.opening.id}\t${variant.id}`, variant.kind);
    for (const node of Object.values(content.nodes)) {
      const here = at(node.epd);
      for (const edge of node.moves) {
        here.san.set(edge.uci, edge.san);
        for (const line of edge.variants) {
          const key: Key = `${content.opening.id}\t${line}`;
          (here.nexts.get(key) ?? here.nexts.set(key, new Set()).get(key)!).add(edge.uci);
          // The line also reaches the position after the move; it ends there unless a later edge says otherwise.
          const there = at(edge.to);
          if (!there.nexts.has(key)) there.nexts.set(key, new Set());
        }
      }
    }
  }

  const index: SearchIndex = {};
  for (const [epd, entry] of draft) {
    const lines: SearchLine[] = [];
    for (const [key, nexts] of entry.nexts) {
      const [course, line] = key.split('\t') as [string, string];
      const kind = kinds.get(key) ?? 'line';
      if (nexts.size === 0) lines.push({ course, line, kind, next: null });
      for (const next of nexts) lines.push({ course, line, kind, next });
    }
    lines.sort(
      (a, b) =>
        a.course.localeCompare(b.course) ||
        a.line.localeCompare(b.line) ||
        String(a.next).localeCompare(String(b.next)),
    );
    index[epd] = { lines, san: Object.fromEntries(entry.san) };
  }
  return index;
}

export type ResultKind = 'lines' | 'refutations' | 'both';

export type SearchResult = {
  /** Lines through the position that match the chosen kind. */
  lines: SearchLine[];
  /** Courses with at least one matching line, in order of first appearance. */
  courses: string[];
  /** Moves that lead on from here in a matching line, most popular first, with the courses that play each. */
  moves: { uci: string; san: string; courses: string[]; lines: number }[];
};

/** What the courses say about a position, keeping only the kind of line asked for. Undefined if nothing matches. */
export function searchAt(index: SearchIndex, epd: string, kind: ResultKind = 'both'): SearchResult | undefined {
  const entry = index[epd];
  if (!entry) return undefined;
  const lines = entry.lines.filter(
    (line) => kind === 'both' || line.kind === (kind === 'lines' ? 'line' : 'refutation'),
  );
  if (lines.length === 0) return undefined;
  const byMove = new Map<string, { courses: Set<string>; lines: number }>();
  for (const line of lines) {
    if (line.next === null) continue;
    const move = byMove.get(line.next) ?? { courses: new Set<string>(), lines: 0 };
    move.courses.add(line.course);
    move.lines++;
    byMove.set(line.next, move);
  }
  return {
    lines,
    courses: [...new Set(lines.map((line) => line.course))],
    moves: [...byMove]
      .map(([uci, move]) => ({ uci, san: entry.san[uci] ?? uci, courses: [...move.courses], lines: move.lines }))
      .sort((a, b) => b.courses.length - a.courses.length || b.lines - a.lines || a.san.localeCompare(b.san)),
  };
}
