import type { Side, Variant } from '@knightschool/core';
import { ChevronLeft, Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from 'cn';
import { TONE_CLASS, tagsOf, type Tone } from './tag-specs';

/** One tag as a coloured badge; hovering or focusing it says what it means. */
export function Tag({ tone: kind, children, title }: { tone: Tone; children: React.ReactNode; title?: string }) {
  const badge = (
    <Badge variant="outline" className={cn('px-1.5 py-0 text-[11px] font-normal leading-4', TONE_CLASS[kind])}>
      {children}
    </Badge>
  );
  return title ? <Hint text={title}>{badge}</Hint> : badge;
}

/**
 * What kind of line this is, from the structured PGN tags, each kind of tag in its own colour. Only the first few show;
 * an ellipsis expands the rest in place, so a line with many tags does not take over the row.
 */
export function VariantTags({ variant, side, visible = 3 }: { variant: Variant; side?: Side; visible?: number }) {
  const [open, setOpen] = useState(false);
  const all = tagsOf(variant, side);
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
