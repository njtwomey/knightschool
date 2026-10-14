import type { Quiz } from './schema/content';

/**
 * Deliberately not fuzzy search: lowercase, strip punctuation, map a curated list of near-synonyms to one word each,
 * then look for whole words. Predictable, testable and easy to explain to a child. The QuizAttempt log is where
 * evidence will come from if real answers show it is not enough.
 */
const SYNONYMS: Record<string, string[]> = {
  lose: [
    'lose',
    'loses',
    'losing',
    'lost',
    'drop',
    'drops',
    'dropping',
    'dropped',
    'hang',
    'hangs',
    'hanging',
    'hung',
    'en prise',
    'undefended',
    'unprotected',
    'unguarded',
    'free',
  ],
  fork: [
    'fork',
    'forks',
    'forked',
    'forking',
    'attacks two',
    'attacking two',
    'double attack',
    'double attacks',
    'two pieces at once',
  ],
  attack: [
    'attack',
    'attacks',
    'attacking',
    'attacked',
    'hit',
    'hits',
    'hitting',
    'threaten',
    'threatens',
    'threatening',
    'threat',
    'target',
    'targets',
    'chase',
    'chases',
    'chasing',
    'kick',
    'kicks',
    'gains tempo',
    'tempo',
  ],
  defend: [
    'defend',
    'defends',
    'defending',
    'defended',
    'protect',
    'protects',
    'protecting',
    'protected',
    'guard',
    'guards',
    'guarding',
    'guarded',
    'support',
    'supports',
    'supported',
    'cover',
    'covers',
  ],
  pin: ['pin', 'pins', 'pinned', 'pinning'],
  check: ['check', 'checks', 'checking'],
  mate: ['mate', 'mates', 'checkmate', 'checkmates', 'mating'],
  develop: ['develop', 'develops', 'developing', 'developed', 'development'],
  block: ['block', 'blocks', 'blocked', 'blocking', 'bury', 'buries', 'buried', 'shut in', 'trapped in'],
  take: [
    'take',
    'takes',
    'taking',
    'took',
    'capture',
    'captures',
    'capturing',
    'captured',
    'win',
    'wins',
    'winning',
    'won',
  ],
};

// Canonical word for each surface form, split into words so phrases can be matched against a list of words.
const FORMS = Object.entries(SYNONYMS).flatMap(([canonical, surfaces]) =>
  surfaces.map((surface) => ({ words: surface.split(' '), canonical })),
);
const MAX_PHRASE = Math.max(...FORMS.map((form) => form.words.length));

const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** One plural s off long words, so "rooks" and "pawns" match "rook" and "pawn". Squares such as h8 are untouched. */
const singular = (word: string) =>
  word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word;

/**
 * The words of a text with synonyms mapped to one word each, as a space-padded string for whole-word matching.
 * One left-to-right pass taking the longest phrase at each position, so it always finishes.
 */
export function normalise(text: string): string {
  const words = clean(text).split(' ').filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length;) {
    let matched = false;
    for (let length = Math.min(MAX_PHRASE, words.length - i); length >= 1 && !matched; length--) {
      const form = FORMS.find(
        (candidate) => candidate.words.length === length && candidate.words.every((word, k) => word === words[i + k]),
      );
      if (form) {
        out.push(form.canonical);
        i += length;
        matched = true;
      }
    }
    if (!matched) {
      out.push(singular(words[i]!));
      i++;
    }
  }
  return ` ${out.join(' ')} `;
}

const groupMatches = (answer: string, group: string[]) =>
  group.some((word) => {
    const wanted = normalise(word).trim();
    return wanted !== '' && answer.includes(` ${wanted} `);
  });

export type AcceptEntry = Quiz['accept'][number];

/** A group matches if any of its words appears; the entry matches if all groups do, or any group when `all` is false. */
export function entryMatches(answer: string, entry: AcceptEntry): boolean {
  const normalised = normalise(answer);
  if (entry.keywords.length === 0) return false;
  return entry.all
    ? entry.keywords.every((group) => groupMatches(normalised, group))
    : entry.keywords.some((group) => groupMatches(normalised, group));
}

export type QuizResult =
  | { matched: true; feedback: string; entry: number }
  /** `close` is the feedback of a partial entry: nearly there, but graded as a miss. */
  | { matched: false; close?: string };

/** The first accept entry that matches wins. A partial entry gives feedback but does not count as right. */
export function matchAnswer(quiz: Pick<Quiz, 'accept'>, answer: string): QuizResult {
  const index = quiz.accept.findIndex((entry) => entryMatches(answer, entry));
  const entry = quiz.accept[index];
  if (!entry) return { matched: false };
  return entry.partial
    ? { matched: false, close: entry.feedback }
    : { matched: true, feedback: entry.feedback, entry: index };
}
