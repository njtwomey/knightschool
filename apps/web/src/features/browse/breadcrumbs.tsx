import { inStudyOrder } from '@knightschool/core';
import { Check, ChevronDown } from 'lucide-react';
import { Fragment, useCallback } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrowse } from '@/features/browse/store';
import { LINE_TABS, lineHref, type LineTab } from '@/features/line/tabs';
import { navigate, to } from '@/router/location';

type MenuItem = { id: string; label: string; href: string; group: string };

/**
 * A breadcrumb that is also a menu of its siblings (every course, or every line of a course), to move sideways without
 * going back. The current one is ticked and the menu opens scrolled to it. When the crumb is a page you can go back to
 * (`href`), its name stays a link and a chevron beside it opens the menu; when it is the page you are on, the whole
 * crumb opens the menu.
 */
function CrumbMenu({
  label,
  href,
  current,
  items,
  menuLabel,
}: {
  label: string;
  href?: string;
  current: string;
  items: MenuItem[];
  menuLabel: string;
}) {
  // Scrolled after the menu has been placed, so the current item sits in the middle of a long list.
  const scrollHere = useCallback((element: HTMLElement | null) => {
    if (element) requestAnimationFrame(() => element.scrollIntoView({ block: 'center' }));
  }, []);
  const groups = [...new Set(items.map((item) => item.group))];
  const trigger = href ? (
    <Button variant="ghost" size="icon" className="-ml-1 size-6" aria-label={menuLabel}>
      <ChevronDown aria-hidden />
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-7 gap-1 px-2 font-normal text-foreground"
      aria-label={menuLabel}
    >
      <BreadcrumbPage>{label}</BreadcrumbPage>
      <ChevronDown aria-hidden />
    </Button>
  );
  return (
    <span className="inline-flex items-center gap-0.5">
      {href && <BreadcrumbLink href={to(href)}>{label}</BreadcrumbLink>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 w-80 overflow-y-auto">
          {groups.map((group) => (
            <Fragment key={group}>
              <DropdownMenuLabel>{group}</DropdownMenuLabel>
              {items
                .filter((item) => item.group === group)
                .map((item) => {
                  const here = item.id === current;
                  return (
                    <DropdownMenuItem
                      key={item.id}
                      asChild
                      ref={here ? scrollHere : undefined}
                      className={here ? 'bg-accent font-medium' : undefined}
                    >
                      <a href={to(item.href)} aria-current={here ? 'page' : undefined}>
                        <Check aria-hidden className={here ? '' : 'invisible'} />
                        {item.label}
                      </a>
                    </DropdownMenuItem>
                  );
                })}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** Every course as menu items, in study order, grouped by the side you play. */
function useCourseItems(): MenuItem[] {
  const index = useBrowse((state) => state.index);
  return [
    ...inStudyOrder(index.filter((course) => course.side === 'white')),
    ...inStudyOrder(index.filter((course) => course.side === 'black')),
  ].map((course) => ({
    id: course.id,
    label: course.name,
    href: `/course/${course.id}`,
    group: course.side === 'white' ? 'You play White' : 'You play Black',
  }));
}

/** Browse, then the course as a menu of every course: the breadcrumbs of a course page. */
export function CourseBreadcrumbs({ course }: { course: string }) {
  const index = useBrowse((state) => state.index);
  const courses = useCourseItems();
  const name = index.find((candidate) => candidate.id === course)?.name ?? course;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/browse')}>Browse</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {courses.length > 1 ? (
            <CrumbMenu label={name} current={course} items={courses} menuLabel="Other courses" />
          ) : (
            <BreadcrumbPage>{name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Where you are: Browse, the course (a menu of every course) and the line (a menu of every line of the course), then
 * the line's tabs: About, Learn, Drill and Quiz. The tabs are the only control for how you are working on a line, so
 * they sit where you look to see where you are.
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
  const courses = useCourseItems();
  const entry = index.find((candidate) => candidate.id === course);
  const name = lineName ?? entry?.lines.find((candidate) => candidate.id === line)?.name ?? line;
  // A line link keeps the tab you are on; an every-branch drill has no line, so its links open About.
  const linkTab: LineTab = tab === 'branches' ? 'about' : tab;
  const lines: MenuItem[] = (entry?.lines ?? []).map((candidate) => ({
    id: candidate.id,
    label: candidate.name,
    href: lineHref(course, candidate.id, linkTab),
    group: 'Lines in this course',
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/browse')}>Browse</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <CrumbMenu
            label={entry?.name ?? course}
            href={`/course/${course}`}
            current={course}
            items={courses}
            menuLabel="Other courses"
          />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {lines.length > 1 ? (
            <CrumbMenu label={name} current={line} items={lines} menuLabel="Other lines in this course" />
          ) : (
            <BreadcrumbPage>{name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {tab !== 'branches' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {/* One choice of several, so a joined group: a shared border, flat inside, round at the two ends. */}
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={tab}
                onValueChange={(next) => next && navigate(lineHref(course, line, next as LineTab))}
                aria-label="Work on this line"
              >
                {LINE_TABS.map((item) => (
                  <ToggleGroupItem
                    key={item.tab}
                    value={item.tab}
                    title={item.blurb}
                    className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {item.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
