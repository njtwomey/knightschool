import type { Route } from './route';

/** The items of the header: the main menu's links, and Profile at the right. */
export type HeaderItem =
  'courses' | 'search' | 'tree' | 'quiz' | 'speed' | 'name-it' | 'create' | 'glossary' | 'profile';

/**
 * Which header item a page belongs to, so the header marks where you are. A course's pages (its overview, path and
 * tree) and a line's (About, Learn, Drill, Quiz, Tree, the every-branch drill) belong to Courses; Create's to Create;
 * Profile's to Profile. Home, Credits and the Lab belong to none.
 */
const HEADER_ITEM: Record<Route['page'], HeaderItem | null> = {
  home: null,
  courses: 'courses',
  course: 'courses',
  play: 'courses',
  search: 'search',
  tree: 'tree',
  quiz: 'quiz',
  speed: 'speed',
  'name-it': 'name-it',
  create: 'create',
  'create-course': 'create',
  'create-line': 'create',
  glossary: 'glossary',
  profile: 'profile',
  credits: null,
  lab: null,
};

export const headerItemOf = (route: Route): HeaderItem | null => HEADER_ITEM[route.page];
