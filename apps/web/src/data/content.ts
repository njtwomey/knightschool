import {
  ownOpeningGroups,
  CurriculumEntry,
  GlossaryEntry,
  OpeningContent,
  OpeningGroup,
  OpeningIndexEntry,
  SearchIndex,
  TreeGraph,
} from '@knightschool/core';
import { z } from 'zod';
import { authoredIndexEntries, authoredTreeGraph, loadAuthoredBuild } from './authored';

// Written by `pnpm content:build`. Served from the same origin, so offline caching (Phase 8) can precache them.
const url = (file: string) => `${import.meta.env.BASE_URL}content/${file}`;

async function fetchJson(file: string): Promise<unknown> {
  const response = await fetch(url(file));
  if (!response.ok) throw new Error(`Could not load ${file} (${response.status}). Run \`pnpm content:build\`.`);
  return response.json();
}

let shippedIndex: Promise<OpeningIndexEntry[]> | undefined;

/** The shipped courses only (index.json), loaded once. */
export function loadShippedIndex(): Promise<OpeningIndexEntry[]> {
  shippedIndex ??= fetchJson('index.json').then((json) => z.array(OpeningIndexEntry).parse(json));
  shippedIndex.catch(() => {
    shippedIndex = undefined; // allow a retry after a failed load
  });
  return shippedIndex;
}

const shippedIds = async () => (await loadShippedIndex()).map((entry) => entry.id);

/** Every course: the shipped ones, then the ones authored in the app (`data/authored.ts`). */
export async function loadIndex(): Promise<OpeningIndexEntry[]> {
  const shipped = await loadShippedIndex();
  const authored = await loadAuthoredBuild(async () => shipped.map((entry) => entry.id)).catch(() => null);
  return authored ? [...shipped, ...authoredIndexEntries(authored, shipped)] : shipped;
}

/** One course: shipped (its JSON), or authored (projected in the browser from the authored rows). */
export async function loadOpening(id: string): Promise<OpeningContent> {
  const authored = await loadAuthoredBuild(shippedIds).catch(() => null);
  const own = authored?.courses.find((content) => content.opening.id === id);
  if (own) return own;
  return OpeningContent.parse(await fetchJson(`${id}.json`));
}

let searchIndex: Promise<SearchIndex> | undefined;

/** Every position in every course, for searching with a board. Loaded once, when first needed. */
export function loadSearchIndex(): Promise<SearchIndex> {
  searchIndex ??= fetchJson('search.json').then((json) => SearchIndex.parse(json));
  searchIndex.catch(() => {
    searchIndex = undefined; // allow a retry after a failed load
  });
  return searchIndex;
}

/** The openings that courses are grouped under, with who plays each. */
export async function loadOpenings(): Promise<OpeningGroup[]> {
  const shipped = z.array(OpeningGroup).parse(await fetchJson('openings.json'));
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
  return z.array(CurriculumEntry).parse(await fetchJson('curriculum.json'));
}

/** The whole theory tree (`tree.json`): every chapter with its moves and the courses that list it. */
export async function loadTreeGraph(): Promise<TreeGraph> {
  const authored = await loadAuthoredBuild(shippedIds).catch(() => null);
  if (authored && authored.chapters.length > 0) return authoredTreeGraph(authored, await loadShippedIndex());
  return TreeGraph.parse(await fetchJson('tree.json'));
}

/** The motif vocabulary, each with the courses that use it. */
export async function loadGlossary(): Promise<GlossaryEntry[]> {
  return z.array(GlossaryEntry).parse(await fetchJson('glossary.json'));
}
