import type { SearchConfig, Side } from '@knightschool/core';
import type { LineKind } from '@/components/chess/kind-badge';
import { editDistance, forgivingMatch, KIND_SCORE, matchWord, normalise } from './text-match';

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
/** Who plays the moves an opening is named for: its side, or the other. */
export type SearchRole = 'play' | 'against';
export type SearchLineKind = 'main' | 'sideline' | 'rare' | 'gambit' | 'trap';

/** One thing the search box can find. */
export type SearchItem = {
  id: string;
  kind: SearchKind;
  name: string;
  href: string;
  /** The opening a variation or line belongs to. */
  opening?: string;
  /** The variation a line belongs to. */
  variation?: string;
  /** Lines inside an opening or variation, by name. */
  inside?: string[];
  description?: string;
  /** The longer text around it: what its moves' notes and its steps say. */
  comments?: string;
  /** A short line under the name: the moves, the side, the kind. */
  meta?: string;
  /** Rare lines are found but ranked lower. */
  rare?: boolean;
  /** An opening the learner wrote. */
  yours?: boolean;
  /** For the filters; an item without them passes. An idea has the sides and roles of the openings that teach it. */
  sides?: readonly Side[];
  roles?: readonly SearchRole[];
  lineKind?: SearchLineKind;
  /** The lines (their item ids) inside an opening or variation, for the board search. */
  lines?: readonly string[];
};

export type SearchResult = {
  item: SearchItem;
  score: number;
  why: string;
  /** The sentence that matched, for a match in a description or a comment. */
  quote?: string;
};

export type SearchRanking = Pick<SearchConfig, 'weights' | 'rarePenalty'>;

const KIND_ORDER: Record<SearchKind, number> = { opening: 3, variation: 2, line: 1, idea: 0 };

/** A match's score: the field's weight, raised by up to 40% for how good it is (more for a whole name). */
const strength = (weight: number, quality: number) => weight * (1 + quality / 10);

/** The longest quote shown under a result. */
const QUOTE_LENGTH = 140;

/** The sentence of a text that shows the match, cut if long. */
export function quoteFrom(text: string, query: string): string {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const first = normalise(query).split(' ')[0] ?? '';
  const sentence =
    sentences.find((candidate) => forgivingMatch(query, candidate, { slips: false })) ??
    sentences.find((candidate) => matchWord(first, normalise(candidate), false)) ??
    sentences[0]!;
  return sentence.length > QUOTE_LENGTH ? `${sentence.slice(0, QUOTE_LENGTH - 1).trimEnd()}…` : sentence;
}

/** Where a word of a query can be found, best first. Slips are forgiven in titles, never in prose. */
function fieldsOf(item: SearchItem, weights: SearchRanking['weights']) {
  const parent = (name: string | undefined) =>
    name ? [{ label: `the ${name}`, text: name, weight: weights.opening, slips: true }] : [];
  const text = (label: string, value: string | undefined, weight: number) =>
    value ? [{ label, text: value, weight, slips: false }] : [];
  const inside = item.inside?.join(' ');
  return [
    { label: 'the name', text: item.name, weight: weights.name, slips: true },
    ...(inside ? [{ label: 'a line inside', text: inside, weight: weights.inside, slips: true }] : []),
    ...parent(item.variation),
    ...parent(item.opening),
    ...text('its description', item.description, weights.description),
    ...text('its comments', item.comments, weights.comment),
  ].map((field) => ({ ...field, text: normalise(field.text) }));
}

