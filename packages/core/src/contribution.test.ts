import { describe, expect, it } from 'vitest';
import { buildAuthored } from './authoring';
import {
  CONTRIBUTION_KINDS,
  contributionYaml,
  issueFields,
  issueUrl,
  MAX_ISSUE_URL,
  readContribution,
  type Contribution,
} from './contribution';
import { parsePgn } from './pgn';

const headers = `[Event "Knight School"]
[Opening "My Italian"]
[ECO "C50"]
[Character "solid"]
[Risk "low"]
[EarlyMate "none"]
[Tricks "none"]
[For "white"]`;
const main = `${headers}
[Variation "Main line"]
[Kind "main"]
[Opponent "1...e5"]
[Description "The quiet way, with \\"c3\\" and d3."]

1. e4 e5 2. Nf3 { Develops. [%tag tip] } 2... Nc6 3. Bc4 Bc5 4. c3 *
`;
const branch = `${headers}
[Variation "Main line, 3...Nf6"]
[Kind "sideline"]
[Opponent "3...Nf6"]
[Snapshot "7"]
[Start "my-italian-main 3.Bc4"]

3... Nf6 { [%tag trap] } 4. d3 Be7 ( 4... h6 5. O-O ) *
`;
const contribution: Contribution = {
  courseId: 'my-italian',
  manifest: {
    name: 'My Italian',
    side: 'white',
    opening: 'my-white-courses',
    tier: 1,
    trigger: '',
    summary: 'Mine.',
    about: { idea: 'x', risks: 'y', suits: 'z' },
    plans: [],
    motifs: [],
    tags: [],
    lines: ['my-italian-main', { id: 'my-italian-3-nf6', alternative: false, section: 'Two Knights' }],
    units: { order: ['my-italian-3-nf6:1'], after: {}, drop: {} },
  },
  chapters: [
    { id: 'my-italian-main', pgn: main },
    { id: 'my-italian-3-nf6', pgn: branch },
  ],
};

/** The query of a link, decoded. */
const paramsOf = (url: string) =>
  Object.fromEntries(
    url
      .split('?')[1]!
      .split('&')
      .map((pair) => pair.split('=').map((part) => decodeURIComponent(part)) as [string, string]),
  );

describe('contributions', () => {
  const yaml = contributionYaml(contribution);

  it('are readable YAML: the course entry, then each chapter with its headers and its moves as PGN', () => {
    expect(yaml).toMatch(
      /^knightschool: contribution\nversion: 1\ncourse:\n {2}id: my-italian\n {2}name: My Italian\n/,
    );
    expect(yaml).toContain('moves: 3... Nf6 { [%tag trap] } 4. d3 Be7 ( 4... h6 5. O-O )');
    expect(yaml).toContain('Start: my-italian-main 3.Bc4');
  });

  it('read back to the same chapters, course and YAML', () => {
    const read = readContribution(yaml);
    expect(read.courseId).toBe('my-italian');
    expect(read.manifest).toEqual(contribution.manifest);
    expect(read.chapters.map((chapter) => [chapter.id, parsePgn(chapter.pgn)])).toEqual(
      contribution.chapters.map((chapter) => [chapter.id, parsePgn(chapter.pgn)]),
    );
    expect(contributionYaml(read)).toBe(yaml);
  });

  it('build into a course, as the app loads them', () => {
    const read = readContribution(yaml);
    const built = buildAuthored([], {
      chapters: read.chapters,
      courses: [{ id: read.courseId, manifest: JSON.stringify(read.manifest) }],
    });
    expect(built.problems).toEqual([]);
    expect(built.courses[0]!.opening.variants.map((variant) => variant.id)).toEqual([
      'my-italian-main',
      'my-italian-3-nf6',
    ]);
  });

  it.each([
    ['not YAML', 'course: [', /^This is not YAML/],
    ['something else', 'name: x', /^This is not a Knight School contribution: knightschool/],
    ['a bad course', yaml.replace('side: white', 'side: purple'), /^The course in it is not valid: side/],
    ['bad moves', yaml.replace('3... Nf6 {', '3... Nf6 (('), /chapter my-italian-3-nf6: cannot parse PGN/],
  ])('say plainly what is wrong with %s', (_name, text, message) => {
    expect(() => readContribution(text)).toThrow(message);
  });
});

describe('the link to propose it', () => {
  it('carries the title and the YAML in the contribution form when it fits', () => {
    const { url, full } = issueUrl('Contribution: My Italian', 'knightschool: contribution\n');
    expect(full).toBe(true);
    const params = paramsOf(url);
    expect(url.startsWith('https://github.com/njtwomey/knightschool/issues/new?')).toBe(true);
    expect(params).toEqual({
      template: 'contribution.yml',
      title: 'Contribution: My Italian',
      contribution: 'knightschool: contribution\n',
    });
  });

  it('fills in what the form asks that the course already says', () => {
    const fields = issueFields(contribution);
    expect(fields.kind).toBe(CONTRIBUTION_KINDS.course);
    expect(fields.what).toBe('My Italian, played as white.\n\nMine.\n\nx\n\nLines: Main line; Main line, 3...Nf6.');
    expect(fields.existing).toMatch(/course of its own/);
    expect(fields.why).toBe('z');
    // Lines that grow from the app's own chapters say so, and the kind follows.
    const grows = issueFields({
      ...contribution,
      manifest: { ...contribution.manifest, opening: 'italian-game' },
      chapters: [{ id: 'my-italian-3-nf6', pgn: branch }],
    });
    expect(grows.kind).toBe(CONTRIBUTION_KINDS.lines);
    expect(grows.existing).toBe(
      'Adds to the opening italian-game.\nIt grows from these lines already in the app: my-italian-main, after 3.Bc4.',
    );
    const params = paramsOf(issueUrl('Contribution: My Italian', 'yaml', fields).url);
    expect(params).toMatchObject({ ...fields, contribution: 'yaml' });
  });

  it('falls back to a short note when the YAML would make it too long', () => {
    const long = 'moves: ' + '1. e4 e5 '.repeat(1500);
    const { url, full } = issueUrl('Contribution: Long', long);
    expect(full).toBe(false);
    expect(url.length).toBeLessThanOrEqual(MAX_ISSUE_URL);
    expect(paramsOf(url).contribution).toMatch(/paste the YAML here/);
  });
});
