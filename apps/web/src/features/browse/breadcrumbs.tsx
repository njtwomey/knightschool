import { ChevronDown } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrowse } from '@/features/browse/store';
import { to } from '@/router/location';

/**
 * Where you are: Browse, the course and the line, with the line as a menu of every other line of the course, so you can
 * move sideways without going back.
 */
export function PlayBreadcrumbs({
  course,
  line,
  lineName,
  mode,
}: {
  course: string;
  line: string;
  /** What to call the current line, which is not one line in an every-branch drill. */
  lineName: string;
  mode: 'learn' | 'practice' | 'branches';
}) {
  const index = useBrowse((state) => state.index);
  const entry = index.find((candidate) => candidate.id === course);
  const total = entry?.lines.length ?? 0;
  // A line link keeps the way you are playing; an every-branch drill has no line, so its links open Learn.
  const linkMode = mode === 'practice' ? 'practice' : 'learn';

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/browse')}>Browse</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href={to(`/course/${course}`)}>{entry?.name ?? course}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {entry && total > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="-ml-2 h-7 gap-1 px-2 font-normal text-foreground">
                  <BreadcrumbPage>{lineName}</BreadcrumbPage>
                  <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-96 w-80 overflow-y-auto">
                <DropdownMenuLabel>Lines in this course</DropdownMenuLabel>
                {entry.lines.map((candidate) => (
                  <DropdownMenuItem
                    key={candidate.id}
                    asChild
                    className={candidate.id === line ? 'bg-accent' : undefined}
                  >
                    <a href={to(`/play/${course}/${candidate.id}/${linkMode}`)}>{candidate.name}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <BreadcrumbPage>{lineName}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
