import type { Side, Variant } from '@knightschool/core';
import { ChevronDown, Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tag } from './tag-badge';
import { tagsOf, type TagGroup, type TagSpec } from './tag-specs';

const GROUPS: { group: TagGroup; title: string }[] = [
  { group: 'risk', title: 'Risk: how easily you can go wrong' },
  { group: 'character', title: 'Character: the kind of game you get' },
  { group: 'mate', title: 'Early mate' },
  { group: 'trap', title: 'Traps' },
  { group: 'trick', title: 'Tricks that come up' },
];

const RISK_ORDER: Record<string, number> = { 'low risk': 0, 'medium risk': 1, 'high risk': 2 };

/** Every tag the lines carry, once each, grouped by kind and in a sensible order. */
function legendOf(variants: Variant[], side?: Side) {
  const seen = new Map<string, TagSpec>();
  for (const variant of variants)
    for (const tag of tagsOf(variant, side)) {
      const id = `${tag.group}:${tag.label}:${tag.title}`;
      if (!seen.has(id)) seen.set(id, tag);
    }
  const all = [...seen.values()];
  return GROUPS.map(({ group, title }) => ({
    title,
    tags: all
      .filter((tag) => tag.group === group)
      .sort((a, b) => (RISK_ORDER[a.label] ?? 0) - (RISK_ORDER[b.label] ?? 0)),
  })).filter((entry) => entry.tags.length > 0);
}

/** The explanation without its leading "Low risk: " when the badge beside it already says that. */
function withoutLabel(tag: TagSpec) {
  const colon = tag.title.indexOf(': ');
  return colon > 0 && tag.title.slice(0, colon).toLowerCase() === tag.label.toLowerCase()
    ? tag.title.slice(colon + 2).replace(/^./, (first) => first.toUpperCase())
    : tag.title;
}

/**
 * What the tags on the lines mean, for anyone who cannot hover (a touch screen) or wants them all at once. One plain
 * sentence is always shown; the key lists only the tags this course uses.
 */
export function TagLegend({ variants, side }: { variants: Variant[]; side?: Side }) {
  const [open, setOpen] = useState(false);
  const legend = legendOf(variants, side);
  if (legend.length === 0) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid gap-2 rounded-xl border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p className="flex min-w-0 flex-1 basis-56 gap-2 text-xs text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Each line has tags. Risk says how badly a slip can cost you, from low to high; the others say what kind of
            game to expect. Hover a tag, or open the key.
          </span>
        </p>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs" aria-expanded={open}>
            {open ? 'Hide the key' : 'What the tags mean'}
            <ChevronDown aria-hidden className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="grid gap-3 pt-1">
        {legend.map((entry) => (
          <div key={entry.title} className="grid gap-1.5">
            <h4 className="text-xs font-semibold">{entry.title}</h4>
            <ul className="grid gap-1.5">
              {entry.tags.map((tag) => (
                <li
                  key={`${tag.key}:${tag.label}:${tag.title}`}
                  className="grid grid-cols-[auto_1fr] items-start gap-2 text-xs"
                >
                  <Tag tone={tag.tone}>{tag.label}</Tag>
                  <span className="text-muted-foreground">{withoutLabel(tag)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
