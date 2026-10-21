import { Eye } from 'lucide-react';
import { useEffect } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { to } from '@/router/location';
import { CourseForm } from './course-form';
import { CreateBreadcrumbs } from './crumbs';
import { entryId } from './helpers';
import { LinesTab } from './lines-tab';
import { PathOrder } from './path-order';
import { PublishPanel } from './publish';
import { AuthorGate, CreateNotices, UndoButton } from './shell';
import { draftCourses, useAuthor } from './store';
import { courseHref, type CreateTab } from '@/router/hrefs';

/** One course in Create (`/create/<course>/<tab>`): its details, lines, path or publishing. */
export function CourseEditorPage({ course, tab }: { course: string; tab: CreateTab }) {
  return (
    <AuthorGate>
      <CourseEditor courseId={course} tab={tab} />
    </AuthorGate>
  );
}

function CourseEditor({ courseId, tab }: { courseId: string; tab: CreateTab }) {
  const rows = useAuthor((state) => state.rows);
  const course = draftCourses(rows).find((candidate) => candidate.id === courseId);
  useEffect(() => useAuthor.getState().open(courseId), [courseId]);

  if (!course)
    return (
      <Page>
        <Alert>
          <AlertTitle>No course of yours is called {courseId}</AlertTitle>
          <AlertDescription>
            It may have been deleted (Undo brings it back) or written in another browser.{' '}
            <a className="underline" href={to('/create')}>
              See your courses
            </a>
          </AlertDescription>
        </Alert>
        <div>
          <UndoButton />
        </div>
      </Page>
    );
  return (
    <Page>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CreateBreadcrumbs course={courseId} tab={tab} />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={to(courseHref(courseId))}>
              <Eye aria-hidden /> View as learner
            </a>
          </Button>
          <UndoButton />
        </div>
      </div>
      <CreateNotices ids={[courseId, ...course.manifest.lines.map(entryId)]} />
      {tab === 'details' && <CourseForm key={courseId} course={course} />}
      {tab === 'lines' && <LinesTab course={course} />}
      {tab === 'path' && <PathOrder key={courseId} course={course} />}
      {tab === 'publish' && <PublishPanel key={courseId} course={course} />}
    </Page>
  );
}
