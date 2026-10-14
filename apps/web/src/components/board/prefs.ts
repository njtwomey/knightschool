import { create } from 'zustand';
import { BOARD_THEMES, type BoardThemeId } from './themes';

export const PIECE_SETS = [
  { id: 'classic', name: 'Classic', note: 'The default set.' },
  { id: 'bold', name: 'Bold outline', note: 'Heavier outlines, easier to read when small.' },
  { id: 'soft', name: 'Soft shadow', note: 'A gentle shadow that lifts pieces off the board.' },
] as const;

export type PieceSetId = (typeof PIECE_SETS)[number]['id'];

export type BoardPrefs = {
  theme: BoardThemeId;
  pieces: PieceSetId;
  /** Dots on the squares the selected piece can go to. */
  legalMoves: boolean;
  /** Tint the square under the pointer. */
  hover: boolean;
  coordinates: boolean;
};

export const DEFAULT_BOARD_PREFS: BoardPrefs = {
  theme: 'green',
  pieces: 'classic',
  legalMoves: true,
  hover: false,
  coordinates: true,
};

const KEY = 'knightschool.board';

/** Reads saved preferences, keeping only valid values so an old or damaged value cannot break the board. */
export function parseBoardPrefs(raw: string | null): BoardPrefs {
  let saved: Partial<Record<keyof BoardPrefs, unknown>> = {};
  try {
    const parsed: unknown = JSON.parse(raw ?? '{}');
    if (parsed && typeof parsed === 'object') saved = parsed as typeof saved;
  } catch {
    // fall through to the defaults
  }
  const flag = (key: 'legalMoves' | 'hover' | 'coordinates') =>
    typeof saved[key] === 'boolean' ? (saved[key] as boolean) : DEFAULT_BOARD_PREFS[key];
  return {
    theme: BOARD_THEMES.some((theme) => theme.id === saved.theme)
      ? (saved.theme as BoardThemeId)
      : DEFAULT_BOARD_PREFS.theme,
    pieces: PIECE_SETS.some((set) => set.id === saved.pieces)
      ? (saved.pieces as PieceSetId)
      : DEFAULT_BOARD_PREFS.pieces,
    legalMoves: flag('legalMoves'),
    hover: flag('hover'),
    coordinates: flag('coordinates'),
  };
}

function read(): BoardPrefs {
  try {
    return parseBoardPrefs(localStorage.getItem(KEY));
  } catch {
    return DEFAULT_BOARD_PREFS;
  }
}

type Store = BoardPrefs & { set: (patch: Partial<BoardPrefs>) => void };

/** Per-device convenience, so it lives in localStorage and works before the database is open. */
export const useBoardPrefs = create<Store>((set, get) => ({
  ...read(),
  set(patch) {
    set(patch);
    const { theme, pieces, legalMoves, hover, coordinates } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme, pieces, legalMoves, hover, coordinates }));
    } catch {
      // not saved; the choice still applies for this visit
    }
  },
}));
