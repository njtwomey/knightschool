/**
 * A Lichess opening name as a key, the way Lichess writes the puzzle database's opening tags: accents dropped, spaces
 * and commas to underscores, then everything but letters, digits, underscores and hyphens removed.
 * "King's Gambit Accepted" → Kings_Gambit_Accepted, "Grünfeld Defense" → Grunfeld_Defense.
 */
export const openingKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[\s,]+/g, '_')
    .replace(/[^A-Za-z0-9_-]+/g, '');

/** A name's family and variation tags, as on a puzzle. */
export type OpeningTags = { family: string; variation: string };

/**
 * The tags a puzzle from a game with this opening carries: the family (the name before the colon) and the variation
 * (the family with the first variation, the part before any comma). A family alone gets `<family>_Other_variations`.
 * "Italian Game: Giuoco Piano, Pianissimo" → Italian_Game, Italian_Game_Giuoco_Piano.
 */
export function openingTagsOf(name: string): OpeningTags {
  const colon = name.indexOf(':');
  const familyName = colon < 0 ? name : name.slice(0, colon);
  const family = openingKey(familyName);
  const variationName = colon < 0 ? '' : (name.slice(colon + 1).split(',')[0] ?? '').trim();
  return { family, variation: variationName ? `${family}_${openingKey(variationName)}` : `${family}_Other_variations` };
}
