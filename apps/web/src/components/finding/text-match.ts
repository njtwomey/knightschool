/*
 * A forgiving matcher for names and text (docs/v2/components/search-box.md): accents and case ignored, words may run
 * together, small slips allowed (none under five letters, one from five, two from eight), every word must match.
 * Shared by the search box, the map index and the answer input. It belongs in core's search/text-match.ts once v2 has
 * one; it is kept here until then.
 */

/** Lower case, accents dropped, anything but letters and digits made a space. */
export const normalise = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The number of single-letter edits that turn one word into another. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1]! + 1, previous[j]! + 1, previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length]!;
}

const allowedSlips = (word: string) => (word.length >= 8 ? 2 : word.length >= 5 ? 1 : 0);

export type WordMatch = { kind: 'exact' | 'prefix' | 'inside' | 'joined' | 'close'; near?: string };

/** How one query word matches a text: as a word start, inside it, with the words run together, or with a slip. */
export function matchWord(word: string, text: string): WordMatch | null {
  const words = text.split(' ').filter(Boolean);
  if (words.includes(word)) return { kind: 'exact' };
  if (words.some((w) => w.startsWith(word))) return { kind: 'prefix' };
  if (text.includes(word)) return { kind: 'inside' };
  const joined = words.join('');
  if (joined.includes(word)) return { kind: 'joined' };
  const slips = allowedSlips(word);
  if (slips === 0) return null;
  for (let i = 0; i < words.length; i++) {
    for (let span = 1; span <= 2 && i + span <= words.length; span++) {
      const candidate = words.slice(i, i + span).join('');
      const head = candidate.slice(0, Math.max(word.length, Math.min(candidate.length, word.length + slips)));
      if (editDistance(word, candidate) <= slips || editDistance(word, head) <= slips) {
        return { kind: 'close', near: words.slice(i, i + span).join(' ') };
      }
    }
  }
  return null;
}

const KIND_SCORE: Record<WordMatch['kind'], number> = { exact: 4, prefix: 3, joined: 2.5, inside: 2, close: 1 };

/**
 * Whether every word of the query matches the text, and how well (higher is better); `near` names the word a slip was
 * forgiven against, for "Close to 'Caro-Kann'".
 */
export function forgivingMatch(query: string, text: string): { score: number; near?: string } | null {
  const q = normalise(query);
  if (!q) return null;
  const t = normalise(text);
  const queryWords = q.split(' ');
  // A whole query run together ("carokann") is tried against the text run together first.
  const joinedQuery = queryWords.join('');
  let score = 0;
  let near: string | undefined;
  for (const word of queryWords) {
    const match = matchWord(word, t);
    if (!match) {
      if (queryWords.length > 1 && t.split(' ').join('').includes(joinedQuery)) return { score: 2 * queryWords.length };
      return null;
    }
    score += KIND_SCORE[match.kind];
    near ??= match.near;
  }
  return { score, near };
}
