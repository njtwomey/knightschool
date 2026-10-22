import { fold } from '../search/text-match';
import { playSan } from '../chess/chess';
import { START_EPD } from '../chess/epd';
import { numberedMove } from '../chess/notation';
import { hasNote, noteToMove, parsePgn, type PgnGame, type PgnMoveNode, type PgnNote } from '../chess/pgn';
import { positionId } from '../chess/position-id';
import {
  LineKind,
  Side,
  TrapKind,
  type CourseManifest,
  type OpeningContent,
  type OpeningManifest,
  type QuizEntry,
  type TreeGraph,
} from '../schema/content';
import { RESERVED_LINE_ID } from '../constants';
import { buildOpening, type VariantSource } from './course-build';

/**
 * The theory tree is all of content/tree: one tree of positions and moves for both sides, split into chapters. A
 * chapter is one PGN file holding one line, written from the point where it leaves the rest of the tree: `[Start]` is
 * SAN from the initial position to that point (empty or missing: the initial position), and the moves are the line's
 * own, with its side branches as variations. The file name is the line's id.
 */
export type Chapter = { id: string; source: string; game: PgnGame };

/** One move of the tree, written once and shared by every line that passes through it. */
export type TreeEdge = {
  from: string;
  to: string;
  san: string;
  uci: string;
  /** The move's annotation, merged over every chapter that writes it. */
  note: PgnNote;
  /** Chapters that write this move themselves (not through their [Start]). More than one is worth tidying. */
  writtenIn: string[];
};

/** A line of the tree, rebuilt as a game from the initial position so it reads like a self-contained line file. */
export type TreeLine = {
  id: string;
  source: string;
  /** The side the chapter is written for ([For]): its [Kind] and [Risk] are from that side's point of view. */
  side: Side;
  /** The position where the chapter's own moves begin, and how many plies lead there. */
  startEpd: string;
  startPly: number;
  /** Chapters whose moves the [Start] path runs through, in order: the branches this line grows out of. */
  parents: string[];
  /** The [Start] moves (annotated from the tree, no variations) followed by the chapter's moves. */
  game: PgnGame;
};

export type TheoryTree = { lines: Map<string, TreeLine>; edges: Map<string, TreeEdge> };

const edgeKey = (epd: string, uci: string) => `${epd} ${uci}`;

/** The SAN moves of a "1. e4 e5 2. Nf3" string. */
export function sanMoves(text: string, source: string): string[] {
  if (!text.trim()) return [];
  return parsePgn(`[Event "start"]\n\n${text} *`, source).moves.map((move) => move.san);
}

/**
 * `[Start "evans-gambit 6.d4"]`: the chapter this one branches from, and the move of that chapter it follows. When the
 * parent writes that move in more than one place, give the moves before it too, as many as it takes:
 * `[Start "odd-first-moves 1.h4 d5"]`.
 */
export type StartPoint = { parent: string; ply: number; sans: string[] };

