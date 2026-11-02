import { coverage, playMove, START_EPD, START_FEN, type CoverageResult } from '@knightschool/core';
import type { Gap } from '@/components/progress/gap-link';
import type { CoverageRow } from '@/components/progress/coverage-meter';
import { getSetting } from '@/data/settings';
import { cardStates } from '@/features/learn/model';
import { stepHref } from '@/features/learn/views';
import { writeBoardHash } from '@/pages/board/board-hash';
import { to } from '@/router/location';
import type { LearnerProgress, OpeningProgress } from '../progress';

/** The depths the meter shows (docs/v2/components/coverage-meter.md, `depths`). */
export const COVERAGE_DEPTHS = [5, 10, 15] as const;

const KNOWN = new Set(['known', 'mastered']);

/** The moves that reach an opening's start from the start of the game. */
const leadIn = (one: OpeningProgress) => one.opening.lines[0]?.moves.slice(0, one.opening.startPly) ?? [];

/** The learner's moves an opening has, by position: every one, or only those in `cards`. */
function answers(one: OpeningProgress, cards?: ReadonlySet<string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const card of one.cards) if (!cards || cards.has(card.id)) out.set(card.epd, card.uci);
  if (!cards) {
    // Moves the opening has but no card asks (an alternative's): they still cover the position.
    for (const [epd, node] of Object.entries(one.opening.positions)) {
      const mine = node.moves.find((move) => move.mine);
      if (mine && !out.has(epd)) out.set(epd, mine.uci);
    }
  }
  return out;
}

function walk(one: OpeningProgress, answer: ReadonlyMap<string, string>, minShare: number): CoverageResult {
  return coverage({
    start: one.opening.startEpd,
    startPly: one.opening.startPly,
    side: one.opening.side,
    answer: (epd) => answer.get(epd),
    counts: one.facts?.counts ?? {},
    minShare,
    depths: COVERAGE_DEPTHS,
  });
}

/**
 * Today's coverage meter (docs/v2/pages/today.md): for each opening the learner has started, the share of the band's
 * games reaching it that stay in moves the learner knows (a move known, or its step known) and in moves the opening
 * covers, by move 5, 10 and 15; the variation that would add most at move 10; and the biggest gap, the reply most
 * often met that the learner cannot answer yet. The baked counts start at each opening's own first position, so the
 * shares are of games that reach it.
 */
export function coverageOf(progress: LearnerProgress, openings: readonly OpeningProgress[]) {
  const minShare = getSetting('level.coverageTarget');
  const states = cardStates(progress.cards, progress.reviews);
  const rows: CoverageRow[] = [];
  const gaps: (Gap & { side: 'white' | 'black' })[] = [];
  for (const one of openings) {
    if (!one.facts) continue;
    const knownSteps = new Set(
      one.opening.steps.filter((step) => KNOWN.has(one.stepStates.get(step.id) ?? '')).map((step) => step.id),
    );
    const knownCards = new Set(
      one.cards.filter((card) => KNOWN.has(states.get(card.id) ?? '') || knownSteps.has(card.step)).map((c) => c.id),
    );
    const known = walk(one, answers(one, knownCards), minShare);
    const covered = walk(one, answers(one), minShare);
    // The variation not yet known that would add the most games at move 10.
    const at10 = (result: CoverageResult) => result.depths.find((depth) => depth.move === 10)?.share ?? 0;
    let gain: CoverageRow['gain'];
    for (const variation of one.opening.variations) {
      const ids = new Set(
        one.cards
          .filter((card) => one.opening.steps.find((step) => step.id === card.step)?.variation === variation.id)
          .map((card) => card.id),
      );
      if ([...ids].every((id) => knownCards.has(id))) continue;
      const share = at10(walk(one, answers(one, new Set([...knownCards, ...ids])), minShare)) - at10(known);
      if (share > 0.005 && (!gain || share > gain.share)) gain = { name: variation.name ?? variation.id, share };
    }
    rows.push({
      label: one.opening.name,
      games: `games that reach the ${one.opening.name}`,
      depths: known.depths.map((depth, i) => ({
        move: depth.move,
        known: depth.share,
        covered: Math.max(depth.share, covered.depths[i]?.share ?? 0),
      })),
      ...(gain ? { gain } : {}),
      ...(known.missingData ? { missingData: true } : {}),
    });
    const lead = leadIn(one);
    for (const gap of known.gaps) {
      const moves = [...lead, ...gap.moves];
      let epd = START_EPD;
      const run = moves.flatMap((uci) => {
        const played = playMove(epd, uci);
        if (!played) return [];
        epd = played.epd;
        return [{ san: played.san, uci: played.uci, after: played.epd }];
      });
      if (!run.length) continue;
      const card = one.cards.find((candidate) => candidate.epd === gap.epd);
      const number = card ? one.opening.steps.findIndex((step) => step.id === card.step) + 1 : 0;
      const step = card ? one.opening.steps[number - 1] : undefined;
      gaps.push({
        moves: run,
        share: gap.share,
        side: one.opening.side,
        fill:
          card && step
            ? {
                kind: 'unlearned',
                opening: one.opening.name,
                step: number,
                stepName: step.title ?? `step ${number}`,
                href: stepHref(one.opening.id, number),
              }
            : {
                kind: 'none',
                // No map page yet: the Board page at the reply.
                mapHref: to(
                  `/board${writeBoardHash({ fen: START_FEN, moves, ply: moves.length, side: one.opening.side })}`,
                ),
              },
      });
    }
  }
  return { rows, gaps: gaps.sort((a, b) => b.share - a.share), target: minShare };
}
