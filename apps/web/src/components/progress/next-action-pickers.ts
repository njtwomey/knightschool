import { BookOpen, Flag, Plus, Puzzle, Repeat, type LucideIcon } from 'lucide-react';

/** What the pickers read: the learner's state in a scope, worked out when the page opens and after each session. */
export type NextState = {
  /** No repertoire yet: the only thing to do is choose one. */
  hasRepertoire: boolean;
  /** Moves and questions due now, and where the scheduled session starts. */
  due: number;
  dueHref: string;
  /** How many due reviews put review first (`schedule.reviewsFirstAt`, default 5). */
  reviewsFirstAt?: number;
  /** New moves left of today's allowance (`review.newPerDay`). */
  newLeftToday: number;
  /** The step being learned, at the stage it was left at. */
  stepInProgress?: { number: number; title: string; stage: string; href: string };
  /** The next open step; `first` when nothing in the opening is started yet. */
  nextOpenStep?: { number: number; title: string; opening: string; side: string; href: string; first?: boolean };
  /** A checkpoint whose steps are all known. */
  checkpoint?: { variation: string; href: string };
  /** An empty slot in the repertoire. */
  emptySlot?: { against: string; why: string; href: string };
  /** A puzzle from the learner's openings. */
  puzzleHref?: string;
  /** When the next review falls, in words: "tomorrow at about 9:00". */
  nextReview?: string;
  onboardingHref?: string;
};

export type NextChoice = { label: string; why: string; href: string; icon: LucideIcon };

/** One kind of next thing: an address and a sentence, or nothing now. Adding a kind is adding a picker. */
export type NextPicker = { id: string; pick: (state: NextState) => NextChoice | null };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const NEXT_PICKERS: NextPicker[] = [
  {
    id: 'onboarding',
    pick: (s) =>
      s.hasRepertoire
        ? null
        : {
            label: 'Choose your first opening',
            why: 'Three questions, and we suggest an opening for each side.',
            href: s.onboardingHref ?? '#',
            icon: Plus,
          },
  },
  {
    id: 'reviews-first',
    pick: (s) =>
      s.due >= (s.reviewsFirstAt ?? 5)
        ? {
            label: `Review ${plural(s.due, 'move')}`,
            why: `${plural(s.due, 'move is', 'moves are')} due; reviews come first.`,
            href: s.dueHref,
            icon: Repeat,
          }
        : null,
  },
  {
    id: 'step-in-progress',
    pick: (s) =>
      s.stepInProgress
        ? {
            label: `Continue step ${s.stepInProgress.number}: ${s.stepInProgress.title}`,
            why: `You are in the ${s.stepInProgress.stage} stage.`,
            href: s.stepInProgress.href,
            icon: BookOpen,
          }
        : null,
  },
  {
    id: 'next-open-step',
    pick: (s) => {
      const step = s.nextOpenStep;
      if (!step || s.newLeftToday <= 0) return null;
      return step.first
        ? {
            label: `Start the ${step.opening}`,
            why: `Your ${step.side} repertoire is ready to start.`,
            href: step.href,
            icon: BookOpen,
          }
        : {
            label: `Start step ${step.number}: ${step.title}`,
            why: `The next step in the ${step.opening}; ${plural(s.newLeftToday, 'new move')} left today.`,
            href: step.href,
            icon: BookOpen,
          };
    },
  },
  {
    id: 'checkpoint',
    pick: (s) =>
      s.checkpoint
        ? {
            label: `Take the ${s.checkpoint.variation} checkpoint`,
            why: 'Every step in it is known.',
            href: s.checkpoint.href,
            icon: Flag,
          }
        : null,
  },
  {
    id: 'few-reviews',
    pick: (s) =>
      s.due > 0
        ? {
            label: `Review ${plural(s.due, 'move')}`,
            why: 'A short review: nothing new is waiting today.',
            href: s.dueHref,
            icon: Repeat,
          }
        : null,
  },
  {
    id: 'empty-slot',
    pick: (s) =>
      s.emptySlot
        ? {
            label: `Choose an opening ${s.emptySlot.against}`,
            why: s.emptySlot.why,
            href: s.emptySlot.href,
            icon: Plus,
          }
        : null,
  },
  {
    id: 'puzzle',
    pick: (s) =>
      s.puzzleHref
        ? {
            label: 'Solve a puzzle from your openings',
            why: "Today's new moves are used; a puzzle keeps the ideas fresh.",
            href: s.puzzleHref,
            icon: Puzzle,
          }
        : null,
  },
];

/** The first picker with something to offer, in order; null when there is nothing to do now. */
export function pickNext(state: NextState, pickers: NextPicker[] = NEXT_PICKERS): NextChoice | null {
  for (const picker of pickers) {
    const choice = picker.pick(state);
    if (choice) return choice;
  }
  return null;
}
