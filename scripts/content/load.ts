import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { SiteConfig } from '../../packages/core/src/config/site-config.ts';
import {
  buildOpening,
  IdeasFile,
  OpeningFile,
  readLine,
  resolveLines,
  TracksFile,
  type BuiltOpening,
} from '../../packages/core/src/content/index.ts';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const contentDir = join(root, 'content');
const rel = (path: string) => relative(root, path);

const yaml = (path: string) => parse(readFileSync(path, 'utf8'));

function filesIn(dir: string, ext: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(path, ext);
    return entry.name.endsWith(ext) ? [path] : [];
  });
}

/** Parses a file with a schema, naming the file and the field when it fails. */
function checked<T>(
  path: string,
  schema: {
    safeParse: (
      value: unknown,
    ) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  },
  value: unknown,
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issues = result.error.issues.map((issue) => `${issue.path.join('.') || '(top)'}: ${issue.message}`);
  throw new Error(`${rel(path)}: ${issues.join('; ')}`);
}

export type Content = {
  config: SiteConfig;
  ideas: IdeasFile;
  tracks: TracksFile;
  openings: BuiltOpening[];
};

/** Reads and checks everything in content/, and builds every opening (docs/v2/schemas/content.md). */
export function loadContent(): Content {
  const config = checked(join(contentDir, 'config.yaml'), SiteConfig, yaml(join(contentDir, 'config.yaml')));
  const ideas = checked(join(contentDir, 'ideas.yaml'), IdeasFile, yaml(join(contentDir, 'ideas.yaml')));
  const tracks = checked(join(contentDir, 'tracks.yaml'), TracksFile, yaml(join(contentDir, 'tracks.yaml')));
  const sources = filesIn(join(contentDir, 'lines'), '.pgn').map((path) =>
    readLine(basename(path, '.pgn'), readFileSync(path, 'utf8')),
  );
  const resolved = resolveLines(sources);
  const ideaIds = new Set(ideas.map((idea) => idea.id));
  for (const line of resolved.values()) {
    for (const move of line.moves.slice(line.ownFrom)) {
      for (const idea of move.note?.ideas ?? []) {
        if (!ideaIds.has(idea)) throw new Error(`${line.id}: [%idea ${idea}] is not in content/ideas.yaml`);
      }
    }
  }
  const openings = filesIn(join(contentDir, 'openings'), '.yaml').map((path) => {
    const file = checked(path, OpeningFile, yaml(path));
    for (const idea of file.ideas)
      if (!ideaIds.has(idea)) throw new Error(`${rel(path)}: idea "${idea}" is not in content/ideas.yaml`);
    return buildOpening(basename(path, '.yaml'), file, resolved, config.teach.stepMoves);
  });
  const openingIds = new Set(openings.map((opening) => opening.id));
  for (const track of tracks) {
    for (const id of track.openings)
      if (!openingIds.has(id)) throw new Error(`content/tracks.yaml: "${id}" is not an opening`);
  }
  return { config, ideas, tracks, openings };
}
