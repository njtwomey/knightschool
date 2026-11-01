import { boardMocks } from './board';
import { boardMoreMocks } from './board-more';
import { chessTextMocks } from './chess-text';
import { openingsProgressMocks } from './openings-progress';
import { practiceMapFindingMocks } from './practice-map-finding';
import { settingsCreatingEverywhereMocks } from './settings-creating-everywhere';
import type { MockItem } from './types';

/** Every built component's mocks, by spec id. Each group of components keeps its own file. */
export const MOCKS: MockItem[] = [
  ...boardMocks,
  ...boardMoreMocks,
  ...chessTextMocks,
  ...openingsProgressMocks,
  ...practiceMapFindingMocks,
  ...settingsCreatingEverywhereMocks,
];
