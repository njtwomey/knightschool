import { START_EPD } from './epd';
import { playSan, sideToMove } from './chess';
import type { PgnGame, PgnMoveNode } from './pgn';
import { epdAfterPgn } from './chess';
import { matchAnswer } from './quiz';
import { parseVariantHeader } from './tags';
import {
  Opening,
  OpeningContent,
  type Annotation,
  type LineEdge,
  type LineNode,
  type OpeningManifest,
  type Quiz,
  type QuizEntry,
  type Variant,
} from './schema/content';

export type VariantSource = { id: string; kind: Variant['kind']; game: PgnGame; source: string };

/** `#/play/<course>/all/...` practises every branch, so no line may use this id. */
export const RESERVED_LINE_ID = 'all';

const BAD_NAGS = new Set([2, 4, 6]); // ?, ??, ?!

/** Nodes and edges while the tree is being built; frozen into OpeningContent at the end. */
type MutableEdge = Omit<LineEdge, 'variants'> & { variants: Set<string> };
type MutableNode = Omit<LineNode, 'moves'> & { moves: MutableEdge[] };

function annotationOf(move: PgnMoveNode): Annotation | undefined {
  if (!move.comment && !move.nags.length && !move.arrows.length && !move.circles.length) return undefined;
  return { text: move.comment, nag: move.nags, motifs: [], arrows: move.arrows, circles: move.circles };
}

/** Merges two annotations on the same move from different variants. Differing comments are an authoring error. */
function mergeAnnotation(a: Annotation | undefined, b: Annotation | undefined, where: string): Annotation | undefined {
  if (!a || !b) return a ?? b;
  if (a.text && b.text && a.text !== b.text) {
    throw new Error(`${where}: two variants comment differently on the same move: "${a.text}" / "${b.text}"`);
  }
  const union = <T>(x: T[], y: T[]) => [...new Set([...x, ...y])];
  return {
    text: a.text ?? b.text,
    nag: union(a.nag, b.nag),
    motifs: union(a.motifs, b.motifs),
    arrows: union(a.arrows, b.arrows),
    circles: union(a.circles, b.circles),
  };
}

/**
 * Builds one opening's tree from its manifest and variant files. Positions are keyed by EPD, so a variant that
 * transposes into another shares its nodes. Throws an Error naming the file at the first authoring problem.
 */
