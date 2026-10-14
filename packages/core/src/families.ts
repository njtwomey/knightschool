import { epdAfterPgn } from './chess';
import { START_EPD } from './epd';
import type { Family, FamilyMeta, OpeningContent } from './schema/content';
import { mainLine } from './tree-helpers';

/** A mid-line position of the course's main line, for a stand-alone family's thumbnail. */
const standAloneEpd = (content: OpeningContent) => {
  const line = mainLine(content);
  return line[Math.min(4, line.length - 1)]?.to ?? START_EPD;
};

const SAN_LINE = (contents: OpeningContent) =>
  mainLine(contents)
    .slice(0, 5)
    .map((edge, i) => `${i % 2 === 0 ? `${i / 2 + 1}. ` : ''}${edge.san}`)
    .join(' ');

/**
 * Groups courses under their opening. `metas` is content/families.yaml; a course whose family is not listed there gets
 * a family of its own made from the course (it cannot be an "against" course, which needs the opening it counters to
 * be described). Throws an Error naming the problem: an unknown or empty family, a bad defining line, a duplicate id.
 */
export function buildFamilies(metas: FamilyMeta[], contents: OpeningContent[]): Family[] {
  const seen = new Set<string>();
  for (const meta of metas) {
    if (seen.has(meta.id)) throw new Error(`content/families.yaml: duplicate family "${meta.id}"`);
    seen.add(meta.id);
  }

  const familyOf = (content: OpeningContent) => content.opening.family ?? content.opening.id;
  const listed = new Set(metas.map((meta) => meta.id));
  const families: Family[] = [];

  for (const meta of metas) {
    const courses = contents.filter((content) => familyOf(content) === meta.id).map((content) => content.opening.id);
    if (courses.length === 0) throw new Error(`content/families.yaml: family "${meta.id}" has no courses`);
    let epd: string;
    try {
      epd = epdAfterPgn(meta.moves);
    } catch {
      throw new Error(`content/families.yaml: "${meta.id}" moves "${meta.moves}" are not a legal sequence`);
    }
    families.push({ ...meta, epd, courses });
  }

  for (const content of contents) {
    const family = familyOf(content);
    if (listed.has(family)) continue;
    if (content.opening.against) {
      throw new Error(
        `${content.opening.id}: it is against "${content.opening.against}" but its family "${family}" is not described in content/families.yaml`,
      );
    }
    // A course nobody grouped stands alone as its own opening.
    families.push({
      id: family,
      name: content.opening.name,
      eco: content.opening.eco,
      summary: content.opening.summary,
      moves: SAN_LINE(content),
      epd: standAloneEpd(content),
      courses: contents.filter((other) => familyOf(other) === family).map((other) => other.opening.id),
    });
    listed.add(family);
  }
  return families;
}
