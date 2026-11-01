import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import type { IdeasFile, TracksFile } from '@knightschool/core/content';

/** What content:build ships in catalog.json (scripts/content/build.ts). */
export type Catalog = {
  openings: {
    id: string;
    name: string;
    side: 'white' | 'black';
    level: 'first' | 'next' | 'further';
    style: string[];
    summary: string;
    startEpd: string;
    variations: string[];
    lines: number;
    steps: number;
    moves: number;
  }[];
  ideas: IdeasFile;
  tracks: TracksFile;
};

export type ShippedPuzzle = {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  level: string;
};

const loaded = new Map<string, Promise<unknown>>();

/** Fetches a built content file once per visit (a failed load is tried again next time). */
function load<T>(path: string): Promise<T> {
  const cached = loaded.get(path);
  if (cached) return cached as Promise<T>;
  const request = fetch(`${import.meta.env.BASE_URL}content/${path}`).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
    return (await response.json()) as T;
  });
  loaded.set(path, request);
  request.catch(() => loaded.delete(path));
  return request;
}

export const loadCatalog = () => load<Catalog>('catalog.json');
export const loadOpening = (id: string) => load<BuiltOpening>(`openings/${id}.json`);
export const loadFacts = (id: string) => load<OpeningFacts>(`openings/${id}.facts.json`);
export const loadPuzzles = (id: string) =>
  load<{ puzzles: ShippedPuzzle[] } | ShippedPuzzle[]>(`openings/${id}.puzzles.json`).catch(() => []);