const bareSan = (san: string) => san.replace(/[+#!?]+$/, '');

/** Reads a [Start] header. Missing or empty: the chapter starts from the initial position. */
export function parseStart(text: string | undefined, source: string): StartPoint | undefined {
  if (!text?.trim()) return undefined;
  const match = /^(\S+)\s+(\d+)(\.{3}|\.)\s*(.+)$/.exec(text.trim());
  if (!match)
    throw new Error(
      `${source}: [Start "${text}"] should name a chapter and one of its moves, like "evans-gambit 6.d4"`,
    );
  const [, parent, number, dots] = match as unknown as [string, string, string, string];
  const sans = sanMoves(`${number}${dots} ${match[4]}`, source).map(bareSan);
  const first = (Number(number) - 1) * 2 + (dots === '...' ? 1 : 0);
  return { parent, ply: first + sans.length - 1, sans };
}

/**
 * Reads the chapters into one tree. A chapter with a [Start] branches from a move its parent chapter writes (on its
 * main line or in one of its variations), so chapters are resolved parents first, in any file order. Throws, naming
 * the file, when ids clash, [For] is missing, a move is illegal, two chapters comment differently on the same move, or
 * a [Start] names a chapter or a move that does not exist.
 */
export function resolveTree(chapters: Chapter[]): TheoryTree {
  const ids = new Map<string, string>();
  for (const chapter of chapters) {
    if (chapter.id === RESERVED_LINE_ID)
      throw new Error(`${chapter.source}: "${RESERVED_LINE_ID}" is reserved (it means every branch)`);
    const clash = ids.get(chapter.id);
    if (clash) throw new Error(`${chapter.source}: the line id "${chapter.id}" is also used by ${clash}`);
    ids.set(chapter.id, chapter.source);
    if (!Side.safeParse(chapter.game.tags.For).success)
      throw new Error(`${chapter.source}: [For] must say which side the line is written for, "white" or "black"`);
  }

  const edges = new Map<string, TreeEdge>();
  /** For each resolved chapter, the path from the start to after each move it writes, by "ply:san". */
  const anchors = new Map<string, Map<string, TreeEdge[][]>>();
  const write = (chapter: Chapter, path: TreeEdge[], moves: PgnMoveNode[]) => {
    const own = anchors.get(chapter.id)!;
    let here = path;
    moves.forEach((move) => {
      const ply = here.length;
      const epd = here.at(-1)?.to ?? START_EPD;
      for (const variation of move.variations) write(chapter, here, variation);
      let played;
      try {
        played = playSan(epd, move.san);
      } catch {
        throw new Error(`${chapter.source}: illegal move ${numberedMove(ply, move.san)}`);
      }
      const key = edgeKey(epd, played.uci);
      const edge = edges.get(key) ?? {
        from: epd,
        to: played.epd,
        san: played.move.san,
        uci: played.uci,
        note: { nags: [], arrows: [], circles: [] },
        writtenIn: [],
      };
      edges.set(key, edge);
      if (!edge.writtenIn.includes(chapter.id)) edge.writtenIn.push(chapter.id);
      if (hasNote(move)) {
        const { note } = edge;
        if (move.comment && note.comment && move.comment !== note.comment) {
          const others = edge.writtenIn.filter((id) => id !== chapter.id).map((id) => ids.get(id));
          throw new Error(
            `${chapter.source}: ${numberedMove(ply, move.san)} is commented differently in ${others.join(', ')}: ` +
              `"${note.comment}" / "${move.comment}". A move has one comment, wherever it is written.`,
          );
        }
        const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];
        edge.note = {
          comment: note.comment ?? (move.comment || undefined),
          nags: union(note.nags, move.nags),
          arrows: union(note.arrows, move.arrows),
          circles: union(note.circles, move.circles),
          ...(note.tags || move.tags ? { tags: union(note.tags ?? [], move.tags ?? []) } : {}),
        };
      }
      here = [...here, edge];
      const anchor = `${ply}:${bareSan(edge.san)}`;
      own.set(anchor, [...(own.get(anchor) ?? []), here]);
    });
  };

  const starts = new Map(chapters.map((chapter) => [chapter.id, parseStart(chapter.game.tags.Start, chapter.source)]));
  for (const chapter of chapters) {
    const start = starts.get(chapter.id);
    if (start && !ids.has(start.parent))
      throw new Error(
        `${chapter.source}: [Start] branches from "${start.parent}", but there is no chapter of that name`,
      );
  }
  const startPaths = new Map<string, TreeEdge[]>();
  const lineage = new Map<string, string[]>();
  let pending = [...chapters];
  while (pending.length) {
    const waiting: Chapter[] = [];
    for (const chapter of pending) {
      const start = starts.get(chapter.id);
      let path: TreeEdge[] = [];
      if (start) {
        const from = anchors.get(start.parent);
        if (!from) {
          waiting.push(chapter);
          continue;
        }
        const last = start.sans.at(-1)!;
        const found = (from.get(`${start.ply}:${last}`) ?? []).filter((candidate) =>
          start.sans.every((san, i) => bareSan(candidate[candidate.length - start.sans.length + i]?.san ?? '') === san),
        );
        const named = numberedMove(start.ply, last);
        if (found.length === 0)
          throw new Error(
            `${chapter.source}: [Start] branches after ${named} in "${start.parent}", which does not write that move itself`,
          );
        if (found.length > 1)
          throw new Error(
            `${chapter.source}: [Start] is ambiguous: "${start.parent}" writes ${named} in more than one place; give the moves before it too`,
          );
        path = found[0]!;
      }
      startPaths.set(chapter.id, path);
      lineage.set(chapter.id, start ? [...lineage.get(start.parent)!, start.parent] : []);
      anchors.set(chapter.id, new Map());
      write(chapter, path, chapter.game.moves);
    }
    if (waiting.length === pending.length) {
      throw new Error(
        `${waiting[0]!.source}: [Start] chapters branch from each other in a circle: ${waiting.map((c) => c.id).join(', ')}`,
      );
    }
    pending = waiting;
  }

  /** A chapter's own moves with each move's annotation as the tree holds it, so a move reads the same in every line. */
  const withTreeNotes = (fromEpd: string, moves: PgnMoveNode[]): PgnMoveNode[] => {
    let epd = fromEpd;
    return moves.map((move) => {
      const variations = move.variations.map((variation) => withTreeNotes(epd, variation));
      const edge = edges.get(edgeKey(epd, playSan(epd, move.san).uci))!;
      epd = edge.to;
      return { ...move, ...noteToMove(edge.note), variations };
    });
  };

  const lines = new Map<string, TreeLine>();
  for (const chapter of chapters) {
    const path = startPaths.get(chapter.id)!;
    const parents = lineage.get(chapter.id)!;
    const prefix: PgnMoveNode[] = path.map((edge) => ({ san: edge.san, ...noteToMove(edge.note), variations: [] }));
    const tags = { ...chapter.game.tags };
    delete tags.Start;
    delete tags.For;
    lines.set(chapter.id, {
      id: chapter.id,
      source: chapter.source,
      side: chapter.game.tags.For as Side,
      startEpd: path.at(-1)?.to ?? START_EPD,
      startPly: path.length,
      parents,
      game: { tags, moves: [...prefix, ...withTreeNotes(path.at(-1)?.to ?? START_EPD, chapter.game.moves)] },
    });
  }
  return { lines, edges };
}

/** Moves that more than one chapter writes out, which `make doctor` reports so they can be written once. */
export function rewrittenMoves(tree: TheoryTree): TreeEdge[] {
  return [...tree.edges.values()].filter((edge) => edge.writtenIn.length > 1);
}

/**
 * A chapter's name with its opening in front when the name leaves it out: "Short Variation" in the Caro-Kann reads
 * "Caro-Kann Defence: Short Variation". A name that already says its opening ("Scandinavian Defense: Main Line") is
 * kept as it is.
 */
export function chapterTitle(chapter: { name: string; opening: string }): string {
  const opening = chapter.opening.split(':')[0]!.trim();
  if (!opening || chapter.name.includes(':') || fold(chapter.name).includes(fold(opening))) return chapter.name;
  return `${opening}: ${chapter.name}`;
}

/** A line's main line as UCI moves from the initial position (none for no line). */
export const uciLine = (line: Pick<TreeLine, 'game'> | undefined): string[] => {
  let epd = START_EPD;
  return (line?.game.moves ?? []).map((move) => {
    const played = playSan(epd, move.san);
    epd = played.epd;
    return played.uci;
  });
};

/**
 * The tree as data to draw (`TreeGraph` in the content schema): chapters as branches, each with its whole main line and
 * the courses that list it (`coursesOf`), and every move once.
 */
export function treeGraph(tree: TheoryTree, coursesOf: (line: string) => string[] = () => []): TreeGraph {
  return {
    root: positionId(START_EPD),
    chapters: [...tree.lines.values()].map((line) => {
      const branch = line.game.moves[line.startPly - 1];
      return {
        id: line.id,
        name: line.game.tags.Variation ?? line.id,
        opening: line.game.tags.Opening ?? '',
        side: line.side,
        parent: line.parents.at(-1) ?? null,
        after: branch ? numberedMove(line.startPly - 1, branch.san) : null,
        from: positionId(line.startEpd),
        ply: line.startPly,
        moves: uciLine(line),
        courses: coursesOf(line.id),
        source: line.source,
      };
    }),
    moves: [...tree.edges.values()].map((edge) => ({
      from: positionId(edge.from),
      to: positionId(edge.to),
      san: edge.san,
      chapters: edge.writtenIn,
    })),
  };
}

/** A trap's kind seen from the other side: the trap one side springs is the one the other must avoid. */
const flipTrap = (kind: TrapKind): TrapKind => (kind === 'for-us' ? 'against-us' : 'for-us');

/**
 * One course as the app reads it: the course's lines taken from the tree, rebuilt from the start and merged into the
 * course's own tree by `buildOpening`, so everything downstream (cards, play, search) sees the same shape as a course
 * whose lines were written out in full. A course may take lines written for either side; a trap written for the other
 * side changes sides with it (for-us becomes against-us), and a line's kind can be overridden in course.yaml.
 */
export function projectCourse(
  id: string,
  manifest: CourseManifest,
  tree: TheoryTree,
  quizzes: QuizEntry[] = [],
): OpeningContent {
  const where = `${id}/course.yaml`;
  const lines: OpeningManifest['lines'] = [];
  const traps: OpeningManifest['traps'] = [];
  const sources: VariantSource[] = [];
  for (const raw of manifest.lines) {
    const entry = typeof raw === 'string' ? { id: raw, alternative: false } : raw;
    const line = tree.lines.get(entry.id);
    if (!line) throw new Error(`${where}: there is no line "${entry.id}" in content/tree`);
    const written = line.game.tags.Kind;
    if (!entry.kind && !written) throw new Error(`${line.source}: no [Kind], and ${where} does not give one`);
    const writtenTrap = TrapKind.safeParse(written);
    const kind =
      entry.kind ?? (writtenTrap.success && line.side !== manifest.side ? flipTrap(writtenTrap.data) : written!);
    const opponent = entry.opponent ?? line.game.tags.Opponent;
    if (!opponent) throw new Error(`${line.source}: no [Opponent], and ${where} does not give one`);
    const tags: Record<string, string> = { ...line.game.tags, Kind: kind };
    delete tags.Opponent;
    const game = { tags, moves: line.game.moves };
    const trap = TrapKind.safeParse(kind);
    if (trap.success) {
      // A trap can be an alternative too: shown and playable, but its avoiding move is not drilled.
      traps.push({
        file: entry.id,
        opponent,
        kind: trap.data,
        ...(entry.alternative ? { alternative: true } : {}),
        ...(entry.section ? { section: entry.section } : {}),
      });
      sources.push({ id: entry.id, kind: 'refutation', game, source: line.source });
      continue;
    }
    const weight = LineKind.safeParse(kind);
    if (!weight.success)
      throw new Error(
        `${line.source}: [Kind "${kind}"] is not one of ${[...LineKind.options, ...TrapKind.options].join(', ')}`,
      );
    lines.push({
      file: entry.id,
      opponent,
      kind: weight.data,
      alternative: entry.alternative,
      ...(entry.section ? { section: entry.section } : {}),
    });
    sources.push({ id: entry.id, kind: 'line', game, source: line.source });
  }
  if (lines.length === 0) throw new Error(`${where}: lists only traps; a course needs at least one line`);
  return buildOpening(id, { ...manifest, lines, traps }, sources, quizzes);
}
