import type { Variant } from '@knightschool/core';
import { ChevronLeft, Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';

// One colour per kind of tag, so a row can be read at a glance: green is safe, amber needs care, red is dangerous.
const tone = {
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

type Tone = keyof typeof tone;

const CHARACTER: Record<Variant['tags']['character'][number], Tone> = {
  solid: 'blue',
  positional: 'teal',
  sharp: 'orange',
  tactical: 'violet',
  gambit: 'pink',
};
const RISK: Record<Variant['tags']['risk'], Tone> = { low: 'green', medium: 'amber', high: 'red' };

function Tag({ tone: kind, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  return (
    <Badge variant="outline" className={cn('px-1.5 py-0 text-[11px] font-normal leading-4', tone[kind])} title={title}>
      {children}
    </Badge>
  );
}

type TagSpec = { key: string; tone: Tone; label: string; title?: string };

/** The tags of a line, most useful first: trap, the first character, the risk, then everything else. */
function tagsOf(variant: Variant): TagSpec[] {
  const { tags } = variant;
  const [firstCharacter, ...otherCharacters] = tags.character;
  const list: (TagSpec | null)[] = [
    variant.kind === 'refutation'
      ? { key: 'trap', tone: 'amber', label: 'trap', title: 'A line that punishes a specific mistake' }
      : null,
    firstCharacter ? { key: firstCharacter, tone: CHARACTER[firstCharacter], label: firstCharacter } : null,
    {
      key: 'risk',
      tone: RISK[tags.risk],
      label: `${tags.risk} risk`,
      title: 'How badly a beginner on your side can go wrong',
    },
    ...otherCharacters.map((item) => ({ key: item, tone: CHARACTER[item], label: item })),
    tags.earlyMate !== 'none'
      ? {
          key: 'mate',
          tone: 'red' as const,
          label: `mate chances: ${tags.earlyMate}`,
          title: 'Who has mating chances in the first 12 moves',
        }
      : null,
    ...tags.tricks.map((trick) => ({
      key: `trick-${trick}`,
      tone: 'grey' as const,
      label: trick,
      title: 'A trick either side can fall for',
    })),
  ];
  return list.filter((tag): tag is TagSpec => tag !== null);
}

/**
 * What kind of line this is, from the structured PGN tags, each kind of tag in its own colour. Only the first few show;
 * an ellipsis expands the rest in place, so a line with many tags does not take over the row.
 */
export function VariantTags({ variant, visible = 3 }: { variant: Variant; visible?: number }) {
  const [open, setOpen] = useState(false);
  const all = tagsOf(variant);
  const hidden = all.length - visible;
  const shown = open || hidden <= 1 ? all : all.slice(0, visible); // a single leftover tag is not worth an ellipsis
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((tag) => (
        <Tag key={tag.key} tone={tag.tone} title={tag.title}>
          {tag.label}
        </Tag>
      ))}
      {hidden > 1 && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative z-10 size-5 rounded-full"
          aria-expanded={open}
          aria-label={open ? 'Show fewer tags' : `Show ${hidden} more tags`}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronLeft aria-hidden /> : <Ellipsis aria-hidden />}
        </Button>
      )}
    </div>
  );
}