export function buildOpening(
  id: string,
  manifest: OpeningManifest,
  variants: VariantSource[],
  quizEntries: QuizEntry[] = [],
): OpeningContent {
  const listed = [...manifest.lines, ...manifest.refutations];
  if (listed.includes(RESERVED_LINE_ID))
    throw new Error(`${id}: "${RESERVED_LINE_ID}" is reserved (it means every branch) and cannot be a line id`);
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  if (new Set(listed).size !== listed.length)
    throw new Error(`${id}: variant ids must be unique across lines and refutations`);
  for (const variantId of listed)
    if (!byId.has(variantId)) throw new Error(`${id}: opening.yaml lists "${variantId}" but no such file exists`);
  for (const variant of variants)
    if (!listed.includes(variant.id)) throw new Error(`${variant.source}: not listed in ${id}/opening.yaml`);
  for (const variantId of manifest.lines)
    if (byId.get(variantId)!.kind !== 'line')
      throw new Error(`${id}: "${variantId}" is under refutations/ but listed as a line`);
  for (const variantId of manifest.refutations)
    if (byId.get(variantId)!.kind !== 'refutation')
      throw new Error(`${id}: "${variantId}" is under lines/ but listed as a refutation`);

  const ourSide = manifest.side;
  const nodes = new Map<string, MutableNode>();
  const mainLine = new Set<string>(); // `${from}>${san}` for the main line of the first line
  const metas: Variant[] = [];

  const nodeAt = (epd: string, ply: number): MutableNode => {
    const existing = nodes.get(epd);
    if (existing) {
      existing.ply = Math.min(existing.ply, ply);
      return existing;
    }
    const side = sideToMove(epd);
    const created: MutableNode = { epd, ply, sideToMove: side, isOurTurn: side === ourSide, moves: [] };
    nodes.set(epd, created);
    return created;
  };
  nodeAt(START_EPD, 0);

  for (const variantId of listed) {
    const variant = byId.get(variantId)!;
    const header = parseVariantHeader(variant.game.tags, variant.source);
    if (header.opening !== manifest.name) {
      throw new Error(
        `${variant.source}: [Opening "${header.opening}"] does not match opening.yaml name "${manifest.name}"`,
      );
    }
    if (variant.kind === 'refutation' && !header.tags.refutes) {
      throw new Error(`${variant.source}: refutations need a [Refutes] tag`);
    }
    const mainUcis: string[] = [];
    const isFirstLine = variantId === manifest.lines[0];

    const walk = (startEpd: string, startPly: number, moves: PgnMoveNode[], onMain: boolean) => {
      let epd = startEpd;
      moves.forEach((move, index) => {
        const ply = startPly + index;
        for (const alternative of move.variations) walk(epd, ply, alternative, false);
        let played;
        try {
          played = playSan(epd, move.san);
        } catch {
          throw new Error(
            `${variant.source}: illegal move ${Math.floor(ply / 2) + 1}${ply % 2 ? '...' : '.'} ${move.san}`,
          );
        }
        const from = nodeAt(epd, ply);
        const to = nodeAt(played.epd, ply + 1);
        const annotation = annotationOf(move);
        const where = `${variant.source}: ${move.san} at ply ${ply + 1}`;
        let edge = from.moves.find((candidate) => candidate.uci === played.uci);
        if (!edge) {
          edge = {
            san: played.move.san,
            uci: played.uci,
            to: to.epd,
            isMainLine: false,
            isRepertoire: false,
            variants: new Set(),
          };
          from.moves.push(edge);
        }
        edge.variants.add(variantId);
        edge.annotation = mergeAnnotation(edge.annotation, annotation, where);
        if (isFirstLine && onMain) mainLine.add(`${from.epd}>${edge.uci}`);
        if (onMain) mainUcis.push(edge.uci);
        epd = played.epd;
      });
    };
    walk(START_EPD, 0, variant.game.moves, true);
    metas.push({
      id: variantId,
      kind: variant.kind,
      name: header.name,
      eco: header.eco,
      tags: header.tags,
      mainLine: mainUcis,
    });
  }

  // A position only counts as part of the repertoire if it can be reached without the learner having made a mistake:
  // what follows a demonstrated mistake of ours (a trap we fall into) is shown, never asked.
  const clean = new Set<string>([START_EPD]);
  const queue = [START_EPD];
  while (queue.length) {
    const node = nodes.get(queue.shift()!)!;
    for (const edge of node.moves) {
      const ourMistake = node.isOurTurn && edge.annotation?.nag.some((nag) => BAD_NAGS.has(nag));
      if (ourMistake || clean.has(edge.to)) continue;
      clean.add(edge.to);
      queue.push(edge.to);
    }
  }

  // Repertoire: at our turn, the moves not marked as mistakes. There must be exactly one per position.
  for (const node of nodes.values()) {
    for (const edge of node.moves) edge.isMainLine = mainLine.has(`${node.epd}>${edge.uci}`);
    if (!node.isOurTurn || node.moves.length === 0 || !clean.has(node.epd)) continue;
    const good = node.moves.filter((edge) => !edge.annotation?.nag.some((nag) => BAD_NAGS.has(nag)));
    if (good.length > 1) {
      const names = good.map((edge) => `${edge.san} (${[...edge.variants].join(', ')})`).join(' vs ');
      throw new Error(`${id}: two repertoire moves for the same position ${node.epd}: ${names}. Mark the wrong one ?`);
    }
    if (good.length === 1) good[0]!.isRepertoire = true; // none: a mistake being demonstrated, so no card
  }

  const frozen: Record<string, LineNode> = {};
  for (const [epd, node] of nodes) {
    frozen[epd] = { ...node, moves: node.moves.map((edge) => ({ ...edge, variants: [...edge.variants] })) };
  }
  const opening: Opening = Opening.parse({
    id,
    name: manifest.name,
    eco: manifest.eco,
    side: manifest.side,
    level: manifest.level,
    summary: manifest.summary,
    tags: manifest.tags,
    family: manifest.family,
    against: manifest.against,
    motif: manifest.motif,
    rootEpd: START_EPD,
    variants: metas,
  });
  return OpeningContent.parse({ opening, nodes: frozen, quizzes: buildQuizzes(id, quizEntries) });
}

/** Turns authored quizzes into content: finds each position, checks the reveal move, and runs the example answers. */
export function buildQuizzes(openingId: string, entries: QuizEntry[]): Quiz[] {
  const seen = new Set<string>();
  return entries.map((entry) => {
    const where = `${openingId}/quizzes.yaml "${entry.id}"`;
    if (seen.has(entry.id)) throw new Error(`${where}: duplicate quiz id`);
    seen.add(entry.id);
    let epd: string;
    try {
      epd = epdAfterPgn(entry.line);
    } catch {
      throw new Error(`${where}: the line "${entry.line}" is not a legal sequence of moves`);
    }
    let showMove: string | undefined;
    if (entry.showMove) {
      try {
        showMove = playSan(epd, entry.showMove).uci;
      } catch {
        throw new Error(`${where}: showMove "${entry.showMove}" is not legal after "${entry.line}"`);
      }
    }
    const quiz: Quiz = {
      id: entry.id,
      epd,
      prompt: entry.prompt,
      accept: entry.accept,
      reveal: entry.reveal,
      ...(showMove ? { showMove } : {}),
    };
    for (const answer of entry.examples.match) {
      if (!matchAnswer(quiz, answer).matched)
        throw new Error(`${where}: the answer "${answer}" should match but does not`);
    }
    for (const answer of entry.examples.miss) {
      if (matchAnswer(quiz, answer).matched)
        throw new Error(`${where}: the answer "${answer}" should not match but does`);
    }
    return quiz;
  });
}
