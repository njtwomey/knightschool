import type { BuiltOpening } from '../content/build-opening';
import type { LineKind } from '../content/schema';

/** Card ids, one per kind (docs/v2/schemas/learner.md): what you know about a move is keyed by position and move. */
export const moveCardId = (epd: string, uci: string) => `move:${epd}:${uci}`;
export const puzzleCardId = (id: string) => `puzzle:${id}`;
export const deviationCardId = (source: 'lichess' | 'chessdotcom', game: string, ply: number) =>
  `deviation:${source}:${game}:${ply}`;

export type MoveCardDefinition = { id: string; epd: string; uci: string; san: string; step: string };

/**
 * Lines whose learner moves earn cards: every kind an opening's path teaches as a step, a trap to spring included (its
 * moves are the punishment to remember); rare lines only when included; alternatives are shown, never drilled.
 */
const CARD_KINDS: ReadonlySet<LineKind> = new Set(['main', 'sideline', 'gambit', 'trap', 'danger']);

/** Whether a line's learner moves earn cards (and so are drilled and reviewed). */
export const lineEarnsCards = (line: { kind: LineKind; alternative: boolean }, includeRare = false): boolean =>
  !line.alternative && (CARD_KINDS.has(line.kind) || (includeRare && line.kind === 'rare'));

/**
 * The move cards an opening offers, in step order: each learner move of a line that earns cards, once, tagged with the
 * step that teaches it. Rare lines join when `includeRare`.
 */
export function moveCards(opening: BuiltOpening, options: { includeRare?: boolean } = {}): MoveCardDefinition[] {
  const kinds = new Map(opening.lines.map((line) => [line.id, line]));
  const cards: MoveCardDefinition[] = [];
  const seen = new Set<string>();
  for (const step of opening.steps) {
    const line = kinds.get(step.line)!;
    if (!lineEarnsCards(line, options.includeRare)) continue;
    for (const ply of rangeOf(step)) {
      const uci = line.moves[ply]!;
      const epd = ply === 0 ? undefined : findBefore(opening, line.moves, ply);
      if (!epd) continue;
      const move = opening.positions[epd]?.moves.find((candidate) => candidate.uci === uci);
      if (!move?.mine) continue;
      const id = moveCardId(epd, uci);
      if (seen.has(id)) continue;
      seen.add(id);
      cards.push({ id, epd, uci, san: move.san, step: step.id });
    }
  }
  return cards;
}

const rangeOf = (step: { from: number; to: number }) =>
  Array.from({ length: step.to - step.from + 1 }, (_, i) => step.from + i);

/** The position before a line's move at `ply`, found by walking the opening's tree from its start. */
function findBefore(opening: BuiltOpening, ucis: readonly string[], ply: number): string | undefined {
  let epd = opening.startEpd;
  for (let i = opening.startPly; i < ply; i++) {
    const next = opening.positions[epd]?.moves.find((move) => move.uci === ucis[i]);
    if (!next) return undefined;
    epd = next.to;
  }
  return epd;
}

/** A question in words (content `questions:`), scheduled like any card: `quiz:<opening>:<id>`. */
export const quizCardId = (opening: string, id: string) => `quiz:${opening}:${id}`;
