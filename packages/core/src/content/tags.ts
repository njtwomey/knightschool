import { z } from 'zod';
import { epdAfterPgn } from '../chess/chess';
import { Character, Motif, VariantTags } from '../schema/content';

/** Header tags a variant PGN may contain. Anything else fails the build, so typos do not pass silently. */
export const KNOWN_TAGS = [
  'Event',
  'Opening',
  'Variation',
  'ECO',
  'Character',
  'Risk',
  'EarlyMate',
  'Tricks',
  'Refutes',
  'RefutedBy',
  'Themes',
  'Kind',
  'Start', // tree chapters: the moves before the chapter's own
  'For', // tree chapters: the side the line is written for, which [Kind] and [Risk] are relative to
  'Opponent', // tree chapters: what the opponent does to reach the line ("3...Bc5")
  'Description', // what the line is and why it matters
  'Snapshot', // the ply (from the start) of the position that pictures the line
] as const;

const list = (value: string | undefined) =>
  value === undefined
    ? undefined
    : value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

export type VariantHeader = {
  name: string;
  eco: string;
  opening: string;
  tags: VariantTags;
  kind?: string;
  description?: string;
  snapshot?: number;
};

/** Turns the raw PGN header into validated variant metadata. Throws an Error naming `source` on any problem. */
export function parseVariantHeader(raw: Record<string, string>, source: string): VariantHeader {
  const problems: string[] = [];
  for (const key of Object.keys(raw)) {
    if (!(KNOWN_TAGS as readonly string[]).includes(key)) problems.push(`unknown tag [${key}]`);
  }
  for (const key of ['Opening', 'Variation', 'ECO', 'Character', 'Risk', 'EarlyMate', 'Tricks']) {
    if (!raw[key]) problems.push(`missing tag [${key}]`);
  }

  const tricks = list(raw.Tricks);
  const parsed = VariantTags.safeParse({
    character: list(raw.Character),
    risk: raw.Risk,
    earlyMate: raw.EarlyMate,
    tricks: tricks?.length === 1 && tricks[0] === 'none' ? [] : tricks,
    refutes: raw.Refutes,
    refutedBy: raw.RefutedBy,
    themes: list(raw.Themes) ?? [],
  });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const hint = issue.path[0] === 'character' ? ` (allowed: ${Character.options.join(', ')})` : '';
      const tricksHint = issue.path[0] === 'tricks' ? ` (allowed: none, ${Motif.options.join(', ')})` : '';
      problems.push(`${issue.path.join('.') || 'tags'}: ${issue.message}${hint}${tricksHint}`);
    }
  } else {
    for (const key of ['refutes', 'refutedBy'] as const) {
      const pgn = parsed.data[key];
      if (!pgn) continue;
      try {
        epdAfterPgn(pgn);
      } catch (error) {
        problems.push(`${key} is not a legal line: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  if (
    raw.ECO &&
    !z
      .string()
      .regex(/^[A-E]\d\d$/)
      .safeParse(raw.ECO).success
  )
    problems.push(`ECO "${raw.ECO}" is not A00 to E99`);
  if (raw.Snapshot !== undefined && !/^\d+$/.test(raw.Snapshot))
    problems.push(`[Snapshot "${raw.Snapshot}"] should be a ply, a whole number`);

  if (problems.length || !parsed.success) {
    throw new Error(`${source}: ${problems.join('; ')}`);
  }
  return {
    name: raw.Variation!,
    eco: raw.ECO!,
    opening: raw.Opening!,
    tags: parsed.data,
    kind: raw.Kind,
    ...(raw.Description ? { description: raw.Description } : {}),
    ...(raw.Snapshot !== undefined ? { snapshot: Number(raw.Snapshot) } : {}),
  };
}
