/** A course page's two views: the overview (introduction, board and lines) and its tree. */
export const COURSE_TABS = [
  { tab: 'overview', name: 'Overview', blurb: 'What the course is for, its plans and its lines.' },
  { tab: 'tree', name: 'Tree', blurb: 'Every line of the course as one tree of moves.' },
] as const;
export type CourseTab = (typeof COURSE_TABS)[number]['tab'];
export const courseHref = (course: string, tab: CourseTab = 'overview') =>
  tab === 'overview' ? `/course/${course}` : `/course/${course}/${tab}`;
