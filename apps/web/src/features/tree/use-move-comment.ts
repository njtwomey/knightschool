import { loadOpening } from '@/data/content';
import { useAsync } from '@/hooks/use-async';

/** A course's content; null if it cannot be loaded (the comment is simply not shown). */
const contentOf = (course: string) => loadOpening(course).catch(() => null);

/** The comment on a move, from the first of the given courses that has one. */
export function useMoveComment(
  courses: readonly string[],
  fromEpd: string | undefined,
  uci: string | null,
): string | null {
  const comment = useAsync(
    fromEpd && uci
      ? async () => {
          for (const course of courses) {
            const content = await contentOf(course);
            const text = content?.nodes[fromEpd]?.moves.find((move) => move.uci === uci)?.annotation?.text;
            if (text) return text;
          }
          return null;
        }
      : null,
    [courses.join(','), fromEpd, uci],
  );
  return fromEpd && uci && !comment.loading ? (comment.data ?? null) : null;
}
