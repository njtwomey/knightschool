import { type OpeningContent } from '@knightschool/core';
import { BookOpen, ChevronRight, Eye, GitBranch, Target } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { IconAction } from '@/features/browse/icon-action';
import { useBrowse } from '@/features/browse/store';
import { VariantTags } from '@/features/browse/tag-badge';
import { EnrolButton } from '@/features/courses/enrol-button';
import { percent } from '@/features/courses/progress';
import { ALL_BRANCHES } from '@/features/play/store';
import { to } from '@/router/location';

type Props = { content: OpeningContent; cards: number; learned: number; focused: boolean };

/** One course of an opening: a single header line, then its variations as table rows (click a row to practise it). */
export function CourseGroup({ content, cards, learned, focused }: Props) {
  const showLine = useBrowse((state) => state.showLine);
  const { opening } = content;
  const id = opening.id;
  const [open, setOpen] = useState(false);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <section
        id={`course-${id}`}
        className={`grid gap-1 rounded-xl border bg-card p-3 ${focused ? 'ring-2 ring-primary/50' : ''}`}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2 text-base font-semibold">
              <ChevronRight aria-hidden className={`transition-transform ${open ? 'rotate-90' : ''}`} />
              {opening.name.replace(/^[^:]+: /, '')}
            </Button>
          </CollapsibleTrigger>
          <Badge variant="outline">{opening.eco}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2" title={`${learned} of ${cards} moves learned`}>
              <Progress value={percent(learned, cards)} className="w-20" aria-label={`${opening.name} progress`} />
              <span className="text-xs tabular-nums text-muted-foreground">
                {learned}/{cards}
              </span>
            </div>
            <EnrolButton openingId={id} />
            {opening.variants.length > 1 && (
              <IconAction label="Practise every branch" href={to(`/play/${id}/${ALL_BRANCHES}/branches`)}>
                <GitBranch aria-hidden />
              </IconAction>
            )}
          </div>
        </header>

        <CollapsibleContent>
          <p className="px-1 pb-1 text-sm text-muted-foreground">{opening.summary}</p>
        </CollapsibleContent>
        <Table>
          <TableBody>
            {opening.variants.map((variant) => (
              <TableRow key={variant.id} className="relative">
                <TableCell className="whitespace-normal py-1.5">
                  <a
                    href={to(`/play/${id}/${variant.id}/learn`)}
                    className='font-medium outline-none after:absolute after:inset-0 after:content-[""] focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50'
                  >
                    {variant.name}
                  </a>{' '}
                  <span className="text-xs text-muted-foreground">{variant.eco}</span>
                </TableCell>
                <TableCell className="hidden py-1.5 md:table-cell">
                  <VariantTags variant={variant} />
                </TableCell>
                <TableCell className="relative z-10 w-px whitespace-nowrap py-1.5 text-right">
                  <IconAction label="Show on board" onClick={() => showLine(id, variant.id)}>
                    <Eye aria-hidden />
                  </IconAction>
                  <IconAction label="Learn it first" href={to(`/play/${id}/${variant.id}/learn`)}>
                    <BookOpen aria-hidden />
                  </IconAction>
                  <IconAction label="Practise" href={to(`/play/${id}/${variant.id}/practice`)}>
                    <Target aria-hidden />
                  </IconAction>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </Collapsible>
  );
}