/** The whole query inside one field, the best field first: the wording "why it matched" gives. */
function matchInOneField(item: SearchItem, query: string, words: number, ranking: SearchRanking): SearchResult | null {
  const { weights } = ranking;
  const close = (near: string | undefined, why: string, text = item.name) =>
    near ? `Close to '${asWritten(near, text)}'` : why;
  const name = forgivingMatch(query, item.name);
  if (name) {
    // Among names, the whole name first, then one that starts with the query.
    const written = normalise(item.name);
    const asked = normalise(query);
    const bonus = written === asked ? 2 : written.startsWith(asked) ? 1 : 0;
    return { item, score: strength(weights.name, name.score / words + bonus), why: close(name.near, 'Name') };
  }

  const inside = (item.inside ?? []).filter((line) => forgivingMatch(query, line));
  if (inside.length > 0) {
    // More lines, a little higher, within the tier.
    const score = strength(weights.inside, 2) + Math.min(inside.length, 10);
    return { item, score, why: `Lines inside: ${inside.slice(0, 3).join(', ')}` };
  }

  for (const parent of [item.variation, item.opening]) {
    const found = parent ? forgivingMatch(query, parent) : null;
    if (parent && found) {
      return {
        item,
        score: strength(weights.opening, found.score / words),
        why: close(found.near, `In the ${parent}`, parent),
      };
    }
  }

  const prose = [
    { text: item.description, weight: weights.description, why: 'In its description' },
    { text: item.comments, weight: weights.comment, why: 'In its comments' },
  ];
  for (const { text, weight, why } of prose) {
    const found = text ? forgivingMatch(query, text, { slips: false }) : null;
    if (text && found) {
      return { item, score: strength(weight, found.score / words), why, quote: quoteFrom(text, query) };
    }
  }
  return null;
}

/** Every word somewhere, in different fields ("italian fried liver"): each counts for the best field it is in. */
function matchAcrossFields(item: SearchItem, query: string, ranking: SearchRanking): SearchResult | null {
  const words = normalise(query).split(' ');
  if (words.length < 2) return null;
  const fields = fieldsOf(item, ranking.weights);
  const where = new Set<string>();
  let total = 0;
  for (const word of words) {
    let hit = false;
    for (const field of fields) {
      const match = matchWord(word, field.text, field.slips);
      if (!match) continue;
      total += strength(field.weight, KIND_SCORE[match.kind]);
      where.add(field.label);
      hit = true;
      break;
    }
    if (!hit) return null;
  }
  const places = fields.filter((field) => where.has(field.label)).map((field) => field.label);
  return { item, score: total / words.length, why: `In ${places.join(' and ')}` };
}

/**
 * Ranks items against a query, each with why it matched: a match in a name first, then in a line's name, the opening
 * around it, its description, and last its comments (docs/v2/library/search.md). Equal scores keep the order given.
 */
export function searchItems(items: readonly SearchItem[], query: string, ranking: SearchRanking): SearchResult[] {
  if (!normalise(query)) return [];
  const words = normalise(query).split(' ').length;
  const results: SearchResult[] = [];
  for (const item of items) {
    const result = matchInOneField(item, query, words, ranking) ?? matchAcrossFields(item, query, ranking);
    if (!result) continue;
    results.push(item.rare ? { ...result, score: result.score - ranking.rarePenalty } : result);
  }
  return results.sort((a, b) => b.score - a.score || KIND_ORDER[b.item.kind] - KIND_ORDER[a.item.kind]);
}

/** The name closest to a query that found nothing, for "Did you mean Caro-Kann?": a word of it, two, or all of it. */
export function nearestName(items: readonly SearchItem[], query: string): string | null {
  const wanted = normalise(query).replace(/ /g, '');
  if (wanted.length < 3) return null;
  const allowed = Math.max(1, Math.floor(wanted.length / 3));
  let best: { name: string; distance: number } | null = null;
  for (const item of items) {
    const words = normalise(item.name).split(' ');
    const pairs = words.slice(1).map((word, i) => `${words[i]}${word}`);
    for (const candidate of [...words, ...pairs, words.join('')]) {
      if (candidate.length < 3) continue;
      const distance = editDistance(wanted, candidate);
      if (distance <= allowed && (!best || distance < best.distance)) best = { name: item.name, distance };
    }
  }
  return best?.name ?? null;
}

export const KIND_NAME: Record<SearchKind, string> = {
  opening: 'Opening',
  variation: 'Variation',
  line: 'Line',
  idea: 'Idea',
};

/* The filters (docs/v2/pages/search.md). */

export type SearchScope = 'all' | 'openings' | 'variations' | 'lines' | 'ideas';
export type SearchFilters = {
  role: 'all' | SearchRole;
  side: 'all' | Side;
  scope: SearchScope;
  kind: 'all' | SearchLineKind;
};

