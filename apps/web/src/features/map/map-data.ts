import {
  factsEval,
  gradeOf,
  moveCardId,
  moveCost,
  numberedMove,
  type FollowUp,
  type Grade,
  type ItemState,
  type Score,
  type Side,
} from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import { keyOf, layoutLines, type MapLine } from '@/components/map/lane-layout';
import type { MapIndexLine } from '@/components/map/map-index';
import type { MapOverlayData, MoveState } from '@/components/map/map-types';
import { followUpMoves } from '@/features/learn/opening-data';
import { lineMoves, type LineMove } from '@/features/learn/model';
import { KIND_SHOWN } from '@/features/learn/views';

/** One opening as the map draws it: its lines in order, the index beside it, the overlays, where each idea is shown. */
export type OpeningMap = {
  lines: MapLine[];
  index: MapIndexLine[];
  /** The variations, each with the colour its lines are drawn in. */
  groups: { id: string; name: string; colour: number }[];
  trigger: number;
  data: MapOverlayData;
  /** The first move showing each idea, to go to it. */
  ideas: Map<string, { line: string; ply: number }>;
  /** The main lines: kind main, and each variation's first line. */
  main: Set<string>;
  /** A follow-up drawn as a branch: which step and follow-up it is, to open it. */
  followUps: Map<string, { step: number; index: number }>;
};

const asMoveState = (state: ItemState | undefined): MoveState =>
  state === 'learning' || state === 'known' || state === 'mastered' ? state : 'open';

