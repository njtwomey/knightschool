import {
  CurriculumEntry,
  GlossaryEntry,
  OpeningContent,
  OpeningGroup,
  OpeningIndexEntry,
  SearchIndex,
} from '@knightschool/core';
import { z } from 'zod';

// Written by `pnpm content:build`. Served from the same origin, so offline caching (Phase 8) can precache them.
const url = (file: string) => `${import.meta.env.BASE_URL}content/${file}`;

async function fetchJson(file: string): Promise<unknown> {
  const response = await fetch(url(file));
  if (!response.ok) throw new Error(`Could not load ${file} (${response.status}). Run \`pnpm content:build\`.`);
  return response.json();
}

export async function loadIndex(): Promise<OpeningIndexEntry[]> {
  return z.array(OpeningIndexEntry).parse(await fetchJson('index.json'));
}

export async function loadOpening(id: string): Promise<OpeningContent> {
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
  return z.array(OpeningGroup).parse(await fetchJson('openings.json'));
}

/** The study order and what each course depends on. */
export async function loadCurriculum(): Promise<CurriculumEntry[]> {
  return z.array(CurriculumEntry).parse(await fetchJson('curriculum.json'));
}

/** The motif vocabulary, each with the courses that use it. */
export async function loadGlossary(): Promise<GlossaryEntry[]> {
  return z.array(GlossaryEntry).parse(await fetchJson('glossary.json'));
}