const SCOPE_KIND: Record<Exclude<SearchScope, 'all'>, SearchKind> = {
  openings: 'opening',
  variations: 'variation',
  lines: 'line',
  ideas: 'idea',
};

/** Whether an opening plays the moves it is named for: the side that made the last of them is its own side. */
export function openingRole(side: Side, startPly: number): SearchRole {
  if (startPly === 0) return 'play';
  return (startPly % 2 === 1 ? 'white' : 'black') === side ? 'play' : 'against';
}

export const passesWho = (item: SearchItem, { side, role }: Pick<SearchFilters, 'side' | 'role'>) =>
  (side === 'all' || !item.sides || item.sides.includes(side)) &&
  (role === 'all' || !item.roles || item.roles.includes(role));

export const passesScope = (item: SearchItem, scope: SearchScope) => scope === 'all' || item.kind === SCOPE_KIND[scope];

/** A line kind narrows the list to lines of that kind: nothing else has a kind. */
export const passesKind = (item: SearchItem, kind: SearchFilters['kind']) => kind === 'all' || item.lineKind === kind;

/* By position (docs/v2/components/board-search.md). */

/** A line the board search can find: its moves with the position before and after each. */
export type PositionLine = {
  id: string;
  name: string;
  opening: string;
  kind: LineKind;
  /** The side the line is written for. */
  writtenFor?: Side;
  moves: { san: string; uci: string; before: string; after: string }[];
  /** The line's address at a ply (its board at that move). */
  href: (ply: number) => string;
};

export type FindKind = 'all' | 'lines' | 'traps';
export type PositionIndex = Map<string, { line: PositionLine; ply: number }[]>;
export type PositionHit = { line: PositionLine; ply: number; transposed: boolean };

const isTrap = (kind: LineKind) => kind === 'for-us' || kind === 'against-us';

/** Every position of every line, to the lines through it: positions are keyed by EPD, so transpositions match. */
export function indexLines(lines: readonly PositionLine[]): PositionIndex {
  const index: PositionIndex = new Map();
  const add = (epd: string, line: PositionLine, ply: number) => {
    const hits = index.get(epd) ?? [];
    // A line can come back to a position; it is found at the first time.
    if (hits.at(-1)?.line.id !== line.id) hits.push({ line, ply });
    index.set(epd, hits);
  };
  for (const line of lines) {
    line.moves.forEach((move, i) => {
      if (i === 0) add(move.before, line, 0);
      add(move.after, line, i + 1);
    });
  }
  return index;
}

/** The lines through a position, in the order they were indexed, each saying if it gets there by another move order. */
export function linesAt(
  index: PositionIndex,
  epd: string,
  played: readonly { uci: string }[],
  kind: FindKind = 'all',
): PositionHit[] {
  return (index.get(epd) ?? [])
    .filter(({ line }) => kind === 'all' || (kind === 'traps') === isTrap(line.kind))
    .map(({ line, ply }) => ({
      line,
      ply,
      transposed: ply !== played.length || line.moves.slice(0, ply).some((move, i) => move.uci !== played[i]?.uci),
    }));
}

export type NextMove = { uci: string; san: string; after: string; lines: number };

/** The moves the lines through a position play next, the most travelled first. */
export function nextMoves(hits: readonly PositionHit[]): NextMove[] {
  const moves = new Map<string, NextMove>();
  for (const { line, ply } of hits) {
    const next = line.moves[ply];
    if (!next) continue;
    const known = moves.get(next.uci);
    if (known) known.lines++;
    else moves.set(next.uci, { uci: next.uci, san: next.san, after: next.after, lines: 1 });
  }
  return [...moves.values()].sort((a, b) => b.lines - a.lines);
}

/** What the board search leaves of a list: the lines through the position, and what holds one. Ideas have no moves. */
export function throughPosition(items: readonly SearchItem[], hits: readonly PositionHit[]): SearchItem[] {
  const ids = new Set(hits.map((hit) => hit.line.id));
  return items.filter((item) => ids.has(item.id) || item.lines?.some((line) => ids.has(line)));
}
