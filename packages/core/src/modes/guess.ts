import type { OpeningIndexEntry } from '../schema/content';
import type { SearchIndex } from '../search/position-search';
import { searchAt } from '../search/position-search';

/** How close an answer was: the variation (full), just the opening (partial), or neither. */
export type GuessResult = 'full' | 'partial' | 'miss';

/** The names that are right for a position: the openings it belongs to, and the variations that reach it. */
export type GuessTargets = { openings: string[]; variations: string[] };

// Words that carry no meaning on their own. "Caro-Kann" is the opening; "Defence" is just how it is written.
const FILLER = new Set([
  'the',
  'a',
  'of',
  'variation',
  'line',
  'system',
  'defence',
  'game',
  'gambit',
  'opening',
  'and',
]);

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/defense/g, 'defence')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean);

const meaningful = (text: string) => words(text).filter((word) => !FILLER.has(word));

/** True when every meaningful word of `name` is in the answer. A name with nothing meaningful never matches. */
function covers(answer: Set<string>, name: string): boolean {
  const needed = meaningful(name);
  return needed.length > 0 && needed.every((word) => answer.has(word));
}

/**
 * The right answers for a position, from what the courses say about it. Transpositions count: every course whose
 * lines pass through the position contributes its name and the names of its lines that do.
 */
export function guessTargets(index: SearchIndex, epd: string, courses: OpeningIndexEntry[]): GuessTargets {
  const found = searchAt(index, epd, 'both');
  const openings = new Set<string>();
  const variations = new Set<string>();
  if (!found) return { openings: [], variations: [] };
  for (const hit of found.lines) {
    const course = courses.find((candidate) => candidate.id === hit.course);
    if (!course) continue;
    openings.add(course.name);
    const line = course.lines.find((candidate) => candidate.id === hit.line);
    if (line) variations.add(line.name);
  }
  for (const name of openings) variations.delete(name);
  return { openings: [...openings], variations: [...variations] };
}

/** A name made of moves ("3.Nxe5 dxe4 4.d4") cannot be typed as a name, so it is shown but never required. */
const isMoves = (name: string) => /\d\./.test(name);

/**
 * The parts of a variation's name that identify it, so naming any one is enough: "Alapin Variation, Smith-Morra
 * Declined" is named by "alapin" or by "smith morra declined". Words that are just the opening's own name are dropped.
 */
function identifiers(variation: string, openings: string[]): string[] {
  const own = new Set(openings.flatMap(meaningful));
  return variation
    .split(/[:,]/)
    .filter((part) => meaningful(part).some((word) => !own.has(word)))
    .map((part) =>
      meaningful(part)
        .filter((word) => !own.has(word))
        .join(' '),
    );
}

/**
 * More variations than this reach a position, and the position cannot tell them apart (after 1.e4 d5 a dozen Scandinavian
 * lines all share it), so the opening alone is the right answer.
 */
export const MAX_TELLABLE_VARIATIONS = 4;

/**
 * Grades a typed answer. Any one of the right names is enough, and the order and spelling of the words do not matter:
 * "advance caro kann" is the Caro-Kann, Advance Variation. Naming a variation is full credit, naming only the
 * opening is partial, unless so many variations share the position that it cannot tell them apart.
 */
export function gradeGuess(answer: string, targets: GuessTargets): { result: GuessResult; matched?: string } {
  const typed = new Set(words(answer));
  const named = targets.variations.filter((name) => !isMoves(name));
  const tellable = named.length <= MAX_TELLABLE_VARIATIONS;
  const variation = named.find((name) => identifiers(name, targets.openings).some((part) => covers(typed, part)));
  if (variation) return { result: 'full', matched: variation };
  const opening = targets.openings.find((name) => covers(typed, name));
  if (opening) return { result: named.length === 0 || !tellable ? 'full' : 'partial', matched: opening };
  return { result: 'miss' };
}

/** Every name worth suggesting while typing: openings, courses and variations, once each. */
export function guessSuggestions(courses: OpeningIndexEntry[]): string[] {
  const names = new Set<string>();
  for (const course of courses) {
    names.add(course.name);
    for (const line of course.lines) names.add(line.name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Names whose words all start with what has been typed so far, best (shortest) first. */
export function suggest(all: string[], typed: string, limit = 6): string[] {
  const needles = words(typed);
  if (needles.length === 0) return [];
  return all
    .filter((name) => {
      const parts = words(name);
      return needles.every((needle) => parts.some((part) => part.startsWith(needle)));
    })
    .sort((a, b) => a.length - b.length)
    .slice(0, limit);
}

const POINTS: Record<GuessResult, number> = { full: 1, partial: 0.5, miss: 0 };
export const guessPoints = (result: GuessResult) => POINTS[result];

/** How "Name That Opening" has gone: points are 1 for a variation, half for just the opening. */
export function guessSummary(attempts: { result: GuessResult }[]): {
  total: number;
  full: number;
  partial: number;
  miss: number;
  points: number;
  /** Points over attempts, or null before the first answer. */
  accuracy: number | null;
} {
  const count = (result: GuessResult) => attempts.filter((attempt) => attempt.result === result).length;
  const points = attempts.reduce((sum, attempt) => sum + POINTS[attempt.result], 0);
  return {
    total: attempts.length,
    full: count('full'),
    partial: count('partial'),
    miss: count('miss'),
    points,
    accuracy: attempts.length === 0 ? null : points / attempts.length,
  };
}

/**
 * How likely a position is to be asked, from how it went last time: never seen is common, missed is most common, and
 * one answered in full is rare. This is what makes the game feel like a review.
 */
export function guessWeight(last: GuessResult | undefined): number {
  if (last === undefined) return 2;
  return last === 'miss' ? 4 : last === 'partial' ? 3 : 0.5;
}

/** The latest result for each position, from attempts in any order (the newest `at` wins). */
export function lastResults(attempts: { epd: string; at: string; result: GuessResult }[]): Map<string, GuessResult> {
  const newest = new Map<string, { at: string; result: GuessResult }>();
  for (const attempt of attempts) {
    const seen = newest.get(attempt.epd);
    if (!seen || attempt.at > seen.at) newest.set(attempt.epd, attempt);
  }
  return new Map([...newest].map(([epd, { result }]) => [epd, result]));
}
