import type { CourseAbout, Side, Variant } from '@knightschool/core';
import { ChevronDown, Lightbulb, TriangleAlert } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { VariantTags } from '@/features/browse/tag-badge';
import { RISK_HINT } from '@/features/openings/explanations';

type Intro = { summary: string; about: CourseAbout };

function Part({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="grid content-start gap-1">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        <RichText text={text} />
      </p>
    </div>
  );
}

function Origin({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Where it comes from. </span>
      <RichText text={text} />
    </p>
  );
}

/**
 * The introduction at the top of a course page: what the opening is (the summary), why it is played and what can go
 * wrong, so nobody lands on a course without knowing what it is for.
 */
export function CourseIntro({ summary, about }: Intro) {
  return (
    <section aria-label="Introduction" className="grid max-w-3xl gap-3">
      <p className="leading-relaxed">
        <RichText text={summary} />
      </p>
      <div className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-2 sm:gap-4 sm:p-4">
        <Part icon={Lightbulb} title="The idea" text={about.idea} />
        <Part icon={TriangleAlert} title="What can go wrong" text={about.risks} />
        {about.origin && (
          <div className="sm:col-span-2">
            <Origin text={about.origin} />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The same introduction in a small card for the play page: the summary always, the idea, the risks and this line's
 * tags one click away (open from the start when learning).
 */
export function CourseIntroCard({
  name,
  summary,
  about,
  side,
  variant,
  defaultOpen,
}: Intro & { name: string; side: Side; variant: Variant | null; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <Card className="gap-3 py-4">
        <CardHeader className="gap-1 px-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{name}</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="-mr-2 -mt-1 h-7 shrink-0 text-xs" aria-expanded={open}>
                {open ? 'Less' : 'The idea and the risks'}
                <ChevronDown
                  aria-hidden
                  className={open ? 'rotate-180 transition-transform' : 'transition-transform'}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription className="leading-relaxed">
            <RichText text={summary} />
          </CardDescription>
        </CardHeader>
        <CollapsibleContent asChild>
          <CardContent className="grid gap-3 px-4">
            <Part icon={Lightbulb} title="The idea" text={about.idea} />
            <Part icon={TriangleAlert} title="What can go wrong" text={about.risks} />
            {variant && (
              <div className="grid gap-1.5 border-t pt-3">
                <h3 className="text-sm font-semibold">
                  This line: {variant.name}
                  {variant.opponent && (
                    <span className="font-normal text-muted-foreground">
                      , after <span className="font-mono">{variant.opponent}</span>
                    </span>
                  )}
                </h3>
                <VariantTags variant={variant} side={side} visible={8} />
                <p className="text-xs text-muted-foreground">{RISK_HINT[variant.tags.risk]}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
