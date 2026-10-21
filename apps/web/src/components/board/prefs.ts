import { createPrefStore, isBoolean, oneOf, parsePrefs, type PrefSchema } from '@/lib/local-prefs';
import { BOARD_THEMES, type BoardThemeId } from './themes';

export const PIECE_SETS = [
  { id: 'classic', name: 'Classic', note: 'The default set.' },
  { id: 'bold', name: 'Bold outline', note: 'Heavier outlines, easier to read when small.' },
  { id: 'soft', name: 'Soft shadow', note: 'A gentle shadow that lifts pieces off the board.' },
] as const;

export type PieceSetId = (typeof PIECE_SETS)[number]['id'];

type BoardPrefs = {
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

const SCHEMA: PrefSchema<BoardPrefs> = {
  theme: oneOf(BOARD_THEMES.map((theme) => theme.id)),
  pieces: oneOf(PIECE_SETS.map((set) => set.id)),
  legalMoves: isBoolean,
  hover: isBoolean,
  coordinates: isBoolean,
};

/** Reads saved preferences, keeping only valid values so an old or damaged value cannot break the board. */
export const parseBoardPrefs = (raw: string | null): BoardPrefs => parsePrefs(raw, SCHEMA, DEFAULT_BOARD_PREFS);

/** Per-device convenience, so it lives in localStorage and works before the database is open. */
export const useBoardPrefs = createPrefStore(KEY, SCHEMA, DEFAULT_BOARD_PREFS);
