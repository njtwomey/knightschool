import { moveCardId, type FollowUp, type ItemState } from '@knightschool/core';
import type { BuiltOpening, OpeningFacts } from '@knightschool/core/content';
import type { MapIndexLine } from '@/components/map/map-index';
import { keyOf, layoutLines, type MapLine } from '@/components/map/lane-layout';
import type { MapOverlayData, MoveState } from '@/components/map/map-types';
import { lineMoves } from '@/features/learn/model';
import { KIND_SHOWN } from '@/features/learn/views';

/** One opening as the map draws it: its lines in order (the main line first), the index beside it, the overlays. */
export type OpeningMap = {
  lines: MapLine[];
  index: MapIndexLine[];
  trigger: number;
  data: MapOverlayData;
  counts: Partial<Record<MoveState, number>>;
};

const asMoveState = (state: ItemState | undefined): MoveState =>
  state === 'learning' || state === 'known' || state === 'mastered' ? state : 'open';

/**
 * Builds the map of one opening (docs/v2/pages/map.md) from its tree, its shipped facts and the learner's states:
 * - progress: each learner move's state, from its move card;
 * - gaps: replies the band plays at least `minShare` of the time after a learner move that no line answers;
 * - mistakes: where a follow-up's mistake happens, on the move that leads there, practised once its cards are begun;
 * - games: how often the band reaches the position after each move.
 */
export function openingMap(
  opening: BuiltOpening,
  facts: OpeningFacts | undefined,
  cards: ReadonlyMap<string, ItemState>,
  followUps: readonly FollowUp[],
  followUpStates: ReadonlyMap<string, ItemState>,
  minShare: number,
): OpeningMap {
  const byLine = opening.lines.map((line) => ({ line, moves: lineMoves(opening, line.id) }));
  const lines: MapLine[] = byLine.map(({ line, moves }) => ({
    id: line.id,
    name: line.name ?? line.id,
    kind: line.kind,
    moves: moves.map(({ san, uci, before, after }) => ({ san, uci, before, after })),
  }));
  const trigger = opening.startPly;
  const layout = layoutLines(lines, { trigger });
  const states: Record<string, MoveState> = {};
  const gaps: NonNullable<MapOverlayData['gaps']> = {};
  const mistakes: NonNullable<MapOverlayData['mistakes']> = {};
  const games: Record<string, number> = {};
  const keyAfter = new Map<string, string>();
  for (const { moves } of byLine) {
    moves.forEach((move, i) => {
      const key = keyOf(moves, i + 1);
      keyAfter.set(move.after, keyAfter.get(move.after) ?? key);
      const reached = facts?.counts[move.after]?.games;
      if (reached !== undefined) games[key] = reached;
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
    mistakes[key] = {
      share: followUp.mistake.share ?? 0,
      practised: state !== undefined && state !== 'open' && state !== 'locked',
    };
  }
  const index: MapIndexLine[] = byLine.map(({ line, moves }) => {
    const mine = moves.filter((move) => move.mine);
    const known = mine.filter((move) => {
      const state = cards.get(moveCardId(move.before, move.uci));
      return state === 'known' || state === 'mastered';
    }).length;
    return {
      id: line.id,
      name: line.name ?? line.id,
      kind: KIND_SHOWN[line.kind],
      writtenFor: opening.side,
      parent: layout.parents.get(line.id) ?? null,
      lane: layout.lanes.find((lane) => lane.line.id === line.id)?.lane ?? 0,
      opening: opening.name,
      known: mine.length ? known / mine.length : 0,
      moves: moves.map(({ san, uci, after }) => ({ san, uci, after })),
      ...(line.kind === 'rare' ? { rare: true } : {}),
    };
  });
  const counts: Partial<Record<MoveState, number>> = {};
  for (const state of Object.values(states)) counts[state] = (counts[state] ?? 0) + 1;
  return { lines, index, trigger, data: { states, gaps, mistakes, games }, counts };
}
