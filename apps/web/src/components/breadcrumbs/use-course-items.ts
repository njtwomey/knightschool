import { inStudyOrder } from '@knightschool/core';
import type { MenuItem } from '@/components/breadcrumbs/crumb-menu';
import { useCatalog } from '@/data/catalog-store';

/**
 * Courses as breadcrumb menu items, each opening `href(id)`: every course of the app in study order, grouped by the side
 * you play, or, given `own`, those courses (your own in Create) as one group.
 */
export function useCourseItems(
  href: (course: string) => string,
  own?: { courses: { id: string; name: string }[]; group: string },
): MenuItem[] {
  const index = useCatalog((state) => state.index);
  if (own)
    return own.courses.map((course) => ({
      id: course.id,
      label: course.name,
      href: href(course.id),
      group: own.group,
    }));
  return [
    ...inStudyOrder(index.filter((course) => course.side === 'white')),
    ...inStudyOrder(index.filter((course) => course.side === 'black')),
  ].map((course) => ({
    id: course.id,
    label: course.name,
    href: href(course.id),
    group: course.side === 'white' ? 'You play White' : 'You play Black',
  }));
}
