/**
 * The forgiving text match behind every search: case, accents, apostrophes and punctuation ignored, a plural s
 * dropped, words run together and small typing slips allowed.
 */

/**
 * Lowercase, accents and apostrophes dropped ("Queen's" and "Queens" read alike), and hyphens and other punctuation
 * turned into spaces ("Caro-Kann" and "caro kann" read alike). Dots stay so a move such as "3.e5" can be searched.
 */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['‘’`]/g, '')
    .replace(/[-_,:;()/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The folded words of a search. */
export const words = (text: string) => fold(text).split(' ').filter(Boolean);
/** A search word is found as typed, or without a plural s ("queens" still finds "queen"). */
const exactly = (needle: string, haystack: string) =>
  haystack.includes(needle) || (needle.length > 3 && needle.endsWith('s') && haystack.includes(needle.slice(0, -1)));

/** Edit distance counting a swap of two neighbouring letters as one edit; gives up (returns max + 1) past `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let before: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, row[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2]! + 1);
      row.push(value);
      best = Math.min(best, value);
    }
    if (best > max) return max + 1;
    before = previous;
    previous = row;
  }
  return previous[b.length]!;
}

/** How many typing slips a search word may have: none for short words, one from five letters, two from eight. */
const slips = (needle: string) => (needle.length >= 8 ? 2 : needle.length >= 5 ? 1 : 0);

/**
 * A search word found with some forgiveness, for when it is not there as typed: run together ("carokann" finds
 * "Caro-Kann"), or within a slip or two of a word, the start of a word, or two or three words joined ("scandanavian",
 * "evens gambit", "carokan").
 */
function nearly(needle: string, haystack: string): boolean {
  if (needle.length >= 4 && haystack.replace(/ /g, '').includes(needle)) return true;
  const max = slips(needle);
  if (max === 0) return false;
  const parts = haystack.split(' ');
  for (let i = 0; i < parts.length; i++) {
    let joined = '';
    for (let k = i; k < Math.min(i + 3, parts.length); k++) {
      joined += parts[k];
      if (joined.length < needle.length - max) continue;
      for (let length = needle.length - max; length <= needle.length + max; length++) {
        if (length > joined.length) break;
        if (editDistance(needle, joined.slice(0, length), max) <= max) return true;
      }
    }
  }
  return false;
}

const found = (needle: string, haystack: string) => exactly(needle, haystack) || nearly(needle, haystack);
/**
 * Every word found, or the words run together found with forgiveness: "karo kann" reads as "karokann", one slip from
 * "Caro-Kann", although each half is too short to forgive on its own.
 */
export const matchesAll = (needles: string[], haystack: string) =>
  needles.every((needle) => found(needle, haystack)) || (needles.length > 1 && nearly(needles.join(''), haystack));
/** Every word found as typed (or without a plural s), no slips allowed. */
export const matchesExactly = (needles: string[], haystack: string) =>
  needles.every((needle) => exactly(needle, haystack));

/** Whether every word of a search is found in some text, with the same forgiveness as the course search. */
export const matchesText = (query: string, text: string) => matchesAll(words(query), fold(text));

/**
 * How well something matches a search, so results can be ordered: a name match is worth a lot (the whole name most, then
 * a name that starts with it, then one that has every word), and a match only in the surrounding text (summary, course
 * and line names) is worth a little. Zero means no match; an empty search matches everything equally.
 */
export function relevance(name: string, content: string, query: string): number {
  const needles = words(query);
  if (needles.length === 0) return 1;
  const typed = needles.join(' ');
  const lower = fold(name);
  const nameWords = new Set(lower.split(/[^a-z0-9]+/).filter(Boolean));
  const isNameWord = (needle: string) =>
    nameWords.has(needle) || (needle.length > 3 && needle.endsWith('s') && nameWords.has(needle.slice(0, -1)));
  if (lower === typed) return 100;
  if (lower.startsWith(typed)) return 80;
  if (needles.every(isNameWord)) return 60;
  if (matchesExactly(needles, lower)) return 50;
  if (matchesAll(needles, lower)) return 40; // the name, allowing for slips and words run together
  const text = `${lower} ${fold(content)}`;
  if (matchesExactly(needles, text)) return 20;
  const hits = needles.filter((needle) => found(needle, text)).length;
  if (hits === needles.length) return 15;
  return hits > 0 && needles.length > 1 ? 5 * (hits / needles.length) : 0;
}
