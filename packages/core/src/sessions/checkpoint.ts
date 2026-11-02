import { playMove } from '../chess/play';
import type { SiteConfig } from '../config/site-config';
import { positionPlies } from '../content/plies';
import type { BuiltOpening } from '../content/build-opening';
import type { BuiltQuestion } from '../questions/questions';
import type { Exercise } from '../exercise/exercise';
import { moveCards } from '../training/cards';
import type { OpponentMistake } from '../training/mistakes';
import { drillScope, scopePositions } from './drill';
import { moveExercise, moveInto } from './review';

/** Shuffles a copy with a random source in [0, 1), so a seeded source gives the same order each time. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * An opponent's mistake to punish (`opponentMistakes`) as an exercise: the mistake shown as the last move, the
 * punishing move the one answer.
 */
export function mistakeExercise(
  mistake: Pick<OpponentMistake, 'epd' | 'uci' | 'punish'>,
  options: { mode: 'checkpoint' | 'try'; tries?: number; help?: boolean; startPly?: number },
): Exercise {
  const { mode, ...rest } = options;
  const after = playMove(mistake.epd, mistake.uci)?.epd ?? mistake.epd;
  return {
    ...moveExercise({ epd: after, uci: mistake.punish }, { mode: 'checkpoint', before: mistake.uci, ...rest }),
    id: `mistake:${after}:${mistake.punish}`,
    mode,
    // A punishment is an exercise, never a card (docs/v2/library/training.md, "Which positions earn cards").
    record: 'none',
  };
}

/** How many of each kind a checkpoint asks (config `teach.checkpointMix`). */
export type CheckpointMix = SiteConfig['teach']['checkpointMix'];

export type CheckpointPlan = {
  /** The exercises played on the board, in a mixed order: positions, mistakes to punish, puzzles. */
  exercises: Exercise[];
  /** The typed questions, asked after the board's exercises. */
  questions: BuiltQuestion[];
  counts: { positions: number; mistakes: number; puzzles: number; questions: number };
};

/**
 * A variation's checkpoint (docs/v2/pages/checkpoint.md): a position from each step (its Try), more positions to make
 * up `mix.positions`, the opponent's mistakes to punish, puzzles matched to the variation (`puzzles`, best first, as
 * exercises) and typed questions, each with `tries` tries (config `teach.checkpointTries`) and no help. A kind with too
 * few to draw is made up with positions, so the check keeps its length while the variation has them.
 */
export function checkpointPlan(
  opening: BuiltOpening,
  variation: string,
  options: {
    random: () => number;
    tries: number;
    mix: CheckpointMix;
    /** The opponent's mistakes on the variation's lines (`opponentMistakes`), most common first. */
    mistakes?: readonly Pick<OpponentMistake, 'epd' | 'uci' | 'punish'>[];
    puzzles?: readonly Exercise[];
  },
): CheckpointPlan {
  const { random, tries, mix } = options;
  const plies = positionPlies(opening);
  const inScope = new Set(scopePositions(drillScope(opening, variation)).map((card) => `${card.epd}:${card.uci}`));
  const cards = moveCards(opening).filter(
    (card) =>
      inScope.has(`${card.epd}:${card.uci}`) &&
      opening.steps.find((step) => step.id === card.step)?.variation === variation,
  );
  // Positions the scope reaches that no step of the variation teaches (shared with an earlier variation) come last.
  const taught = new Set(cards.map((card) => `${card.epd}:${card.uci}`));
  const shared = scopePositions(drillScope(opening, variation)).filter(
    (card) => !taught.has(`${card.epd}:${card.uci}`),
  );
  const questions = shuffled(
    (opening.questions ?? []).filter((question) => question.variation === variation),
    random,
  ).slice(0, mix.questions);
  const mistakes = (options.mistakes ?? []).slice(0, mix.mistakes);
  const puzzles = (options.puzzles ?? []).slice(0, mix.puzzles);
  const short = mix.mistakes - mistakes.length + mix.puzzles - puzzles.length + mix.questions - questions.length;
  const want = mix.positions + short;
  const byStep = new Map<string, typeof cards>();
  for (const card of shuffled(cards, random)) byStep.set(card.step, [...(byStep.get(card.step) ?? []), card]);
  const firsts = [...byStep.values()].map((list) => list[0]!);
  const rest = shuffled([...cards.filter((card) => !firsts.includes(card)), ...shared], random);
  const positions = [...firsts, ...rest].slice(0, Math.max(want, firsts.length));
  const common = { tries, help: false } as const;
  const exercises = shuffled(
    [
      ...positions.map((card) =>
        moveExercise(card, {
          mode: 'checkpoint',
          before: moveInto(opening, card.epd),
          ...common,
          startPly: plies.get(card.epd),
        }),
      ),
      ...mistakes.map((mistake) => {
        const ply = plies.get(mistake.epd);
        return mistakeExercise(mistake, {
          mode: 'checkpoint',
          ...common,
          ...(ply !== undefined ? { startPly: ply + 1 } : {}),
        });
      }),
      ...puzzles.map((puzzle) => ({ ...puzzle, mode: 'checkpoint' as const, ...common, record: 'none' as const })),
    ],
    random,
  );
  return {
    exercises,
    questions,
    counts: {
      positions: positions.length,
      mistakes: mistakes.length,
      puzzles: puzzles.length,
      questions: questions.length,
    },
  };
}

/** The previous checkpoint's shape, kept for callers that want positions only: each learner position once. */
export function checkpointExercises(
  opening: BuiltOpening,
  variation: string,
  random: () => number,
  tries: number,
): Exercise[] {
  const positions = scopePositions(drillScope(opening, variation));
  const plies = positionPlies(opening);
  return shuffled(positions, random).map((card) =>
    moveExercise(card, {
      mode: 'checkpoint',
      before: moveInto(opening, card.epd),
      tries,
      help: false,
      startPly: plies.get(card.epd),
    }),
  );
}

/**
 * Whether a check is cleared (config `teach.checkpointMark`: nine of ten, no blunders): at least `mark` of its
 * exercises answered right, and no move graded a blunder.
 */
export function checkpointCleared(results: readonly { right: boolean }[], mark: number, blunders = 0): boolean {
  if (!results.length || blunders > 0) return false;
  return results.filter((result) => result.right).length / results.length >= mark - 1e-9;
}
