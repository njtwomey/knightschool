import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { CrumbMenu, TabGroup, type MenuItem } from '@/features/browse/breadcrumbs';
import { navigate, to } from '@/router/location';
import { entryId } from './helpers';
import { draftCourses, fullLine, useAuthor } from './store';
import { CREATE_TABS, createHref, lineEditHref, type CreateTab } from './tabs';

/** Your courses as menu items, each opening the same tab. */
function useCourseItems(tab: CreateTab): MenuItem[] {
  const rows = useAuthor((state) => state.rows);
  return draftCourses(rows).map((course) => ({
    id: course.id,
    label: course.manifest.name,
    href: createHref(course.id, tab),
    group: 'Your courses',
  }));
}

/** Create, then the course (a menu of your courses), then its tabs: Details, Lines, Path, Publish. */
export function CreateBreadcrumbs({ course, tab }: { course: string; tab: CreateTab }) {
  const courses = useCourseItems(tab);
  const name = courses.find((item) => item.id === course)?.label ?? course;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/create')}>Create</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {courses.length > 1 ? (
            <CrumbMenu label={name} current={course} items={courses} menuLabel="Your other courses" />
          ) : (
            <BreadcrumbPage>{name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <TabGroup
            tabs={CREATE_TABS}
            value={tab}
            onPick={(next) => navigate(createHref(course, next))}
            label="Parts of this course"
          />
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Create, the course (a menu), the line (a menu of its lines), and the previous and next line. */
export function LineBreadcrumbs({ course, line }: { course: string; line: string }) {
  const courses = useCourseItems('lines');
  const rows = useAuthor((state) => state.rows);
  const build = useAuthor((state) => state.build);
  const entry = draftCourses(rows).find((candidate) => candidate.id === course);
  const ids = (entry?.manifest.lines ?? []).map(entryId);
  const lines: MenuItem[] = ids.map((id) => ({
    id,
    label: fullLine(build, id)?.game.tags.Variation ?? id,
    href: lineEditHref(course, id),
    group: 'Lines in this course',
  }));
  const at = ids.indexOf(line);
  const previous = at > 0 ? ids[at - 1] : undefined;
  const next = at >= 0 && at < ids.length - 1 ? ids[at + 1] : undefined;
  const name = lines.find((item) => item.id === line)?.label ?? line;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/create')}>Create</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <CrumbMenu
            label={entry?.manifest.name ?? course}
            href={createHref(course, 'lines')}
            current={course}
            items={courses}
            menuLabel="Your other courses"
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
        <BreadcrumbItem>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={!previous}
            aria-label="Previous line"
            title="Previous line"
            onClick={() => previous && navigate(lineEditHref(course, previous))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={!next}
            aria-label="Next line"
            title="Next line"
            onClick={() => next && navigate(lineEditHref(course, next))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
