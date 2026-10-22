import { z } from 'zod';

/** The part of a Lichess explorer reply we use. Anything else in the reply is ignored. */
export const ExplorerResponse = z.object({
  white: z.number().int(),
  draws: z.number().int(),
  black: z.number().int(),
  moves: z.array(
    z.object({
      uci: z.string(),
      san: z.string(),
      white: z.number().int(),
      draws: z.number().int(),
      black: z.number().int(),
    }),
  ),
  opening: z.object({ eco: z.string(), name: z.string() }).nullish(),
});
export type ExplorerResponse = z.infer<typeof ExplorerResponse>;
