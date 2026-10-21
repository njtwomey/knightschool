import { playSan } from './chess';
import { START_EPD } from './epd';
import { parsePgn, type PgnGame, type PgnMoveNode } from './pgn';
import {
  LineKind,
  Side,
  TrapKind,
  type CourseManifest,
  type OpeningContent,
  type OpeningManifest,
  type QuizEntry,
} from './schema/content';
import { buildOpening, RESERVED_LINE_ID, type VariantSource } from './tree';

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
  note: Pick<PgnMoveNode, 'comment' | 'nags' | 'arrows' | 'circles'>;
  /** Chapters that write this move themselves (not through their [Start]). More than one is worth tidying. */
  writtenIn: string[];
};

/** A line of the tree, rebuilt as a game from the initial position so it reads like a self-contained line file. */
export type TreeLine = {
  id: string;
  source: string;
  /** The side the chapter is written for ([For]): its [Kind] and [Risk] are from that side's point of view. */
  side: Side;
  /** The position where the chapter's own moves begin. */
  startEpd: string;
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

const hasNote = (move: PgnMoveNode) =>
  Boolean(move.comment) || move.nags.length > 0 || move.arrows.length > 0 || move.circles.length > 0;

/**
 * Reads the chapters into one tree. They may come in any order: each is resolved once every move of its [Start] has
 * been written by some other chapter. Throws, naming the file, when ids clash, [For] is missing, a move is illegal, two
 * chapters comment differently on the same move, or a [Start] never connects to the rest of the tree.
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
  const write = (chapter: Chapter, fromEpd: string, startPly: number, moves: PgnMoveNode[]) => {
    let epd = fromEpd;
    moves.forEach((move, index) => {
      const ply = startPly + index;
      for (const variation of move.variations) write(chapter, epd, ply, variation);
      let played;
      try {
        played = playSan(epd, move.san);
      } catch {
        throw new Error(
          `${chapter.source}: illegal move ${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'} ${move.san}`,
        );
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
            `${chapter.source}: ${move.san} at ply ${ply + 1} is commented differently in ${others.join(', ')}: ` +
              `"${note.comment}" / "${move.comment}". A move has one comment, wherever it is written.`,
          );
        }
        const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];
        edge.note = {
          comment: note.comment ?? (move.comment || undefined),
          nags: union(note.nags, move.nags),
          arrows: union(note.arrows, move.arrows),
          circles: union(note.circles, move.circles),
        };
      }
      epd = played.epd;
    });
  };

  // Resolved in rounds: a chapter waits until every move of its [Start] is written.
  const starts = new Map(
    chapters.map((chapter) => [chapter.id, sanMoves(chapter.game.tags.Start ?? '', chapter.source)]),
  );
  const startPaths = new Map<string, TreeEdge[]>();
  let pending = [...chapters];
  while (pending.length) {
    const waiting: Chapter[] = [];
    for (const chapter of pending) {
      const path: TreeEdge[] = [];
      let epd = START_EPD;
      let connected = true;
      for (const san of starts.get(chapter.id)!) {
        let played;
        try {
          played = playSan(epd, san);
        } catch {
          throw new Error(`${chapter.source}: [Start] has an illegal move ${san}`);
        }
        const edge = edges.get(edgeKey(epd, played.uci));
        if (!edge) {
          connected = false;
          break;
        }
        path.push(edge);
        epd = played.epd;
      }
      if (!connected) {
        waiting.push(chapter);
        continue;
      }
      startPaths.set(chapter.id, path);
      write(chapter, epd, path.length, chapter.game.moves);
    }
    if (waiting.length === pending.length) {
      const first = waiting[0]!;
      throw new Error(
        `${first.source}: [Start "${first.game.tags.Start}"] leaves the tree: no chapter writes all of its moves` +
          (waiting.length > 1 ? ` (and ${waiting.length - 1} more chapters wait on it)` : ''),
      );
    }
    pending = waiting;
  }

  const lines = new Map<string, TreeLine>();
  for (const chapter of chapters) {
    const path = startPaths.get(chapter.id)!;
    const parents: string[] = [];
    for (const edge of path) {
      const owner = edge.writtenIn[0]!;
      if (parents.at(-1) !== owner) parents.push(owner);
    }
    const prefix: PgnMoveNode[] = path.map((edge) => ({
      san: edge.san,
      ...(edge.note.comment ? { comment: edge.note.comment } : {}),
      nags: edge.note.nags,
      arrows: edge.note.arrows,
      circles: edge.note.circles,
      variations: [],
    }));
    const tags = { ...chapter.game.tags };
    delete tags.Start;
    delete tags.For;
    lines.set(chapter.id, {
      id: chapter.id,
      source: chapter.source,
      side: chapter.game.tags.For as Side,
      startEpd: path.at(-1)?.to ?? START_EPD,
      parents,
      game: { tags, moves: [...prefix, ...chapter.game.moves] },
    });
  }
  return { lines, edges };
}

/** Moves that more than one chapter writes out, which `make doctor` reports so they can be written once. */
export function rewrittenMoves(tree: TheoryTree): TreeEdge[] {
  return [...tree.edges.values()].filter((edge) => edge.writtenIn.length > 1);
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
      if (entry.alternative) throw new Error(`${where}: "${entry.id}" is a trap and cannot be an alternative`);
      traps.push({ file: entry.id, opponent, kind: trap.data, ...(entry.section ? { section: entry.section } : {}) });
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
