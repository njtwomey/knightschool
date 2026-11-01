import { numberedMove } from '@knightschool/core';
import type { ProgressState } from '@/components/progress/states';
import type { Stretch } from './step-moves';
import type { Side } from './types';

/** Something attached to a step or variation, never needed to know it. */
export type Extra = { kind: 'puzzle' | 'trap' | 'question'; label: string; detail?: string; href?: string };

/** One step: about four of the learner's moves, learned and tested at once. */
export type StepData = {
  id: string;
  /** Its place in the opening. */
  number: number;
  /** The author's title; an automatic step gets a headline from its first move. */
  title?: string;
  state: ProgressState;
  /** The learner's side. */
  side: Side;
  /** The moves leading in, greyed. */
  lead?: Stretch;
  /** One run per branch; most steps have one. */
  stretches: Stretch[];
  /** Plies of the learner's moves that are known (ticked). */
  known?: number[];
  counts: { mine: number; known: number; inReviews: number };
  /** For a locked step: the step that opens it. */
  opensWhen?: { number: number; name: string; href?: string };
  /** The stage reached, as an index into `teach.stages`, once started. */
  stage?: number;
  extras?: Extra[];
};

export const STAGE_NAMES: Record<string, string> = {
  read: 'Read',
  watch: 'Watch',
  try: 'Try',
  mistakes: 'Their mistakes',
  done: 'Done',
};

/** A step's title, or a headline from its first move: "When 3...Nf6 is played". */
export function stepTitle(step: StepData): string {
  if (step.title) return step.title;
  const stretch = step.stretches[0];
  const first = stretch?.moves[0];
  if (!stretch || !first) return `Step ${step.number}`;
  const theirs = (stretch.firstPly % 2 === 0) !== (step.side === 'white');
  const move = numberedMove(stretch.firstPly, first.san);
  return theirs ? `When ${move} is played` : `From ${move}`;
}
