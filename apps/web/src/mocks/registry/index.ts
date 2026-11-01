import { boardMocks } from './board';
import { chessTextMocks } from './chess-text';
import type { MockItem } from './types';

/** Every built component's mocks, by spec id. Each group of components keeps its own file. */
export const MOCKS: MockItem[] = [...boardMocks, ...chessTextMocks];
