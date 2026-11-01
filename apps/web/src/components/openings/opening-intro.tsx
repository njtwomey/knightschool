import { ChevronDown, Lightbulb, TriangleAlert, UserCheck, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { IdeaBadge, type Idea } from '@/components/chess/idea-badge';
import { RichText, type RichTextBoard, type RichTextContext } from '@/components/chess/rich-text';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SourcesList } from './sources-list';
import type { Side, Source } from './types';

/** An opening's introduction as written in its YAML; the three main parts are required by the build. */
export type OpeningAbout = { idea: string; risks: string; suits: string; origin?: string };

export type OpeningIntroProps = {
  summary: string;
  about: OpeningAbout;
  ideas?: Idea[];
  sources?: Source[];
  /** `full`: the opening page; `short`: onboarding and a card's expanded view (summary and who it suits). */
  variant?: 'full' | 'short';
  /** The page's board: inline moves and positions drive it. Without one, they preview on hover. */
  board?: RichTextBoard;
  /** The line the text's moves are read against (usually the opening's main line). */
  context?: RichTextContext;
  side?: Side;
  className?: string;
};

function Part({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-1.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * An opening's introduction in words: the idea, the risks, who it suits, where it comes from, and the sources it
 * credits (docs/v2/components/opening-intro.md).
 */
export function OpeningIntro({
  summary,
  about,
  ideas = [],
  sources = [],
  variant = 'full',
  board,
  context,
  side,
  className,
}: OpeningIntroProps) {
  const [originOpen, setOriginOpen] = useState(false);
  const ideaMap = Object.fromEntries(ideas.map((idea) => [idea.id, idea]));
  const text = (value: string, extra?: string) => (
    <RichText text={value} context={context} board={board} ideas={ideaMap} side={side} className={extra} />
  );

  if (variant === 'short') {
    return (
      <div className={cn('grid gap-3', className)}>
        {text(summary, 'text-base')}
        <Part icon={UserCheck} title="Who it suits">
          {text(about.suits, 'text-muted-foreground')}
        </Part>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-5', className)}>
      {text(summary, 'text-base')}
      <div className="grid gap-5 md:grid-cols-3">
        <Part icon={Lightbulb} title="The idea">
          {text(about.idea, 'text-muted-foreground')}
        </Part>
        <Part icon={TriangleAlert} title="The risks">
          {text(about.risks, 'text-muted-foreground')}
        </Part>
        <Part icon={UserCheck} title="Who it suits">
          {text(about.suits, 'text-muted-foreground')}
        </Part>
      </div>
      {about.origin ? (
        <Collapsible open={originOpen} onOpenChange={setOriginOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2.5">
              <ChevronDown className={cn('transition-transform', originOpen && 'rotate-180')} aria-hidden />
              Where it comes from
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1">
            {text(about.origin, 'max-w-prose text-muted-foreground')}
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      {ideas.length ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Plans and ideas you will meet</h3>
          <div className="flex flex-wrap gap-1.5">
            {ideas.map((idea) => (
              <IdeaBadge key={idea.id} idea={idea} />
            ))}
          </div>
        </section>
      ) : null}
      <SourcesList sources={sources} />
    </div>
  );
}
