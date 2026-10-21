import { GitBranch, Plus, Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportJsonFile } from '@/data/backup';
import { useStorage } from '@/data/storage';
import { CourseForm, NewCourseDialog } from './course-form';
import { GroupActions } from './group-actions';
import { entryId, entrySection } from './helpers';
import { LineEditor } from './line-editor';
import { PathOrder } from './path-order';
import { ImportContributionDialog, PublishPanel } from './publish';
import { draftCourses, fullLine, useAuthor } from './store';

/**
 * Profile, Author: write your own courses. Courses and their lines (grouped) on the left; the line on a board to play,
 * branch, comment and tag; the course's details and path changes; and publishing. Every change is saved at once with
 * what it replaced, so Undo takes back the last one, and deletes ask first.
 */
export function AuthorPage() {
  const storageStatus = useStorage((state) => state.status);
  const { status, error, message, reminder, build, courseId } = useAuthor();
  const courses = draftCourses(useAuthor((state) => state.rows));
  const course = courses.find((candidate) => candidate.id === courseId);

  useEffect(() => {
    if (storageStatus === 'ready') void useAuthor.getState().load();
  }, [storageStatus]);

  if (storageStatus !== 'ready')
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Alert>
          <AlertTitle>Your data is not open in this tab</AlertTitle>
          <AlertDescription>
            Writing courses needs the local database, which is opening or in use elsewhere.
          </AlertDescription>
        </Alert>
      </div>
    );
  if (status === 'error')
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Alert variant="destructive">
          <AlertTitle>Could not load your courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  if (status !== 'ready') return <Skeleton className="mx-auto mt-6 h-96 max-w-6xl" />;

  const problems = build?.problems ?? [];
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
      <Sidebar />
      <div className="grid min-w-0 content-start gap-4">
        {message && (
          <Alert variant={message.error ? 'destructive' : 'default'} role="status">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>{message.text}</span>
              {message.undo && (
                <Button size="sm" variant="outline" onClick={() => void useAuthor.getState().undo()}>
                  <Undo2 aria-hidden /> Undo
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {reminder && <ExportReminder edits={reminder.edits} days={reminder.days} />}
        {problems.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Some of your work cannot be used yet</AlertTitle>
            <AlertDescription>
              <ul className="grid list-disc gap-1 pl-4">
                {problems.map((problem) => (
                  <li key={`${problem.kind}:${problem.id}`}>
                    <span className="font-medium">{problem.id}</span>: {problem.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {course ? (
          <Tabs defaultValue="line" className="gap-4">
            <TabsList>
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="course">Course</TabsTrigger>
              <TabsTrigger value="path">Path</TabsTrigger>
              <TabsTrigger value="publish">Publish</TabsTrigger>
            </TabsList>
            <TabsContent value="line">
              <LineEditor course={course} />
            </TabsContent>
            <TabsContent value="course">
              <CourseForm key={course.id} course={course} />
            </TabsContent>
            <TabsContent value="path">
              <PathOrder key={course.id} course={course} />
            </TabsContent>
            <TabsContent value="publish">
              <PublishPanel key={course.id} course={course} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="grid gap-3 rounded-xl border bg-card p-6">
            <h2 className="text-xl font-semibold">Write your own course</h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Play a main line on the board, branch from any position, and comment and tag the moves. Your course then
              appears with the others: on its path, in Learn and Drill, and in the quiz once you enrol. It is kept in
              this browser, so export your data now and then.
            </p>
            <NewCourseDialog />
          </div>
        )}
      </div>
    </div>
  );
}

function ExportReminder({ edits, days }: { edits: number; days: number }) {
  const storage = useStorage((state) => state.storage);
  return (
    <Alert>
      <AlertTitle>Keep a copy of your work</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {edits} {edits === 1 ? 'change' : 'changes'} in {days} {days === 1 ? 'day' : 'days'} since your last export.
          Your courses live only in this browser.
        </span>
        {storage && (
          <Button size="sm" onClick={() => void exportJsonFile(storage).then(() => useAuthor.getState().load())}>
            Export my data
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** Your courses, each with its lines under their groups, and the buttons that add and undo. */
function Sidebar() {
  const { rows, courseId, lineId, build } = useAuthor();
  const courses = draftCourses(rows);
  return (
    <aside className="grid content-start gap-4" aria-label="Your courses">
      <div className="flex flex-wrap gap-2">
        <NewCourseDialog compact />
        <ImportContributionDialog />
        <Button
          size="sm"
          variant="outline"
          onClick={() => void useAuthor.getState().undo()}
          title="Take back the last change"
        >
          <Undo2 aria-hidden /> Undo
        </Button>
      </div>
      {courses.length === 0 && <p className="text-sm text-muted-foreground">No courses yet.</p>}
      {courses.map((course) => {
        const open = course.id === courseId;
        const groups = [...new Set(course.manifest.lines.map(entrySection))];
        return (
          <section key={course.id} className="grid gap-1.5">
            <Button
              variant={open ? 'secondary' : 'ghost'}
              className="justify-start font-semibold"
              onClick={() => useAuthor.getState().selectCourse(course.id)}
            >
              {course.manifest.name}
            </Button>
            {open && (
              <div className="grid gap-2 pl-2">
                {groups.map((group) => (
                  <div key={group ?? ''} className="grid gap-0.5">
                    {group && (
                      <div className="flex items-center justify-between gap-1 text-xs font-medium text-muted-foreground">
                        <span>{group}</span>
                        <GroupActions name={group} />
                      </div>
                    )}
                    {course.manifest.lines
                      .filter((entry) => entrySection(entry) === group)
                      .map((entry) => {
                        const id = entryId(entry);
                        const line = fullLine(build, id);
                        return (
                          <Button
                            key={id}
                            size="sm"
                            variant={id === lineId ? 'secondary' : 'ghost'}
                            className="h-auto justify-start py-1 text-left font-normal whitespace-normal"
                            onClick={() => useAuthor.getState().selectLine(id)}
                          >
                            {line?.parents.length ? <GitBranch className="size-3.5 shrink-0" aria-hidden /> : null}
                            {line?.game.tags.Variation ?? id}
                          </Button>
                        );
                      })}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  onClick={() => void useAuthor.getState().createLine()}
                >
                  <Plus aria-hidden /> New line
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}
