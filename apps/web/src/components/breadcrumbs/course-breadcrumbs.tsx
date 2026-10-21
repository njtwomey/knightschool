import { inStudyOrder } from '@knightschool/core';
import { CrumbMenu, type MenuItem } from '@/components/breadcrumbs/crumb-menu';
import { TabGroup } from '@/components/breadcrumbs/tab-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useCatalog } from '@/data/catalog-store';
import { COURSE_TABS, courseHref, type CourseTab } from '@/features/course/tabs';
import { LINE_TABS, lineHref, type LineTab } from '@/features/line/tabs';
import { navigate, to } from '@/router/location';

/** Every course as menu items, in study order, grouped by the side you play. */
function useCourseItems(): MenuItem[] {
  const index = useCatalog((state) => state.index);
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

/** Courses, then the course as a menu of every course, then the course's views: the breadcrumbs of a course page. */
export function CourseBreadcrumbs({ course, tab = 'overview' }: { course: string; tab?: CourseTab }) {
  const index = useCatalog((state) => state.index);
  const courses = useCourseItems();
  const name = index.find((candidate) => candidate.id === course)?.name ?? course;
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={to('/courses')}>Courses</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {courses.length > 1 ? (
            <CrumbMenu label={name} current={course} items={courses} menuLabel="Other courses" />
          ) : (
            <BreadcrumbPage>{name}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <TabGroup
            tabs={COURSE_TABS}
            value={tab}
            onPick={(next) => navigate(courseHref(course, next))}
            label="Views of this course"
          />
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Where you are: Courses, the course (a menu of every course) and the line (a menu of every line of the course), then
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
  const index = useCatalog((state) => state.index);
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
          <BreadcrumbLink href={to('/courses')}>Courses</BreadcrumbLink>
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
              <TabGroup
                tabs={LINE_TABS}
                value={tab}
                onPick={(next) => navigate(lineHref(course, line, next))}
                label="Work on this line"
              />
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
