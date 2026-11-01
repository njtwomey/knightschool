import { Compass, Crosshair, Grid3x3, Route, Zap, type LucideIcon } from 'lucide-react';
import { BoardThumb } from '@/components/board/board-thumb';
import type { Reveal } from '@/components/board/board';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export type IdeaKind = 'tactic' | 'plan' | 'structure' | 'principle' | 'trap';

/** An idea from content (v1's motifs carried over). */
export type Idea = {
  id: string;
  name: string;
  kind: IdeaKind;
  /** One sentence: what it is. */
  summary: string;
  /** For a tactic, its clearest example position. */
  example?: { epd: string; lastMove?: { from: string; to: string }; orientation?: 'white' | 'black' };
};

export type IdeaProgress = 'open' | 'learning' | 'known';

/** One icon per kind of idea, the same in the ideas list. */
export const IDEA_KINDS: Record<IdeaKind, { name: string; icon: LucideIcon }> = {
  tactic: { name: 'Tactic', icon: Zap },
  plan: { name: 'Plan', icon: Route },
  structure: { name: 'Structure', icon: Grid3x3 },
  principle: { name: 'Principle', icon: Compass },
  trap: { name: 'Trap pattern', icon: Crosshair },
};

const PROGRESS: Record<IdeaProgress, { name: string; dot: string }> = {
  open: { name: 'Not seen yet', dot: 'border border-state-open bg-transparent' },
  learning: { name: 'Seen', dot: 'bg-state-learning' },
  known: { name: 'Practised', dot: 'bg-state-known' },
};

export const ideaHref = (id: string) => `/ideas/${id}`;

/**
 * An idea's name as a chip: hover for what it is, click to go to its page (docs/v2/components/idea-badge.md).
 */
export function IdeaBadge({
  idea,
  name,
  progress,
  size = 'chip',
  inExercise,
  reveal,
  givesAway,
  href = idea ? ideaHref(idea.id) : undefined,
}: {
  /** The idea; undefined when its id no longer exists, and the badge is plain text. */
  idea?: Idea;
  /** The words to show for an idea that no longer exists, or in place of its name in a sentence. */
  name?: string;
  progress?: IdeaProgress;
  /** Inline in a sentence, or a chip in a row of badges. */
  size?: 'inline' | 'chip';
  /** In the middle of an exercise the link opens in a new tab, so the session is never lost to a click. */
  inExercise?: boolean;
  reveal?: Reveal;
  /** The idea would name the answer at the `test` reveal level ("Fork" on an unsolved puzzle). */
  givesAway?: boolean;
  href?: string;
}) {
  if (reveal === 'test' && givesAway) return null;
  const label = name ?? idea?.name;
  if (!idea) return <span className={size === 'chip' ? 'text-sm' : undefined}>{label}</span>;
  const Icon = IDEA_KINDS[idea.kind].icon;
  const dot = progress ? (
    <span className={cn('size-2 shrink-0 rounded-full', PROGRESS[progress].dot)} aria-label={PROGRESS[progress].name} />
  ) : null;
  const newTab = inExercise ? { target: '_blank', rel: 'noopener' } : {};
  const trigger =
    size === 'chip' ? (
      <Badge variant="outline" className="h-6 gap-1.5 px-2 text-xs font-medium" asChild>
        <a href={href} {...newTab}>
          <Icon aria-hidden />
          {label}
          {dot}
          {inExercise ? <span className="sr-only">(opens in a new tab)</span> : null}
        </a>
      </Badge>
    ) : (
      <a
        href={href}
        {...newTab}
        className="inline-flex items-baseline gap-1 rounded-sm font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-2 hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Icon className="size-3.5 self-center text-muted-foreground" aria-hidden />
        {label}
        {dot}
        {inExercise ? <span className="sr-only">(opens in a new tab)</span> : null}
      </a>
    );
  return (
    <HoverCard openDelay={500} closeDelay={150}>
      <HoverCardTrigger asChild>{trigger}</HoverCardTrigger>
      <HoverCardContent className="grid w-64 gap-2" side="top">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {idea.name}
          <span className="ml-auto text-xs font-normal text-muted-foreground">{IDEA_KINDS[idea.kind].name}</span>
        </div>
        <p className="text-sm text-muted-foreground">{idea.summary}</p>
        {idea.kind === 'tactic' && idea.example ? (
          <BoardThumb
            epd={idea.example.epd}
            lastMove={idea.example.lastMove}
            orientation={idea.example.orientation}
            className="w-full"
            id={`idea-${idea.id}`}
          />
        ) : null}
        {progress ? <p className="text-xs text-muted-foreground">{PROGRESS[progress].name}</p> : null}
      </HoverCardContent>
    </HoverCard>
  );
}
