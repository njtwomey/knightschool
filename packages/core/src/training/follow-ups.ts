import { START_EPD, sideToMove } from '../chess/epd';
import { gameOver, playMove, replay } from '../chess/play';
import type { BuiltOpening } from '../content/build-opening';
import type { OpeningFacts } from '../content/facts';
import type { Note } from '../content/note';
import type { JudgeFacts } from '../judge/judge';
import { moveCardId } from './cards';
import { opponentMistakes, type OpponentMistake } from './mistakes';

/**
 * A follow-up (docs/v2/model.md): after a step's main line, one of the opponent's common mistakes in its stretch and
 * how to punish it. Worked out from the opening and its shipped facts, never stored: the author's refutations (`?` and
 * `??` variations) and the band's popular replies the judge calls a mistake. Its id is keyed by position and move, so
 * recutting steps loses nothing; its learner moves are ordinary move cards.
 */
export type FollowUp = {
  /** `follow-up:<epd>:<uci>`: the position the opponent errs in, and the mistake. */
  id: string;
  /** The step it hangs off (the first step whose stretch reaches the position), and its place among that step's. */
  step: string;
  index: number;
  /** The ply of the mistake in the game. */
  ply: number;
  mistake: OpponentMistake;
  /** From the position before the mistake: the mistake, the punishment and what follows (UCI). */
  line: string[];
  /** The learner's moves in the line, as move cards: the punishment first. */
  cards: { id: string; epd: string; uci: string }[];
  /** The author's note on each move of `line` (the mistake's, then the punishing line's), where written. */
  notes: (Note | undefined)[];
};

export const followUpId = (epd: string, uci: string) => `follow-up:${epd}:${uci}`;

/**
 * Every follow-up of an opening, in step order. The punishing line is the refutation as written, or the engine's line
 * after the mistake, up to `judge.refutationPlies` plies after the mistake; a mistake already taught as a follow-up of
 * an earlier step is not repeated.
 */
export function followUps(
  opening: BuiltOpening,
  facts: OpeningFacts | undefined,
  config: JudgeFacts['config'] & { minShare: number },
): FollowUp[] {
  const out: FollowUp[] = [];
  const seen = new Set<string>();
  const lines = new Map(opening.lines.map((line) => [line.id, line]));
  for (const step of opening.steps) {
    const line = lines.get(step.line);
    if (!line) continue;
    const played = replay(START_EPD, line.moves);
    const plyOf = new Map<string, number>();
    for (let ply = step.from; ply <= step.to; ply++) {
      const before = ply === 0 ? START_EPD : played[ply - 1]?.epd;
      if (before && sideToMove(before) !== opening.side) plyOf.set(before, ply);
    }
    let index = 0;
    for (const mistake of opponentMistakes(opening, [...plyOf.keys()], facts, config)) {
      const id = followUpId(mistake.epd, mistake.uci);
      if (seen.has(id)) continue;
      const moves = [mistake.uci, mistake.punish, ...mistake.then].slice(0, 1 + config.refutationPlies);
      const cards: FollowUp['cards'] = [];
      let epd = mistake.epd;
      const legal: string[] = [];
      for (const [i, uci] of moves.entries()) {
        const next = playMove(epd, uci);
        if (!next) break;
        if (i % 2 === 1) cards.push({ id: moveCardId(epd, next.uci), epd, uci: next.uci });
        legal.push(next.uci);
        epd = next.epd;
      }
      if (!cards.length) continue;
      seen.add(id);
      const notes = legal.map((_, i) => (i === 0 ? mistake.note : mistake.lineNotes?.[i - 1]));
      out.push({ id, step: step.id, index: index++, ply: plyOf.get(mistake.epd)!, mistake, line: legal, cards, notes });
    }
  }
  return out;
}

export type PieceKind = 'q' | 'r' | 'b' | 'n' | 'p';
const PIECE_ORDER: PieceKind[] = ['q', 'r', 'b', 'n', 'p'];
const PIECE_NAME: Record<PieceKind, [string, string]> = {
  q: ['the queen', 'queens'],
  r: ['a rook', 'rooks'],
  b: ['a bishop', 'bishops'],
  n: ['a knight', 'knights'],
  p: ['a pawn', 'pawns'],
};

/** The pieces on the board by kind, for one side, from an EPD's placement field. */
function pieces(epd: string, side: 'white' | 'black'): Record<PieceKind, number> {
  const count: Record<PieceKind, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  for (const char of epd.split(' ')[0] ?? '') {
    const kind = char.toLowerCase() as PieceKind;
    if (!(kind in count)) continue;
    if ((char === char.toUpperCase()) === (side === 'white')) count[kind] += 1;
  }
  return count;
}

/**
 * What a follow-up's punishing line wins for the learner (`side`), from the board alone: the material balance at the
 * end of the line against the position before the mistake, by kind of piece (positive: gained against the opponent),
 * and whether the line ends in mate. A promotion counts as the pieces it leaves.
 */
export function followUpGain(
  followUp: Pick<FollowUp, 'mistake' | 'line'>,
  side: 'white' | 'black',
): { pieces: Partial<Record<PieceKind, number>>; mate: boolean } {
  const other = side === 'white' ? 'black' : 'white';
  let epd = followUp.mistake.epd;
  for (const uci of followUp.line) epd = playMove(epd, uci)?.epd ?? epd;
  const [mineBefore, theirsBefore] = [pieces(followUp.mistake.epd, side), pieces(followUp.mistake.epd, other)];
  const [mineAfter, theirsAfter] = [pieces(epd, side), pieces(epd, other)];
  const out: Partial<Record<PieceKind, number>> = {};
  for (const kind of PIECE_ORDER) {
    const swing = mineAfter[kind] - mineBefore[kind] - (theirsAfter[kind] - theirsBefore[kind]);
    if (swing) out[kind] = swing;
  }
  return { pieces: out, mate: gameOver(epd) === side };
}

/**
 * The gain in words ("wins a knight", "wins a bishop for a pawn", "mates"), or null when the board shows nothing won:
 * then only the author's note can say why the follow-up is worth knowing.
 */
export function gainWords(gain: ReturnType<typeof followUpGain>): string | null {
  if (gain.mate) return 'mates';
  const list = (sign: 1 | -1) =>
    PIECE_ORDER.filter((kind) => (gain.pieces[kind] ?? 0) * sign > 0).map((kind) => {
      const n = Math.abs(gain.pieces[kind]!);
      return n === 1 ? PIECE_NAME[kind][0] : `${n} ${PIECE_NAME[kind][1]}`;
    });
  const join = (items: string[]) =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  const won = list(1);
  const lost = list(-1);
  if (!won.length) return null;
  return `wins ${join(won)}${lost.length ? ` for ${join(lost)}` : ''}`;
}
