import { PlayBreadcrumbs } from '@/components/breadcrumbs/course-breadcrumbs';
import { PageSuspense } from '@/components/page-fallback';
import { lazyNamed } from '@/lib/lazy';
import type { LineTab, UnitRef } from '@/router/hrefs';
import { LineAbout } from './about-tab';

// About is what a line opens on; the other tabs load their code the first time one is opened.
const PlayPage = lazyNamed(() => import('@/features/play/play-page'), 'PlayPage');
const QuizPage = lazyNamed(() => import('@/features/quiz/quiz-page'), 'QuizPage');
const CourseTreePage = lazyNamed(() => import('@/features/tree/course-tree-page'), 'CourseTreePage');

/** One line's page: the tab decides what it shows. Learn, Drill and the every-branch drill are the play page. */
export function LinePage({
  course,
  line,
  tab,
  unit,
}: {
  course: string;
  line: string;
  tab: LineTab | 'branches';
  /** Learn and Drill: one unit of the course's study path. */
  unit?: UnitRef;
}) {
  if (tab === 'about') return <LineAbout course={course} line={line} />;
  return (
    <PageSuspense>
      {tab === 'branches' && <PlayPage course={course} line={line} mode="branches" />}
      {tab === 'learn' && <PlayPage course={course} line={line} mode="learn" unit={unit} />}
      {tab === 'drill' && <PlayPage course={course} line={line} mode="drill" unit={unit} />}
      {tab === 'quiz' && (
        <QuizPage scope={{ course, line }} header={<PlayBreadcrumbs course={course} line={line} tab="quiz" />} />
      )}
      {tab === 'tree' && <CourseTreePage course={course} line={line} />}
    </PageSuspense>
  );
}
