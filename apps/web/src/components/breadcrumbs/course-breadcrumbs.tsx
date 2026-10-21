import { TrailCrumbs } from '@/components/breadcrumbs/trail-crumbs';
import { useCourseItems } from '@/components/breadcrumbs/use-course-items';
import { useCatalog } from '@/data/catalog-store';
import { courseHref, lineHref, LINE_TABS, COURSE_TABS, type LineTab, type CourseTab } from '@/router/hrefs';

/** Courses, then the course as a menu of every course, then the course's views: the breadcrumbs of a course page. */
export function CourseBreadcrumbs({ course, tab = 'overview' }: { course: string; tab?: CourseTab }) {
  const index = useCatalog((state) => state.index);
  const courses = useCourseItems((id) => courseHref(id));
  const name = index.find((candidate) => candidate.id === course)?.name ?? course;
  return (
    <TrailCrumbs
      root={{ label: 'Courses', href: '/courses' }}
      crumbs={[{ label: name, menu: { current: course, items: courses, label: 'Other courses' } }]}
      tabs={{ tabs: COURSE_TABS, value: tab, href: (next) => courseHref(course, next), label: 'Views of this course' }}
    />
  );
}

/**
 * Where you are: Courses, the course (a menu of every course) and the line (a menu of every line of the course), then
 * the line's tabs: About, Learn, Drill, Quiz and Tree. The tabs are the only control for how you are working on a line,
 * so they sit where you look to see where you are.
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
  const courses = useCourseItems((id) => courseHref(id));
  const entry = index.find((candidate) => candidate.id === course);
  const name = lineName ?? entry?.lines.find((candidate) => candidate.id === line)?.name ?? line;
  // A line link keeps the tab you are on; an every-branch drill has no line, so its links open About.
  const linkTab: LineTab = tab === 'branches' ? 'about' : tab;
  const lines = (entry?.lines ?? []).map((candidate) => ({
    id: candidate.id,
    label: candidate.name,
    href: lineHref(course, candidate.id, linkTab),
    group: 'Lines in this course',
  }));
  return (
    <TrailCrumbs
      root={{ label: 'Courses', href: '/courses' }}
      crumbs={[
        {
          label: entry?.name ?? course,
          href: courseHref(course),
          menu: { current: course, items: courses, label: 'Other courses' },
        },
        { label: name, menu: { current: line, items: lines, label: 'Other lines in this course' } },
      ]}
      tabs={
        tab === 'branches'
          ? undefined
          : { tabs: LINE_TABS, value: tab, href: (next) => lineHref(course, line, next), label: 'Work on this line' }
      }
    />
  );
}
