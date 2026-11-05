import type { FilterOption } from './filter-toggle';

/*
 * The shared option sets, so the same choice reads the same everywhere (docs/v2/components/filter-toggle.md).
 */

export const SIDE_OPTIONS: FilterOption<'all' | 'white' | 'black'>[] = [
  { value: 'all', label: 'Both' },
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
];

export const LEVEL_OPTIONS: FilterOption<'all' | 'beginner' | 'improver'>[] = [
  { value: 'all', label: 'Any' },
  { value: 'beginner', label: 'Beginner', hint: 'Natural moves and a safe king; the first openings to learn' },
  { value: 'improver', label: 'Improver', hint: 'More theory, sharper positions; once the first opening sits well' },
];

export const KIND_OPTIONS: FilterOption<'all' | 'main' | 'sideline' | 'rare' | 'gambit' | 'trap'>[] = [
  { value: 'all', label: 'All' },
  { value: 'main', label: 'Main', hint: 'The line the opening is built on' },
  { value: 'sideline', label: 'Sideline', hint: 'A reply you will meet now and then' },
  { value: 'rare', label: 'Rare', hint: 'Seldom played at your level; learn it later' },
  { value: 'gambit', label: 'Gambit', hint: 'Gives material early for quick development' },
  { value: 'trap', label: 'Traps', hint: 'A trap to spring, or one to avoid' },
];

export const ROLE_OPTIONS: FilterOption<'all' | 'play' | 'against'>[] = [
  { value: 'all', label: 'Any', hint: 'Whether you play the opening or meet it' },
  { value: 'play', label: 'Play it', hint: 'Openings that make the moves they are named for' },
  { value: 'against', label: 'Against it', hint: 'Openings that answer the moves they are named for' },
];

export const SCOPE_OPTIONS: FilterOption<'all' | 'openings' | 'variations' | 'lines' | 'ideas'>[] = [
  { value: 'all', label: 'All' },
  { value: 'openings', label: 'Openings' },
  { value: 'variations', label: 'Variations' },
  { value: 'lines', label: 'Lines' },
  { value: 'ideas', label: 'Ideas' },
];

export const WEIGHTING_OPTIONS: FilterOption<'random' | 'popular'>[] = [
  { value: 'random', label: 'At random', hint: 'Every position as likely as any other' },
  {
    value: 'popular',
    label: 'Favour popular',
    hint: 'Positions players at your level reach more often come up more often',
  },
];
