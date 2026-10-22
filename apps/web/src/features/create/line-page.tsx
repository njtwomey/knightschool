import { Eye } from 'lucide-react';
import { useEffect } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { to } from '@/router/location';
import { entryId, draftCourses } from './draft';
import { LineBreadcrumbs } from './crumbs';
import { LineEditor } from './line-editor';
import { AuthorGate, CreateNotices, UndoButton } from './shell';
import { useAuthor } from './store';
import { lineHref, createHref } from '@/router/hrefs';

/** One line in Create (`/create/<course>/<line>`): the board to play, branch, note and tag it. */
export function LineEditorPage({ course, line }: { course: string; line: string }) {
  return (
    <AuthorGate>
      <LineEditorFrame courseId={course} lineId={line} />
    </AuthorGate>
  );
}

function LineEditorFrame({ courseId, lineId }: { courseId: string; lineId: string }) {
  const rows = useAuthor((state) => state.rows);
  const course = draftCourses(rows).find((candidate) => candidate.id === courseId);
  const listed = course?.manifest.lines.some((entry) => entryId(entry) === lineId);
  useEffect(() => useAuthor.getState().open(courseId, lineId), [courseId, lineId]);

  if (!course || !listed)
    return (
      <Page>
        <Alert>
          <AlertTitle>That line is not in this course</AlertTitle>
          <AlertDescription>
            It may have been deleted (Undo brings it back).{' '}
            <a className="underline" href={to(course ? createHref(courseId, 'lines') : '/create')}>
              {course ? 'See its lines' : 'See your courses'}
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
        <LineBreadcrumbs course={courseId} line={lineId} />
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={to(lineHref(courseId, lineId, 'about'))}>
              <Eye aria-hidden /> View as learner
            </a>
          </Button>
          <UndoButton />
        </div>
      </div>
      <CreateNotices ids={[lineId]} />
      <LineEditor course={course} />
    </Page>
  );
}
