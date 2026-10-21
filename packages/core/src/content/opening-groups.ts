import type { OpeningGroup, OpeningMeta } from '../schema/content';
import { epdAfterPgn } from '../chess/chess';

/**
 * Groups courses under their opening. `metas` is content/openings.yaml. Throws a plain Error for a course that names
 * an opening that is not listed, an opening with no course, or defining moves that are not legal.
 */
export function buildOpeningGroups(metas: OpeningMeta[], courses: { id: string; opening: string }[]): OpeningGroup[] {
  const ids = new Set(metas.map((meta) => meta.id));
  if (ids.size !== metas.length) throw new Error('content/openings.yaml: an opening id is listed twice');
  for (const course of courses) {
    if (!ids.has(course.opening)) {
      throw new Error(
        `${course.id}: course.yaml says opening "${course.opening}", which is not in content/openings.yaml`,
      );
    }
  }
  return metas.map((meta) => {
    const own = courses.filter((course) => course.opening === meta.id).map((course) => course.id);
    if (own.length === 0) throw new Error(`content/openings.yaml: "${meta.id}" has no course`);
    let epd: string;
    try {
      epd = epdAfterPgn(meta.moves);
    } catch {
      throw new Error(`content/openings.yaml: "${meta.id}" has moves "${meta.moves}" that are not legal`);
    }
    return { ...meta, epd, courses: own };
  });
}
