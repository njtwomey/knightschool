import { ChevronDown, GitFork } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TreeView } from './tree-view';

/**
 * A course's lines as a tree, folded away until asked for (the drawing needs the whole tree's data). With `line`, that
 * line is drawn in the primary colour and picked.
 */
export function CourseTree({
  courseId,
  line,
  defaultOpen = false,
}: {
  courseId: string;
  line?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-lg font-semibold">
          <GitFork className="size-4" aria-hidden /> {line ? 'Where it sits in the course' : 'The course as a tree'}
        </h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" aria-expanded={open}>
            <ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden />
            {open ? 'Hide' : 'Show'}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <TreeView courses={[courseId]} line={line} depth={99} preferCourse={courseId} beside={!line} />
      </CollapsibleContent>
    </Collapsible>
  );
}
