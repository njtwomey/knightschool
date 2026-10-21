import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { isOwnOpening } from './authoring';
import { parsePgn, writePgn } from '../chess/pgn';
import { CourseManifest } from '../schema/content';
import { parseStart } from '../content/theory-tree';
import { z } from 'zod';

/**
 * A contribution: lines written in the app, proposed for the repository. One YAML document holds the course entry
 * (course.yaml, with its id) and the chapters it needs, each with its headers and its moves as PGN movetext, so a
 * reviewer can read it, paste the moves into any chess tool, and an accepted one becomes files in content/. The app
 * reads it back with the same parsers (`readContribution`).
 */
export const CONTRIBUTION_VERSION = 1;

const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case only');

export const ContributionFile = z.object({
  knightschool: z.literal('contribution'),
  version: z.literal(CONTRIBUTION_VERSION),
  course: z.object({ id: Slug }).loose(),
  chapters: z
    .array(
      z.object({
        id: Slug,
        headers: z.record(z.string(), z.string()),
        /** The chapter's own moves, numbered from where it starts ("5... Ba5 6. d4 { Takes the centre. } ..."). */
        moves: z.string(),
      }),
    )
    .default([]),
});

/** What a contribution carries, in the form the app stores: the course as course.yaml data, chapters as PGN text. */
export type Contribution = {
  courseId: string;
  manifest: CourseManifest;
  chapters: { id: string; pgn: string }[];
};

/** How many plies come before a chapter's own moves: none, or up to and including its [Start] move. */
const startPlyOf = (headers: Record<string, string>, source: string) => {
  const start = parseStart(headers.Start, source);
  return start ? start.ply + 1 : 0;
};

/** The YAML of a contribution. Chapters keep their headers in PGN order; moves are written as PGN movetext. */
export function contributionYaml(contribution: Contribution): string {
  const document = {
    knightschool: 'contribution',
    version: CONTRIBUTION_VERSION,
    // In course.yaml's own key order, so writing what was read gives the same text.
    course: { id: contribution.courseId, ...CourseManifest.parse(contribution.manifest) },
    chapters: contribution.chapters.map(({ id, pgn }) => {
      const game = parsePgn(pgn, `${id}.pgn`);
      const movetext = writePgn({ tags: {}, moves: game.moves }, startPlyOf(game.tags, `${id}.pgn`))
        .trim()
        .replace(/\s*\*$/, '');
      return { id, headers: game.tags, moves: movetext };
    }),
  };
  return stringifyYaml(document, { lineWidth: 100 });
}

/**
 * Reads a contribution written by `contributionYaml` (or by hand in the same shape). Throws with a plain message naming
 * what is wrong: not YAML, not a contribution, a course that is not a valid course.yaml, or a chapter whose moves are
 * not PGN.
 */
export function readContribution(text: string): Contribution {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (error) {
    throw new Error(`This is not YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
  const parsed = ContributionFile.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      `This is not a Knight School contribution: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'file'}: ${issue.message}`)
        .join('; ')}`,
    );
  const { id: courseId, ...rest } = parsed.data.course;
  const manifest = CourseManifest.safeParse(rest);
  if (!manifest.success)
    throw new Error(
      `The course in it is not valid: ${manifest.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  const chapters = parsed.data.chapters.map(({ id, headers, moves }) => {
    const pgn = writePgn({ tags: headers, moves: [] }).replace(/\s*\*\s*$/, '') + `${moves.trim()} *\n`;
    parsePgn(pgn, `chapter ${id}`); // throws, naming the chapter, when its moves are not PGN
    return { id, pgn };
  });
  return { courseId, manifest: manifest.data, chapters };
}

/** The kinds offered by the form's first question; the text must match its options exactly. */
export const CONTRIBUTION_KINDS = {
  course: 'A new course',
  lines: 'New lines for a course in the app',
} as const;

/** The form's other fields the app can answer from the course: field id to text. The contributor edits them. */
export type IssueFields = { kind: string; what: string; existing: string; why: string };

/**
 * What the contribution form can be given ready-made: whether it is a course of its own or adds to the app's openings,
 * what it is (the course's name, side, summary, idea and lines), what it builds on (the app's chapters its lines grow
 * from) and who it suits.
 */
export function issueFields({ manifest, chapters }: Contribution): IssueFields {
  const own = isOwnOpening(manifest.opening);
  const ids = new Set(chapters.map((chapter) => chapter.id));
  const titles: string[] = [];
  const grows = new Set<string>();
  for (const chapter of chapters) {
    const headers = parsePgn(chapter.pgn).tags;
    titles.push(headers.Variation || chapter.id);
    const start = headers.Start?.trim();
    const parent = start?.split(/\s+/)[0];
    if (start && parent && !ids.has(parent)) grows.add(`${parent}, after ${start.slice(parent.length).trim()}`);
  }
  const what = [
    `${manifest.name}, played as ${manifest.side}.`,
    manifest.summary,
    manifest.about.idea,
    `Lines: ${titles.join('; ')}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const existing = [
    own
      ? 'A course of its own: it does not belong to any opening in the app yet.'
      : `Adds to the opening ${manifest.opening}.`,
    grows.size ? `It grows from these lines already in the app: ${[...grows].join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    kind: own ? CONTRIBUTION_KINDS.course : CONTRIBUTION_KINDS.lines,
    what,
    existing,
    why: manifest.about.suits,
  };
}

/** Where contributions are proposed: a new issue on the repository, with the contribution form. */
export const ISSUE_URL = 'https://github.com/njtwomey/knightschool/issues/new';
/** Browsers and GitHub refuse links much longer than about 8 KB; past this, the YAML goes by clipboard or file. */
export const MAX_ISSUE_URL = 7500;

/**
 * The link that opens the contribution form with the title and the YAML filled in (`full`), or, when that would be
 * longer than `MAX_ISSUE_URL`, with a short note asking for the YAML to be pasted or attached instead.
 */
export function issueUrl(
  title: string,
  yaml: string,
  fields: IssueFields | Record<string, never> = {},
): { url: string; full: boolean } {
  const query = (params: Record<string, string>) =>
    Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  const link = (contribution: string) =>
    `${ISSUE_URL}?${query({ template: 'contribution.yml', title, ...fields, contribution })}`;
  const full = link(yaml);
  if (full.length <= MAX_ISSUE_URL) return { url: full, full: true };
  return {
    url: link(
      '# Too long for the link: paste the YAML here (Knight School copied it), or attach the downloaded file below.',
    ),
    full: false,
  };
}
