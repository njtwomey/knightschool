import { BookOpen, Puzzle, Repeat, Swords, Target, type LucideIcon } from 'lucide-react';

/** The modes counted per opening, in their fixed order (docs/v2/components/mode-counts.md). */
export type ModeId = 'learn' | 'review' | 'drill' | 'puzzles' | 'playOn';
export const MODE_ORDER: ModeId[] = ['learn', 'review', 'drill', 'puzzles', 'playOn'];

export type ModeInfo = {
  name: string;
  icon: LucideIcon;
  /** The icon's colour. */
  text: string;
  /** A pill's tint and ring. */
  tone: string;
  /** The solid colour, for a card's band or a square. */
  fill: string;
};

/** Each mode's colour is the one on its practice tile and its menu pill (docs/v2/patterns/colours.md). */
export const MODE_INFO: Record<ModeId, ModeInfo> = {
  learn: {
    name: 'Learn',
    icon: BookOpen,
    text: 'text-mode-learn',
    tone: 'bg-mode-learn/12 ring-mode-learn/40',
    fill: 'bg-mode-learn',
  },
  review: {
    name: 'Review',
    icon: Repeat,
    text: 'text-mode-review',
    tone: 'bg-mode-review/12 ring-mode-review/40',
    fill: 'bg-mode-review',
  },
  drill: {
    name: 'Drill',
    icon: Target,
    text: 'text-mode-drill',
    tone: 'bg-mode-drill/12 ring-mode-drill/40',
    fill: 'bg-mode-drill',
  },
  puzzles: {
    name: 'Puzzles',
    icon: Puzzle,
    text: 'text-mode-puzzle',
    tone: 'bg-mode-puzzle/12 ring-mode-puzzle/40',
    fill: 'bg-mode-puzzle',
  },
  playOn: {
    name: 'Play on',
    icon: Swords,
    text: 'text-mode-play-on',
    tone: 'bg-mode-play-on/12 ring-mode-play-on/40',
    fill: 'bg-mode-play-on',
  },
};

/** The CSS variable of each mode's colour, for drawing outside Tailwind (charts). */
export const MODE_VAR: Record<ModeId, string> = {
  learn: '--mode-learn',
  review: '--mode-review',
  drill: '--mode-drill',
  puzzles: '--mode-puzzle',
  playOn: '--mode-play-on',
};
