import { nextMoves } from './next-moves';
import { nextUnit } from './next-unit';
import { openingRush } from './opening-rush';
import type { SessionType } from './types';

/** The study sessions a course's path offers, in the order shown. */
export const SESSION_TYPES: SessionType[] = [nextUnit, nextMoves, openingRush];
