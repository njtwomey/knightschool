/**
 * The committed data files, as JSON Lines (a meta line, then one record per line, sorted by key): engine analysis,
 * explorer counts and puzzle selections. Every script reads and writes them through here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonl, writeJsonl } from '../packages/core/src/data/jsonl.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
export const analysisPath = join(root, 'content/analysis/analysis.jsonl');
export const popularityPath = join(root, 'content/popularity/popularity.jsonl');
export const selectionPath = (opening: string) => join(root, 'content/puzzles', `${opening}.jsonl`);

export type AnalysisLine = { cp?: number; mate?: number; pv: string[] };
export type AnalysisEntry = { depth: number; lines: AnalysisLine[] };
export type AnalysisMeta = { kind: 'analysis'; engine: string; threads: number; hash: number; date: string };
export type PopularityEntry = {
  white: number;
  draws: number;
  black: number;
  at?: string;
  moves: { uci: string; san: string; white: number; draws: number; black: number }[];
};
export type PopularityMeta = { kind: 'popularity'; speeds: string[]; ratings: number[]; date: string };

const sorted = <T>(map: Record<string, T>) => Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));

function readKeyed<M, T>(path: string): { meta: M | undefined; byEpd: Record<string, T> } {
  if (!existsSync(path)) return { meta: undefined, byEpd: {} };
  const { meta, rows } = readJsonl<M, { epd: string } & T>(readFileSync(path, 'utf8'), path);
  return { meta, byEpd: Object.fromEntries(rows.map(({ epd, ...entry }) => [epd, entry as unknown as T])) };
}

export const readAnalysis = () => readKeyed<AnalysisMeta, AnalysisEntry>(analysisPath);
export const readPopularity = () => readKeyed<PopularityMeta, PopularityEntry>(popularityPath);

export function writeAnalysis(meta: AnalysisMeta, byEpd: Record<string, AnalysisEntry>): void {
  writeFileSync(
    analysisPath,
    writeJsonl(
      meta,
      sorted(byEpd).map(([epd, entry]) => ({ epd, ...entry })),
    ),
  );
}

export function writePopularity(meta: PopularityMeta, byEpd: Record<string, PopularityEntry>): void {
  writeFileSync(
    popularityPath,
    writeJsonl(
      meta,
      sorted(byEpd).map(([epd, entry]) => ({ epd, ...entry })),
    ),
  );
}

/** A puzzle selection: what it was chosen with (the meta line), then one puzzle per line. */
export function writeSelection<M extends object, P>(path: string, meta: M, puzzles: readonly P[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, writeJsonl({ kind: 'puzzles', ...meta }, puzzles));
}

export function readSelection<M, P>(path: string): { meta: M; puzzles: P[] } | undefined {
  if (!existsSync(path)) return undefined;
  const { meta, rows } = readJsonl<M, P>(readFileSync(path, 'utf8'), path);
  return { meta, puzzles: rows };
}
