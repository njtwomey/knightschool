import type { ModeCountsData } from '@/components/progress/mode-counts';
import type { ProgressCounts } from '@/components/progress/counts';

export type Side = 'white' | 'black';

/** A small board for a card or a tile: the position, the move that reached it, and which way up. */
export type Thumb = { epd: string; lastMove?: { from: string; to: string }; orientation: Side };

/** An opening's character, one or two per opening, written by its author. */
export type StyleTag = 'solid' | 'attacking' | 'gambit' | 'trap-heavy' | 'classical';

export const STYLE_INFO: Record<StyleTag, { name: string; hint: string }> = {
  solid: { name: 'Solid', hint: 'Solid: a safe king and a sound pawn structure; hard to go badly wrong.' },
  attacking: { name: 'Attacking', hint: 'Attacking: aims at the enemy king early, with sharp lines to know.' },
  gambit: { name: 'Gambit', hint: 'Gambit: gives a pawn early for quick development.' },
  'trap-heavy': { name: 'Trap-heavy', hint: 'Trap-heavy: natural replies at club level often walk into a trap.' },
  classical: { name: 'Classical', hint: 'Classical: develop the pieces, take the centre, castle; the old rules.' },
};

/** An opening as a list shows it: what it is, who it suits, and how far the learner has got with it. */
export type OpeningSummary = {
  id: string;
  /** Lichess's name, or the author's. */
  name: string;
  eco?: string;
  lichessUrl?: string;
  side: Side;
  /** "As White", "Against 1.e4". */
  trigger: string;
  /** One line from the introduction (`about.suits`). */
  suits: string;
  style: StyleTag[];
  level: 'beginners' | 'improvers';
  thumb: Thumb;
  size: { variations: number; steps: number; hours: number };
  /** Once started. */
  started?: { progress: ProgressCounts; modes: ModeCountsData; due?: number; finalTestCleared?: boolean };
  /** "against 1.e4", when it is in the learner's repertoire. */
  inRepertoire?: string;
  /** Written in Create on this device. */
  authored?: boolean;
  href: string;
  editHref?: string;
};

/** The opening's credited sources (`sources:` in its YAML). */
export type SourceKind = 'video' | 'book' | 'article' | 'study' | 'database';
export type Source = { title: string; url: string; author?: string; note?: string; kind?: SourceKind };
