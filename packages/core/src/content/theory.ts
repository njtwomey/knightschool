import { START_EPD, sideToMove, type Side } from '../chess/epd';
import { numberedMove } from '../chess/notation';
import { playMove } from '../chess/play';
import type { LineSource, SourceMove } from './line-pgn';
import type { Note } from './note';
import { LineHeadersSchema, type LineKind } from './schema';

/** A move of a resolved line: played from `before` to `after`, with the note written for it here, if any. */
export type TreeMove = { ply: number; san: string; uci: string; before: string; after: string; note?: Note };
export type Refutation = { at: string; ply: number; moves: TreeMove[] };
export type ResolvedLine = {
  id: string;
  for: Side;
  kind: LineKind;
  name?: string;
  /** Every move from the start of the game, the parent's moves first. */
  moves: TreeMove[];
  /** The index in `moves` of the line's own first move. */
  ownFrom: number;
  parent?: { line: string; ply: number };
  refutations: Refutation[];
};

function playAll(id: string, startEpd: string, firstPly: number, moves: SourceMove[], where: string) {
  const out: TreeMove[] = [];
  const refutations: Refutation[] = [];
  let epd = startEpd;
  moves.forEach((move, i) => {
    const ply = firstPly + i;
    for (const variation of move.refutations) {
      const played = playAll(id, epd, ply, variation, `${where} (refutation)`);
      refutations.push({ at: epd, ply, moves: played.moves });
    }
    const played = playMove(epd, move.san);
    if (!played) throw new Error(`${id}: ${numberedMove(ply, move.san)} is not legal here (${where})`);
    out.push({
      ply,
      san: played.san,
      uci: played.uci,
      before: epd,
      after: played.epd,
      ...(move.note ? { note: move.note } : {}),
    });
    epd = played.epd;
  });
  return { moves: out, refutations };
}

/** "giuoco-main 3...Bc5" → the parent line and the move after which this one starts. */
function parseStart(id: string, start: string) {
  const match = /^([a-z0-9-]+)\s+(\d+)(\.\.\.|\.)\s*(\S+)$/.exec(start.trim());
  if (!match) throw new Error(`${id}: [Start "${start}"] should be a line id and a move, like "giuoco-main 3...Bc5"`);
  const [, line, number, dots, san] = match;
  return { line: line!, ply: (Number(number) - 1) * 2 + (dots === '...' ? 1 : 0), san: san! };
}

/**
 * Lines resolved parents first: each line's moves from the start of the game, its parent's moves (and their notes)
 * up to where it branches. One note per move across all lines: a second note on the same move is an error.
 */
export function resolveLines(sources: readonly LineSource[]): Map<string, ResolvedLine> {
  const byId = new Map(sources.map((source) => [source.id, source]));
  if (byId.size !== sources.length) throw new Error('two line files have the same id');
  const resolved = new Map<string, ResolvedLine>();
  const noteOwner = new Map<string, string>();
  const visiting = new Set<string>();

  const resolve = (id: string): ResolvedLine => {
    const done = resolved.get(id);
    if (done) return done;
    const source = byId.get(id);
    if (!source) throw new Error(`no line called "${id}"`);
    if (visiting.has(id)) throw new Error(`${id}: its [Start] leads back to itself`);
    visiting.add(id);
    const headers = LineHeadersSchema.safeParse(source.headers);
    if (!headers.success) throw new Error(`${id}: ${headers.error.issues.map((issue) => issue.message).join('; ')}`);
    let prefix: TreeMove[] = [];
    let parent: ResolvedLine['parent'];
    if (headers.data.start) {
      const start = parseStart(id, headers.data.start);
      const from = resolve(start.line);
      const at = from.moves[start.ply];
      if (!at || at.san.replace(/[+#]/g, '') !== start.san.replace(/[+#]/g, '')) {
        throw new Error(
          `${id}: [Start] names ${numberedMove(start.ply, start.san)}, which "${start.line}" does not play`,
        );
      }
      prefix = from.moves.slice(0, start.ply + 1).map(({ note: _note, ...move }) => move);
      parent = { line: start.line, ply: start.ply };
    }
    const startEpd = prefix.at(-1)?.after ?? START_EPD;
    const own = playAll(id, startEpd, prefix.length, source.moves, 'its moves');
    for (const move of own.moves) {
      if (!move.note?.text) continue;
      const key = `${move.before} ${move.uci}`;
      const owner = noteOwner.get(key);
      if (owner && owner !== id) {
        throw new Error(
          `${id}: ${numberedMove(move.ply, move.san)} already has a comment in "${owner}" (one per move)`,
        );
      }
      noteOwner.set(key, id);
    }
    const line: ResolvedLine = {
      id,
      for: headers.data.for,
      kind: headers.data.kind,
      ...(headers.data.name ? { name: headers.data.name } : {}),
      moves: [...prefix, ...own.moves],
      ownFrom: prefix.length,
      ...(parent ? { parent } : {}),
      refutations: own.refutations,
    };
    visiting.delete(id);
    resolved.set(id, line);
    return line;
  };

  for (const source of sources) resolve(source.id);
  return resolved;
}

export const isLearnerMove = (move: Pick<TreeMove, 'before'>, side: Side) => sideToMove(move.before) === side;
