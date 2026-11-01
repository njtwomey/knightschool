import { Circle, CircleCheck, CircleDot, GraduationCap, Lock, type LucideIcon } from 'lucide-react';
import { siteConfig } from '@/data/site-config';

/** How far along a move, step or variation is: one set of states, always derived from the answers (docs/v2/model.md). */
export type ProgressState = 'locked' | 'open' | 'learning' | 'known' | 'mastered';
export const PROGRESS_STATES: ProgressState[] = ['locked', 'open', 'learning', 'known', 'mastered'];

/** What the state is of: it chooses the word and the hover sentence. An opening has no badge, only a ring. */
export type StateOf = 'move' | 'step' | 'variation' | 'idea';

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
const count = (n: number) => NUMBER_WORDS[n] ?? String(n);
const days = (n: number) => (n === 7 ? 'a week' : n === 14 ? 'two weeks' : `${n} days`);

const { knownAfterRight, masteredDays } = siteConfig.judge;

export type StateInfo = {
  icon: LucideIcon;
  word: string;
  /** The icon's colour. */
  text: string;
  /** The badge's tint and ring. */
  tone: string;
  /** The filled form, for dots, bars and rings. */
  fill: string;
};

export const STATE_INFO: Record<ProgressState, StateInfo> = {
  locked: {
    icon: Lock,
    word: 'Locked',
    text: 'text-state-locked',
    tone: 'bg-state-locked/10 ring-state-locked/40',
    fill: 'bg-state-locked',
  },
  open: {
    icon: Circle,
    word: 'Open',
    text: 'text-state-open',
    tone: 'bg-transparent ring-state-open/50',
    fill: 'bg-state-open',
  },
  learning: {
    icon: CircleDot,
    word: 'Learning',
    text: 'text-state-learning',
    tone: 'bg-state-learning/15 ring-state-learning/50',
    fill: 'bg-state-learning',
  },
  known: {
    icon: CircleCheck,
    word: 'Known',
    text: 'text-state-known',
    tone: 'bg-state-known/15 ring-state-known/45',
    fill: 'bg-state-known',
  },
  mastered: {
    icon: GraduationCap,
    word: 'Mastered',
    text: 'text-background',
    tone: 'bg-state-mastered ring-state-mastered text-background',
    fill: 'bg-state-mastered',
  },
};

/** An idea is open, seen or practised: the same states under its own words. */
const IDEA_WORDS: Partial<Record<ProgressState, string>> = { learning: 'Seen', known: 'Practised' };

export function stateWord(state: ProgressState, of: StateOf): string {
  return (of === 'idea' && IDEA_WORDS[state]) || STATE_INFO[state].word;
}

/** The meaning of a state, said on hover. */
export function stateMeaning(state: ProgressState, of: StateOf): string {
  switch (state) {
    case 'locked':
      return of === 'variation'
        ? 'Opens when the variation before it is known, or test out.'
        : 'Opens when the step before it is known, or test out.';
    case 'open':
      return of === 'idea' ? 'Not met yet.' : 'Nothing studied yet.';
    case 'learning':
      return of === 'idea' ? 'Seen in a step, not practised yet.' : 'Some moves are in your reviews, not all sure yet.';
    case 'known':
      if (of === 'variation') return 'Its checkpoint is cleared.';
      if (of === 'idea') return 'Practised in your reviews or puzzles.';
      return of === 'move'
        ? `Right in its last ${count(knownAfterRight)} answers.`
        : `Every move right in its last ${count(knownAfterRight)} answers.`;
    case 'mastered':
      if (of === 'variation') return 'Every step in it is mastered.';
      return of === 'move'
        ? `Now asked ${days(masteredDays)} or more apart.`
        : `Every move is now asked ${days(masteredDays)} or more apart.`;
  }
}
