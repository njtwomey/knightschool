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
import { LINE_TABS, lineHref, type LineTab } from '@/features/line/tabs';
import { to } from '@/router/location';

/**
 * Where you are: Browse, the course and the line, with the line as a menu of every other line of the course (so you can
 * move sideways without going back), then the line's tabs: About, Learn, Drill and Quiz. The tabs are the only control
 * for how you are working on a line, so they sit where you look to see where you are.
 */
export function PlayBreadcrumbs({
  course,
  line,
  lineName,
  tab,
}: {
  course: string;
  line: string;
  /** What to call the current line; by default its name in the course. An every-branch drill is not one line. */
  lineName?: string;
  tab: LineTab | 'branches';
}) {
  const index = useBrowse((state) => state.index);
  const entry = index.find((candidate) => candidate.id === course);
  const total = entry?.lines.length ?? 0;
  const name = lineName ?? entry?.lines.find((candidate) => candidate.id === line)?.name ?? line;
  // A line link keeps the tab you are on; an every-branch drill has no line, so its links open About.
  const linkTab: LineTab = tab === 'branches' ? 'about' : tab;

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
                  <BreadcrumbPage>{name}</BreadcrumbPage>
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
                    <a href={to(lineHref(course, candidate.id, linkTab))}>{candidate.name}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <BreadcrumbPage>{name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {tab !== 'branches' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <nav aria-label="Work on this line" className="flex flex-wrap gap-1">
                {LINE_TABS.map((item) => (
                  <Button
                    key={item.tab}
                    asChild
                    size="sm"
                    variant={item.tab === tab ? 'secondary' : 'ghost'}
                    className="h-7 px-2.5"
                  >
                    <a
                      href={to(lineHref(course, line, item.tab))}
                      title={item.blurb}
                      aria-current={item.tab === tab ? 'page' : undefined}
                    >
                      {item.name}
                    </a>
                  </Button>
                ))}
              </nav>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
