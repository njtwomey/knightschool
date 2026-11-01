import { z } from 'zod';
import { START_EPD } from '../chess/epd';
import { replay } from '../chess/play';
import { matchAnswer } from './match';

/**
 * A question in words about a position (v1's quizzes), written under a variation in content/openings/<id>.yaml:
 * where it is asked (moves from the start), what is asked, the keyword groups that accept an answer, examples the
 * build checks against the matcher, and the explanation shown once answered.
 */
export const QuestionEntry = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-case words joined by hyphens'),
  at: z.string().min(1),
  ask: z.string().min(1),
  answers: z.array(z.array(z.string().min(1)).min(1)).min(1),
  examples: z.object({ right: z.array(z.string()).min(1), wrong: z.array(z.string()).default([]) }),
  explain: z.string().min(1),
});
export type QuestionEntry = z.infer<typeof QuestionEntry>;

/** A question as shipped in the built opening: its position replayed, the examples left behind. */
export type BuiltQuestion = {
  id: string;
  variation: string;
  /** The moves from the start that reach it, as UCI and SAN. */
  moves: string[];
  sans: string[];
  epd: string;
  ask: string;
  answers: string[][];
  explain: string;
};

/** The SAN moves of a movetext: move numbers and results dropped ("1. e4 e5 2. Nf3" is e4, e5, Nf3). */
export const movetextSans = (text: string): string[] =>
  text
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\s(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

/**
 * The questions of an opening's variations, checked: ids unique, every `at` move legal, every right example accepted
 * by the matcher and every wrong one refused. Throws, naming the opening, the question and the problem.
 */
export function buildQuestions(
  openingId: string,
  variations: readonly { id: string; questions?: readonly QuestionEntry[] }[],
): BuiltQuestion[] {
  const seen = new Set<string>();
  const built: BuiltQuestion[] = [];
  for (const variation of variations) {
    for (const question of variation.questions ?? []) {
      const where = `${openingId}: question "${question.id}"`;
      if (seen.has(question.id)) throw new Error(`${where} is listed twice (ids are unique within an opening)`);
      seen.add(question.id);
      const sans = movetextSans(question.at);
      const played = replay(START_EPD, sans);
      if (played.length !== sans.length) {
        throw new Error(`${where}: "${sans[played.length]}" (move ${played.length + 1} of "at") is not legal there`);
      }
      for (const example of question.examples.right) {
        if (!matchAnswer(example, question.answers)) {
          throw new Error(`${where}: the right example "${example}" is not accepted by its answers`);
        }
      }
      for (const example of question.examples.wrong) {
        if (matchAnswer(example, question.answers)) {
          throw new Error(`${where}: the wrong example "${example}" is accepted by its answers`);
        }
      }
      built.push({
        id: question.id,
        variation: variation.id,
        moves: played.map((move) => move.uci),
        sans: played.map((move) => move.san),
        epd: played.at(-1)?.epd ?? START_EPD,
        ask: question.ask,
        answers: question.answers.map((group) => [...group]),
        explain: question.explain,
      });
    }
  }
  return built;
}
