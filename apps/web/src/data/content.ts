import type { BuiltOpening, OpeningFacts, OpeningNames } from '@knightschool/core/content';
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
  /** What content:build ships beside these (scripts/puzzles): how often played, who solves, and what it matched. */
  popularity?: number;
  plays?: number;
  solver?: 'white' | 'black';
  /** The opening's side solves. */
  mine?: boolean;
  /** The opening's position it was matched at, the line that holds it, and what matched (a tag, structure or theme). */
  position?: string;
  line?: string | null;
  by?: string;
  /** The game on Lichess and the ply: `fU9DCMlT#19`. */
  game?: string;
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
/** The Lichess names of an opening's positions and variations (Name it); none when the build had no names. */
export const loadNames = (id: string) =>
  load<OpeningNames>(`openings/${id}.names.json`).catch((): OpeningNames => ({ positions: {}, variations: {} }));
/** Every Lichess opening name, for Name it's suggestions. */
export const loadNameList = () => load<string[]>('names.json').catch((): string[] => []);
