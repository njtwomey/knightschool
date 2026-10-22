import { z } from 'zod';

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
  /** The opening this position belongs to: its own name (Lichess's list), or the nearest named position before it. */
  name: z.string().optional(),
});
export type SearchEntry = z.infer<typeof SearchEntry>;

/** Every position in every course, keyed by EPD, so a board can be used as a search field. */
export const SearchIndex = z.record(z.string(), SearchEntry);
export type SearchIndex = z.infer<typeof SearchIndex>;