/** The standard NAG codes of the marks on a move. */
const NAG_MARK: Record<number, string> = { 1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!' };

/** A grade's classic mark, for a move worse than sound. */
const GRADE_MARK: Partial<Record<Grade, string>> = { inaccuracy: '?!', mistake: '?', blunder: '??' };

const scoreOf = (line: { cp?: number; mate?: number }): Score =>
  line.mate !== undefined ? { mate: line.mate } : { cp: line.cp ?? 0 };

/**
 * The engine's mark on a move: ?!, ? or ?? on the opponent's moves by what they cost against the best move (a learner's
 * own move is what the opening teaches, so it is never marked down), and ! on any move that is the only good one: the
 * engine's first choice, with its second a mistake or worse.
 */
function engineMark(
  move: { uci: string; before: string; after: string },
  mine: boolean,
  side: Side,
  facts: OpeningFacts | undefined,
  grades: Parameters<typeof gradeOf>[1],
): string | undefined {
  const before = facts?.evals[move.before]?.lines;
  const best = before?.[0];
  if (!best) return undefined;
  const mover: Side = mine ? side : side === 'white' ? 'black' : 'white';
  if (best.pv[0] === move.uci) {
    const second = before?.[1];
    if (!second) return undefined;
    const grade = gradeOf(moveCost(scoreOf(best), scoreOf(second), mover), grades);
    return grade === 'mistake' || grade === 'blunder' ? '!' : undefined;
  }
  const after = factsEval(facts, move.after);
  if (mine || !after) return undefined;
  return GRADE_MARK[gradeOf(moveCost(scoreOf(best), after.score, mover), grades)];
}

/** A line's name under its variation's heading: what comes after the "Advance: " they share. */
const shortName = (name: string) => (name.includes(': ') ? name.slice(name.indexOf(': ') + 2) : name);

/**
 * Builds the map of one opening (docs/v2/pages/map.md) from its tree, its shipped facts and the learner's states:
 * - colour: a line takes its variation's, so the index and the tree can be read together;
 * - progress: each learner move's state, from its move card;
 * - gaps: replies the band plays at least `minShare` of the time after a learner move that no line answers;
 * - mistakes: where a follow-up's mistake happens, on the move that leads there, practised once its cards are begun;
 * - marks: the author's !, !!, ?! and so on; shares: how often the band plays each move;
 * - games: how often the band reaches the position after each move.
 */
export function openingMap(
  opening: BuiltOpening,
  facts: OpeningFacts | undefined,
  cards: ReadonlyMap<string, ItemState>,
  followUps: readonly FollowUp[],
  followUpStates: ReadonlyMap<string, ItemState>,
  minShare: number,
  grades: Parameters<typeof gradeOf>[1],
): OpeningMap {
  const groups = opening.variations.map((variation, colour) => ({
    id: variation.id,
    name: variation.name ?? variation.id,
    colour,
  }));
  const colourOf = new Map(groups.map((group) => [group.id, group.colour]));
  const byLine: { id: string; variation: string; name: string; kind: string; moves: LineMove[] }[] = opening.lines.map(
    (line) => ({
      id: line.id,
      variation: line.variation,
      name: shortName(line.name ?? line.id),
      kind: line.kind,
      moves: lineMoves(opening, line.id),
    }),
  );
  // Each follow-up is drawn as a branch of its own: the mistake with its mark, then the punishment.
  const followUpLinks = new Map<string, { step: number; index: number }>();
  for (const followUp of followUps) {
    const step = opening.steps.findIndex((candidate) => candidate.id === followUp.step);
    if (step < 0) continue;
    const owner = opening.steps[step]!;
    const refutation = opening.positions[followUp.mistake.epd]?.refutations?.find(
      (candidate) => candidate.uci === followUp.mistake.uci,
    );
    const moves = followUpMoves(followUp).map((move, i): LineMove => ({
      ...move,
      ...((i === 0 ? refutation?.note : refutation?.then[i - 1]?.note)
        ? { note: (i === 0 ? refutation?.note : refutation?.then[i - 1]?.note)! }
        : {}),
    }));
    const id = `follow-up-${step + 1}-${followUp.index + 1}`;
    followUpLinks.set(id, { step: step + 1, index: followUp.index + 1 });
    byLine.push({
      id,
      variation: owner.variation,
      name: `If ${numberedMove(followUp.ply, followUp.mistake.san)}`,
      kind: 'trap',
      moves: [...lineMoves(opening, owner.line).slice(0, followUp.ply), ...moves],
    });
  }
  const lines: MapLine[] = byLine.map((line) => ({
    id: line.id,
    name: line.name,
    kind: line.kind,
    colour: colourOf.get(line.variation) ?? 0,
    moves: line.moves.map(({ san, uci, before, after, note }) => ({
      san,
      uci,
      before,
      after,
      ...(note ? { note } : {}),
    })),
  }));
  const trigger = opening.startPly;
  const layout = layoutLines(lines, { trigger });
  const states: Record<string, MoveState> = {};
  const gaps: NonNullable<MapOverlayData['gaps']> = {};
  const mistakes: NonNullable<MapOverlayData['mistakes']> = {};
  const games: Record<string, number> = {};
  const shares: Record<string, number> = {};
  const marks: Record<string, string> = {};
  const ideas = new Map<string, { line: string; ply: number }>();
  const keyAfter = new Map<string, string>();
  for (const line of byLine) {
    const { moves } = line;
    moves.forEach((move, i) => {
      const key = keyOf(moves, i + 1);
      keyAfter.set(move.after, keyAfter.get(move.after) ?? key);
      const reached = facts?.counts[move.after]?.games;
      if (reached !== undefined) games[key] = reached;
      const from = facts?.counts[move.before];
      const played = from?.moves.find((reply) => reply.uci === move.uci);
      if (from && from.games > 0 && played) shares[key] = played.games / from.games;
      // The author's mark first, then the engine's.
      const mark =
        move.note?.nag?.map((code) => NAG_MARK[code]).find(Boolean) ??
        engineMark(move, move.mine, opening.side, facts, grades);
      if (mark) marks[key] = mark;
      for (const idea of move.note?.ideas ?? []) if (!ideas.has(idea)) ideas.set(idea, { line: line.id, ply: i });
      if (!move.mine) return;
      states[key] = asMoveState(cards.get(moveCardId(move.before, move.uci)));
      const counts = facts?.counts[move.after];
      if (!counts || counts.games <= 0) return;
      const answered = new Set(opening.positions[move.after]?.moves.map((answer) => answer.uci) ?? []);
      const holes = counts.moves
        .filter((reply) => !answered.has(reply.uci) && reply.games / counts.games >= minShare)
        .map((reply) => ({ san: reply.san, share: reply.games / counts.games }));
      if (holes.length) gaps[key] = holes;
    });
  }
  for (const followUp of followUps) {
    const key = keyAfter.get(followUp.mistake.epd);
    if (!key) continue;
    const state = followUpStates.get(followUp.id);
    const grade = followUp.mistake.grade === 'blunder' ? 'blunder' : 'mistake';
    const seen = mistakes[key];
    // A move can lead to several: the most common one speaks for it.
    if (seen && seen.share >= (followUp.mistake.share ?? 0)) continue;
    mistakes[key] = {
      share: followUp.mistake.share ?? 0,
      practised: state !== undefined && state !== 'open' && state !== 'locked',
      grade,
      san: followUp.mistake.san,
    };
  }
  const main = new Set<string>();
  for (const variation of opening.variations) if (variation.lines[0]) main.add(variation.lines[0]);
  for (const line of opening.lines) if (line.kind === 'main') main.add(line.id);
  const index: MapIndexLine[] = byLine.map((line) => {
    const { moves } = line;
    const mine = moves.filter((move) => move.mine);
    const known = mine.filter((move) => {
      const state = cards.get(moveCardId(move.before, move.uci));
      return state === 'known' || state === 'mastered';
    }).length;
    return {
      id: line.id,
      name: line.name,
      kind: KIND_SHOWN[line.kind as keyof typeof KIND_SHOWN],
      writtenFor: opening.side,
      parent: layout.parents.get(line.id) ?? null,
      lane: colourOf.get(line.variation) ?? 0,
      group: line.variation,
      opening: opening.name,
      known: mine.length ? known / mine.length : 0,
      moves: moves.map(({ san, uci, after }) => ({ san, uci, after })),
      ...(line.kind === 'rare' ? { rare: true } : {}),
    };
  });
  return {
    lines,
    index,
    groups,
    trigger,
    data: { states, gaps, mistakes, games, shares, marks },
    ideas,
    main,
    followUps: followUpLinks,
  };
}
