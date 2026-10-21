import type { Side, Variant } from '@knightschool/core';
import {
  CHARACTER_HINT,
  RISK_HINT,
  TRAP_HINT,
  TRICK_HINT,
  earlyMateHint,
  earlyMateLabel,
} from '@/features/openings/explanations';

// One colour per kind of tag, so a row can be read at a glance: green is safe, amber needs care, red is dangerous.
export const TONE_CLASS = {
  green: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  red: 'border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300',
  blue: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  violet: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  orange: 'border-orange-500/35 bg-orange-500/15 text-orange-700 dark:text-orange-300',
  teal: 'border-teal-500/30 bg-teal-500/15 text-teal-700 dark:text-teal-300',
  pink: 'border-pink-500/30 bg-pink-500/15 text-pink-700 dark:text-pink-300',
  grey: 'border-border bg-muted text-muted-foreground',
} as const;

export type Tone = keyof typeof TONE_CLASS;

const CHARACTER: Record<Variant['tags']['character'][number], Tone> = {
  solid: 'blue',
  positional: 'teal',
  sharp: 'orange',
  tactical: 'violet',
  gambit: 'pink',
};
const RISK: Record<Variant['tags']['risk'], Tone> = { low: 'green', medium: 'amber', high: 'red' };

/** A tag's colour, its words and what it means. `group` says which kind of tag it is, for the key. */
export type TagSpec = { key: string; tone: Tone; label: string; title: string; group: TagGroup };
export type TagGroup = 'trap' | 'risk' | 'character' | 'mate' | 'trick';

/**
 * The tags of a line, most useful first: trap, the first character, the risk, then everything else. `side` is the
 * learner's side, so mating chances can say "you" or "them".
 */
export function tagsOf(variant: Variant, side?: Side): TagSpec[] {
  const { tags } = variant;
  const [firstCharacter, ...otherCharacters] = tags.character;
  const character = (item: Variant['tags']['character'][number]): TagSpec => ({
    key: item,
    tone: CHARACTER[item],
    label: item,
    title: CHARACTER_HINT[item],
    group: 'character',
  });
  const list: (TagSpec | null)[] = [
    variant.kind === 'refutation'
      ? {
          key: 'trap',
          tone: 'amber',
          label: 'trap',
          title: TRAP_HINT[variant.whose ?? 'for-us'],
          group: 'trap',
        }
      : null,
    firstCharacter ? character(firstCharacter) : null,
    { key: 'risk', tone: RISK[tags.risk], label: `${tags.risk} risk`, title: RISK_HINT[tags.risk], group: 'risk' },
    ...otherCharacters.map(character),
    tags.earlyMate !== 'none'
      ? {
          key: 'mate',
          tone: 'red' as const,
          label: earlyMateLabel(tags.earlyMate, side),
          title: earlyMateHint(tags.earlyMate, side),
          group: 'mate' as const,
        }
      : null,
    ...tags.tricks.map((trick) => ({
      key: `trick-${trick}`,
      tone: 'grey' as const,
      label: trick.replaceAll('-', ' '),
      title: TRICK_HINT[trick],
      group: 'trick' as const,
    })),
  ];
  return list.filter((tag): tag is TagSpec => tag !== null);
}
