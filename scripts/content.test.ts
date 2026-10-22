import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AnalysisFile,
  cardDefinitions,
  courseUnits,
  CurriculumEntry,
  GlossaryEntry,
  OpeningContent,
  OpeningGroup,
  OpeningIndexEntry,
  SearchIndex,
  ShippedChapters,
  TreeGraph,
  type CardOptions,
} from '../packages/core/src/index.ts';
import { emitContent, loadPopularity, openingNames } from './content-emit.ts';
import { loadCourses, loadCurriculum, loadGlossary, loadOpeningGroups } from './content-lib.ts';

/** How many positions ask the learner for a move: their turn, with a repertoire move. */
const ourMoves = (content: OpeningContent) =>
  Object.values(content.nodes).filter((node) => node.isOurTurn && node.moves.some((edge) => edge.isRepertoire)).length;

// Builds the real files under content/, so a bad PGN, tag or course.yaml fails `make test`, not just `pnpm content:build`.
describe('content', () => {
  const courses = loadCourses();

  it('reads every course folder, with unique ids and the side of its folder', () => {
    const ids = courses.map((content) => content.opening.id);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists every course once in the study order, after what it depends on', () => {
    expect(
      loadCurriculum(courses)
        .map((entry) => entry.id)
        .sort(),
    ).toEqual(courses.map((content) => content.opening.id).sort());
  });

  it('groups every course under an opening, and names only motifs that exist', () => {
    const groups = loadOpeningGroups(courses);
    const grouped = groups.flatMap((group) => group.courses);
    expect(new Set(grouped).size).toBe(grouped.length); // a course belongs to exactly one opening
    expect(grouped.sort()).toEqual(courses.map((content) => content.opening.id).sort());
    loadGlossary(courses);
  });

  it.each(courses.map((content) => [content.opening.id, content] as const))(
    '%s has cards and a main line',
    (_id, content) => {
      // A course made only of lines borrowed from other courses (`from:`) is for reading: they drill them.
      const borrowedOnly = content.opening.variants.every((variant) => variant.alternative);
      if (borrowedOnly) expect(cardDefinitions(content)).toHaveLength(0);
      else expect(ourMoves(content)).toBeGreaterThanOrEqual(3);
      expect(content.opening.variants[0]!.kind).toBe('line');
    },
  );

  // The study path introduces cards unit by unit: a card in no unit would never be introduced, one in two would be
  // counted twice. Checked under each card setting the app offers.
  const settings: [string, CardOptions][] = [
    ['default settings', {}],
    ['rare lines included', { includeRare: true }],
    ['no popularity cut', { minPopularity: 0 }],
  ];
  it.each(
    courses.flatMap((content) =>
      settings.map(([name, options]) => [content.opening.id, name, content, options] as const),
    ),
  )('%s puts every card in exactly one unit (%s)', (_id, _name, content, options) => {
    const ids = courseUnits(content, options).flatMap((unit) => unit.cards.map((card) => card.id));
    expect(ids.length).toBe(new Set(ids).size);
    expect(new Set(ids)).toEqual(new Set(cardDefinitions(content, options).map((card) => card.id)));
  });
});

/**
 * The app trusts the shipped content at runtime (production casts the JSON it fetches), so the guarantee is here: every
 * file `pnpm content:build` writes to apps/web/public/content is written again into a temporary folder by the same code
 * and parsed with the schema the app reads it with (`apps/web/src/data/content.ts`, `authored-build.ts`,
 * `analysis.ts`). A file the app could not read fails `make test`, and so `make pre-push`.
 */
describe('the content files the app reads', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'knightschool-content-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  emitContent(dir, await openingNames({ offline: true }), loadPopularity(), { quiet: true });
  const read = (file: string): unknown => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const index = z.array(OpeningIndexEntry).parse(read('index.json'));
  const courseFiles = new Set(index.map((entry) => `${entry.id}.json`));
  const schemas: Record<string, z.ZodType> = {
    'index.json': z.array(OpeningIndexEntry),
    'search.json': SearchIndex,
    'openings.json': z.array(OpeningGroup),
    'curriculum.json': z.array(CurriculumEntry),
    'tree.json': TreeGraph,
    'glossary.json': z.array(GlossaryEntry),
    'chapters.json': ShippedChapters,
    'analysis.json': AnalysisFile,
  };
  const files = readdirSync(dir).sort();

  it('writes a file for every course in the index', () => {
    for (const file of courseFiles) expect(files).toContain(file);
  });

  it.each(files)('%s parses with the schema the app reads it with', (file) => {
    const schema = schemas[file] ?? (courseFiles.has(file) ? OpeningContent : undefined);
    // A new kind of file needs its schema here, as well as a loader in the app.
    expect(schema, `no schema for ${file}`).toBeDefined();
    const parsed = schema!.safeParse(read(file));
    expect(parsed.success, parsed.success ? '' : `${file}: ${parsed.error.message.slice(0, 2000)}`).toBe(true);
  });
});
