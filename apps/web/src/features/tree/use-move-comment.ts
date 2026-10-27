import type { Annotation } from '@knightschool/core';
import { loadOpening } from '@/data/content';
import { useAsync } from '@/hooks/use-async';

/** A course's content; null if it cannot be loaded (the comment is simply not shown). */
const contentOf = (course: string) => loadOpening(course).catch(() => null);

/** The note on a move (its comment and marks), from the first of the given courses that has one. */
export function useMoveComment(
  courses: readonly string[],
  fromEpd: string | undefined,
  uci: string | null,
): Annotation | null {
  const comment = useAsync(
    fromEpd && uci
      ? async () => {
          for (const course of courses) {
            const content = await contentOf(course);
            const note = content?.nodes[fromEpd]?.moves.find((move) => move.uci === uci)?.annotation;
            if (note?.text || note?.arrows.length || note?.circles.length) return note;
          }
          return null;
        }
      : null,
    [courses.join(','), fromEpd, uci],
  );
  return fromEpd && uci && !comment.loading ? (comment.data ?? null) : null;
}
