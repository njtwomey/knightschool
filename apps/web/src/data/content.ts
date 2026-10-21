import {
  ownOpeningGroups,
  CurriculumEntry,
  GlossaryEntry,
  OpeningContent,
  OpeningGroup,
  OpeningIndexEntry,
  SearchIndex,
  TreeGraph,
  type AuthoredBuild,
} from '@knightschool/core';
import { z } from 'zod';
import { fetchContent, onceRetryable } from './fetch-content';
import { authoredIndexEntries, authoredTreeGraph, loadAuthoredBuild } from './authored-content';

/** The shipped courses only (index.json), loaded once. */
export const loadShippedIndex = onceRetryable(() =>
  fetchContent('index.json').then((json) => z.array(OpeningIndexEntry).parse(json)),
);

const shippedIds = async () => (await loadShippedIndex()).map((entry) => entry.id);

/** Every course: the shipped ones, then the ones authored in the app (`data/authored-content.ts`). */
export async function loadIndex(): Promise<OpeningIndexEntry[]> {
  const shipped = await loadShippedIndex();
  const authored = await loadAuthoredBuild(async () => shipped.map((entry) => entry.id)).catch(() => null);
  return authored ? [...shipped, ...authoredIndexEntries(authored, shipped)] : shipped;
}

/** Courses already loaded, by id, for the authored build they were loaded with (a change to it starts again). */
const openings = { build: null as AuthoredBuild | null, byId: new Map<string, () => Promise<OpeningContent>>() };

/**
 * One course: shipped (its JSON), or authored (projected in the browser from the authored rows). Each is loaded once
 * and shared, until something authored changes.
 */
export async function loadOpening(id: string): Promise<OpeningContent> {
  const authored = await loadAuthoredBuild(shippedIds).catch(() => null);
  if (authored !== openings.build) {
    openings.build = authored;
    openings.byId.clear();
  }
  let load = openings.byId.get(id);
  if (!load) {
    const own = authored?.courses.find((content) => content.opening.id === id);
    load = onceRetryable(async () => own ?? OpeningContent.parse(await fetchContent(`${id}.json`)));
    openings.byId.set(id, load);
  }
  return load();
}

/** Every position in every course, for searching with a board. Loaded once, when first needed. */
export const loadSearchIndex = onceRetryable(() => fetchContent('search.json').then((json) => SearchIndex.parse(json)));

/** The openings that courses are grouped under, with who plays each. */
export async function loadOpenings(): Promise<OpeningGroup[]> {
  const shipped = z.array(OpeningGroup).parse(await fetchContent('openings.json'));
  const authored = await loadAuthoredBuild(shippedIds).catch(() => null);
  if (!authored?.courses.length) return shipped;
  // Authored courses join the opening they name, or the "My courses" group of their side.
  const courses = authored.courses.map(({ opening }) => ({
    id: opening.id,
    side: opening.side,
    opening: opening.opening,
  }));
  return [
    ...shipped.map((group) => ({
      ...group,
      courses: [
        ...group.courses,
        ...courses.filter((course) => course.opening === group.id).map((course) => course.id),
      ],
    })),
    ...ownOpeningGroups(courses),
  ];
}

/** The study order and what each course depends on. */
export async function loadCurriculum(): Promise<CurriculumEntry[]> {
  return z.array(CurriculumEntry).parse(await fetchContent('curriculum.json'));
}

/** The whole theory tree (`tree.json`): every chapter with its moves and the courses that list it. */
export async function loadTreeGraph(): Promise<TreeGraph> {
  const authored = await loadAuthoredBuild(shippedIds).catch(() => null);
  if (authored && authored.chapters.length > 0) return authoredTreeGraph(authored, await loadShippedIndex());
  return TreeGraph.parse(await fetchContent('tree.json'));
}

/** The motif vocabulary, each with the courses that use it. */
export async function loadGlossary(): Promise<GlossaryEntry[]> {
  return z.array(GlossaryEntry).parse(await fetchContent('glossary.json'));
}
