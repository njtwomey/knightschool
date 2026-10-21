import { z } from 'zod';
import { Slug } from './tags';

/** One quiz as authored in quizzes.yaml: the position is given as moves, and the answers can carry examples to check. */
export const QuizEntry = z.object({
  id: Slug,
  /** SAN from the start position to the position the question is about, e.g. "1. e4 e5 2. Nf3". */
  line: z.string().min(1),
  prompt: z.string().min(1),
  accept: z
    .array(
      z.object({
        keywords: z.array(z.array(z.string())),
        all: z.boolean().default(false),
        feedback: z.string().min(1),
        partial: z.boolean().default(false),
      }),
    )
    .min(1),
  reveal: z.string().min(1),
  /** SAN of the move to play on the board when revealing, from the quiz position. */
  showMove: z.string().optional(),
  /** Answers that must match an entry, and answers that must not, checked when the course is built. */
  examples: z
    .object({ match: z.array(z.string()).default([]), miss: z.array(z.string()).default([]) })
    .default({ match: [], miss: [] }),
});
export type QuizEntry = z.infer<typeof QuizEntry>;
