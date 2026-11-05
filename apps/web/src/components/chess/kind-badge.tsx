import type { Side } from '@knightschool/core';
import { ArrowUp, CornerUpRight, Flag, MoveUpRight, TriangleAlert, Zap, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { Reveal } from '@/components/board/board';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** A line's kind as written in content, relative to the side the line is written for. */
export type LineKind = 'main' | 'sideline' | 'rare' | 'gambit' | 'for-us' | 'against-us';
export type ShownKind = 'main' | 'sideline' | 'rare' | 'gambit' | 'trap-spring' | 'trap-avoid';
export type Risk = 'low' | 'medium' | 'high';

/** The one wording table for kinds and risk: the name, what it means on hover, its colour and its icon. */
export const KIND_INFO: Record<ShownKind, { name: string; hint: string; tone: string; icon?: LucideIcon }> = {
  main: {
    name: 'Main line',
    hint: 'Main line: the most important way the opening goes; learn it first.',
    tone: 'border-foreground/30 text-foreground',
    icon: ArrowUp,
  },
  sideline: {
    name: 'Sideline',
    hint: 'Sideline: a less common choice that still comes up in games at your level.',
    tone: 'border-border text-muted-foreground',
    icon: CornerUpRight,
  },
  rare: {
    name: 'Rare',
    hint: 'Rare: seldom played; worth knowing once the main lines are safe.',
    tone: 'border-dotted border-muted-foreground/50 text-muted-foreground',
    icon: MoveUpRight,
  },
  gambit: {
    name: 'Gambit',
    hint: 'Gambit: a pawn or more given for quick development and attack.',
    tone: 'border-kind-gambit/40 bg-kind-gambit/10 text-kind-gambit',
    icon: Zap,
  },
  'trap-spring': {
    name: 'Trap to spring',
    hint: 'Trap to spring: a trap you can set; the opening shows how to cash in when they fall for it.',
    tone: 'border-kind-trap-spring/50 bg-kind-trap-spring/10 text-kind-trap-spring',
    icon: Flag,
  },
  'trap-avoid': {
    name: 'Trap to avoid',
    hint: 'Trap to avoid: a trap the opponent can set; the opening shows how to step round it.',
    tone: 'border-kind-trap-avoid/40 bg-kind-trap-avoid/10 text-kind-trap-avoid',
    icon: TriangleAlert,
  },
};

/** Risk in its own colours (`--risk-low/medium/high`). */
export const RISK_INFO: Record<Risk, { name: string; hint: string; tone: string }> = {
  low: {
    name: 'Low risk',
    hint: 'Low risk: calm play; a slip seldom costs much.',
    tone: 'border-risk-low/40 bg-risk-low/10 text-risk-low',
  },
  medium: {
    name: 'Medium risk',
    hint: 'Medium risk: some sharp moments where an exact move is needed.',
    tone: 'border-risk-medium/50 bg-risk-medium/10 text-risk-medium',
  },
  high: {
    name: 'High risk',
    hint: 'High risk: sharp and forcing; one wrong move can lose quickly.',
    tone: 'border-risk-high/40 bg-risk-high/10 text-risk-high',
  },
};

/** The kind as the learner sees it: a trap written for the other side flips (to spring becomes to avoid). */
export function shownKind(kind: LineKind, writtenFor?: Side, learner?: Side): ShownKind {
  const flipped = writtenFor && learner && writtenFor !== learner;
  if (kind === 'for-us') return flipped ? 'trap-avoid' : 'trap-spring';
  if (kind === 'against-us') return flipped ? 'trap-spring' : 'trap-avoid';
  return kind;
}

function Tag({
  name,
  hint,
  tone,
  icon: Icon,
  small,
}: {
  name: string;
  hint: string;
  tone: string;
  icon?: LucideIcon;
  small?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-default',
            small && (Icon ? 'size-5 justify-center p-0 [&>svg]:size-3' : 'h-4 px-1.5 text-[0.65rem]'),
            tone,
          )}
          tabIndex={0}
          aria-label={small && Icon ? name : undefined}
        >
          {Icon ? <Icon aria-hidden /> : null}
          {small && Icon ? null : name}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{hint}</TooltipContent>
    </Tooltip>
  );
}

/**
 * What kind of line this is and how risky it is to play, as small coloured badges; the word is always there, so
 * colour is never the only signal (docs/v2/components/kind-badge.md).
 */
export function KindBadge({
  kind,
  writtenFor,
  learner,
  risk,
  tags = [],
  show = 'kind',
  reveal,
  size = 'default',
}: {
  kind: LineKind;
  /** The side the line is written for, and the learner's side: a trap for the other side shows flipped. */
  writtenFor?: Side;
  learner?: Side;
  risk?: Risk;
  /** Character and tricks, each with its hint ("Sharp", "Early mate"). */
  tags?: { name: string; hint: string }[];
  show?: 'kind' | 'kind and risk' | 'all';
  reveal?: Reveal;
  /** `sm` in a dense list (the map's index): the icon alone, the word on hover: an arrow up for a main line, a turn for a sideline. */
  size?: 'default' | 'sm';
}) {
  const small = size === 'sm';
  const [open, setOpen] = useState(false);
  const shown = shownKind(kind, writtenFor, learner);
  // A trap to spring named before it is sprung gives the answer away.
  if (reveal === 'test' && shown === 'trap-spring') return null;
  const extra = show === 'all' ? tags : [];
  const visible = open ? extra : extra.slice(0, 3);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Tag {...KIND_INFO[shown]} small={small} />
      {risk && show !== 'kind' ? <Tag {...RISK_INFO[risk]} small={small} /> : null}
      {visible.map((tag) => (
        <Tag key={tag.name} name={tag.name} hint={tag.hint} tone="border-border text-muted-foreground" small={small} />
      ))}
      {extra.length > 3 ? (
        <Button
          variant="ghost"
          size="xs"
          className="h-5 px-1.5"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Fewer tags' : `${extra.length - 3} more tags`}
        >
          {open ? 'fewer' : '…'}
        </Button>
      ) : null}
    </span>
  );
}
