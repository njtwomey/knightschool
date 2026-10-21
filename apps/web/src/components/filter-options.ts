import type { Side } from '@knightschool/core';
import { SIDE_HINT } from '@/components/tags/hints';

/** One choice of a `FilterToggle`: its value, its words, and what it means on hover. */
export type FilterOption<T extends string | number> = {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
};

/** The side filter of every list: both sides first, then White, then Black. */
export const SIDE_FILTER_OPTIONS: readonly FilterOption<Side | 'all'>[] = [
  { value: 'all', label: 'Both', hint: 'Show courses for White and for Black.' },
  { value: 'white', label: 'White', hint: SIDE_HINT.white },
  { value: 'black', label: 'Black', hint: SIDE_HINT.black },
];

/** The side a course is for (no "both"), as in the course forms. */
export const SIDE_OPTIONS: readonly FilterOption<Side>[] = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];
