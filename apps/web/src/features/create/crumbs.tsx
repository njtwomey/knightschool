import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TrailCrumbs } from '@/components/breadcrumbs/trail-crumbs';
import { useCourseItems } from '@/components/breadcrumbs/use-course-items';
import { Button } from '@/components/ui/button';
import { navigate } from '@/router/location';
import { entryId, draftCourses, fullLine } from './draft';
import { useAuthor } from './store';
import { createHref, lineEditHref, CREATE_TABS, type CreateTab } from '@/router/hrefs';

const ROOT = { label: 'Create', href: '/create' };

/** Your courses as menu items, each opening the same tab. */
function useOwnCourseItems(tab: CreateTab) {
  const rows = useAuthor((state) => state.rows);
  const courses = draftCourses(rows).map((course) => ({ id: course.id, name: course.manifest.name }));
  return useCourseItems((id) => createHref(id, tab), { courses, group: 'Your courses' });
}

/** Create, then the course (a menu of your courses), then its tabs: Details, Lines, Path, Publish. */
export function CreateBreadcrumbs({ course, tab }: { course: string; tab: CreateTab }) {
  const courses = useOwnCourseItems(tab);
  const name = courses.find((item) => item.id === course)?.label ?? course;
  return (
    <TrailCrumbs
      root={ROOT}
      crumbs={[{ label: name, menu: { current: course, items: courses, label: 'Your other courses' } }]}
      tabs={{ tabs: CREATE_TABS, value: tab, href: (next) => createHref(course, next), label: 'Parts of this course' }}
    />
  );
}

/** Create, the course (a menu), the line (a menu of its lines), and the previous and next line. */
export function LineBreadcrumbs({ course, line }: { course: string; line: string }) {
  const courses = useOwnCourseItems('lines');
  const rows = useAuthor((state) => state.rows);
  const build = useAuthor((state) => state.build);
  const entry = draftCourses(rows).find((candidate) => candidate.id === course);
  const ids = (entry?.manifest.lines ?? []).map(entryId);
  const lines = ids.map((id) => ({
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
    <TrailCrumbs
      root={ROOT}
      crumbs={[
        {
          label: entry?.manifest.name ?? course,
          href: createHref(course, 'lines'),
          menu: { current: course, items: courses, label: 'Your other courses' },
        },
        { label: name, menu: { current: line, items: lines, label: 'Other lines in this course' } },
      ]}
      trailing={
        <>
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
        </>
      }
    />
  );
}
