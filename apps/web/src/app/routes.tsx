import { PageSuspense } from '@/components/page-fallback';
import { CoursePage } from '@/features/course/course-page';
import { CoursesPage } from '@/features/courses/courses-page';
import { HomePage } from '@/features/home/home-page';
import { LinePage } from '@/features/line/line-page';
import { CoursePathPage } from '@/features/path/path-page';
import { SearchPage } from '@/features/search/search-page';
import { lazyNamed } from '@/lib/lazy';
import type { Route } from '@/router/route';

// The pages a visit starts on (Home, Courses, Search, a course, its path and a line's About) come with the app; the
// rest load their code the first time they are opened, and the service worker keeps every chunk for offline use.
const CreatePage = lazyNamed(() => import('@/features/create/create-page'), 'CreatePage');
const CourseEditorPage = lazyNamed(() => import('@/features/create/course-editor'), 'CourseEditorPage');
const LineEditorPage = lazyNamed(() => import('@/features/create/line-page'), 'LineEditorPage');
const CourseTreePage = lazyNamed(() => import('@/features/tree/course-tree-page'), 'CourseTreePage');
const CurriculumTreePage = lazyNamed(() => import('@/features/tree/curriculum-tree-page'), 'CurriculumTreePage');
const LabPage = lazyNamed(() => import('@/features/lab/lab-page'), 'LabPage');
const ProfilePage = lazyNamed(() => import('@/features/profile/profile-page'), 'ProfilePage');
const QuizPage = lazyNamed(() => import('@/features/quiz/quiz-page'), 'QuizPage');
const SpeedPage = lazyNamed(() => import('@/features/speed/speed-page'), 'SpeedPage');
const NameItPage = lazyNamed(() => import('@/features/name-it/name-it-page'), 'NameItPage');
const GlossaryPage = lazyNamed(() => import('@/features/glossary/glossary-page'), 'GlossaryPage');
const CreditsPage = lazyNamed(() => import('@/features/credits/credits-page'), 'CreditsPage');

/** The page the address names. */
export function Routes({ route }: { route: Route }) {
  switch (route.page) {
    case 'home':
      return <HomePage />;
    case 'search':
      return <SearchPage />;
    case 'courses':
      return <CoursesPage />;
    case 'course':
      if (route.tab === 'path') return <CoursePathPage key={route.id} course={route.id} />;
      if (route.tab === 'tree')
        return (
          <PageSuspense>
            <CourseTreePage key={route.id} course={route.id} />
          </PageSuspense>
        );
      return <CoursePage courseId={route.id} />;
    case 'play':
      return (
        <LinePage
          key={`${route.course}/${route.line}/${route.tab}/${JSON.stringify(route.unit ?? null)}`}
          course={route.course}
          line={route.line}
          tab={route.tab}
          unit={route.unit}
        />
      );
  }
  return (
    <PageSuspense>
      {route.page === 'profile' && <ProfilePage tab={route.tab} />}
      {route.page === 'create' && <CreatePage />}
      {route.page === 'create-course' && <CourseEditorPage course={route.course} tab={route.tab} />}
      {route.page === 'create-line' && <LineEditorPage course={route.course} line={route.line} />}
      {route.page === 'glossary' && <GlossaryPage />}
      {route.page === 'tree' && <CurriculumTreePage />}
      {route.page === 'quiz' && <QuizPage />}
      {route.page === 'name-it' && <NameItPage />}
      {route.page === 'speed' && <SpeedPage />}
      {route.page === 'credits' && <CreditsPage />}
      {route.page === 'lab' && <LabPage />}
    </PageSuspense>
  );
}
