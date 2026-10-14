import { ChevronDown } from 'lucide-react';
import { Fragment, useMemo } from 'react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrowse } from '@/features/browse/store';
import { to } from '@/router/location';

/**
 * Where you are: Browse, the opening, the course (when the opening has several) and the line, with the line as a menu
 * of every other line of the opening, so you can move sideways without going back.
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
  const families = useBrowse((state) => state.families);
  const entry = index.find((candidate) => candidate.id === course);
  const family = families.find((candidate) => candidate.id === (entry?.family ?? course));
  const siblings = useMemo(
    () => (family ? index.filter((candidate) => family.courses.includes(candidate.id)) : entry ? [entry] : []),
    [family, index, entry],
  );
  const motif = entry?.motif === true;
  const familyHref = to(`/${motif ? 'motif' : 'opening'}/${family?.id ?? course}`);
  const total = siblings.reduce((sum, candidate) => sum + candidate.lines.length, 0);
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
          <BreadcrumbLink href={familyHref}>{family?.name ?? entry?.name ?? course}</BreadcrumbLink>
        </BreadcrumbItem>
        {siblings.length > 1 && entry && entry.name.replace(/^[^:]+: /, '') !== (family?.name ?? '') && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={to(`/course/${course}`)}>{entry.name.replace(/^[^:]+: /, '')}</BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {total > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="-ml-2 h-7 gap-1 px-2 font-normal text-foreground">
                  <BreadcrumbPage>{lineName}</BreadcrumbPage>
                  <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-96 w-72 overflow-y-auto">
                {siblings.map((candidate, i) => (
                  <Fragment key={candidate.id}>
                    {i > 0 && <DropdownMenuSeparator />}
                    {siblings.length > 1 && (
                      <DropdownMenuLabel>{candidate.name.replace(/^[^:]+: /, '')}</DropdownMenuLabel>
                    )}
                    {candidate.lines.map((candidateLine) => (
                      <DropdownMenuItem
                        key={candidateLine.id}
                        asChild
                        className={candidate.id === course && candidateLine.id === line ? 'bg-accent' : undefined}
                      >
                        <a href={to(`/play/${candidate.id}/${candidateLine.id}/${linkMode}`)}>{candidateLine.name}</a>
                      </DropdownMenuItem>
                    ))}
                  </Fragment>
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
