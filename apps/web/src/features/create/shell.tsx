import { Download, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Page } from '@/components/page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { exportJsonFile } from '@/data/backup';
import { useStorage } from '@/data/storage';
import { problemsFor, useAuthorLoaded } from './helpers';
import { useAuthor } from './store';

/** Shows its children once your authored work is loaded; otherwise why it is not. */
export function AuthorGate({ children }: { children: ReactNode }) {
  const { storageStatus, status, error } = useAuthorLoaded();
  if (storageStatus !== 'ready')
    return (
      <Page>
        <Alert>
          <AlertTitle>Your data is not open in this tab</AlertTitle>
          <AlertDescription>
            Writing courses needs the local database, which is opening or in use elsewhere.
          </AlertDescription>
        </Alert>
      </Page>
    );
  if (status === 'error')
    return (
      <Page>
        <Alert variant="destructive">
          <AlertTitle>Could not load your courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Page>
    );
  if (status !== 'ready') return <Skeleton className="mx-auto mt-6 h-96 w-full max-w-6xl" />;
  return <>{children}</>;
}

/** Takes back the last change, saying which: "Undo: delete line 2...Bc5". */
export function UndoButton() {
  const label = useAuthor((state) => state.undoLabel);
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!label}
      title={label ? `Take back: ${label}` : 'Nothing to undo'}
      onClick={() => void useAuthor.getState().undo()}
      className="max-w-full"
    >
      <Undo2 aria-hidden /> <span className="truncate">{label ? `Undo: ${label}` : 'Undo'}</span>
    </Button>
  );
}

/** Downloads all your data as JSON, and notes it for the reminder. */
export function ExportButton() {
  const storage = useStorage((state) => state.storage);
  if (!storage) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => void exportJsonFile(storage).then(() => useAuthor.getState().load())}
    >
      <Download aria-hidden /> Export my data
    </Button>
  );
}

/**
 * What just happened (with Undo after a removal), the reminder to export, and the build's problems with `ids` (all of
 * them when no ids are given), so a problem shows where it occurs.
 */
export function CreateNotices({ ids }: { ids?: string[] }) {
  const { message, reminder, build } = useAuthor();
  const problems = ids ? problemsFor(build, ids) : (build?.problems ?? []);
  return (
    <>
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
      {reminder && (
        <Alert>
          <AlertTitle>Keep a copy of your work</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {reminder.edits} {reminder.edits === 1 ? 'change' : 'changes'} in {reminder.days}{' '}
              {reminder.days === 1 ? 'day' : 'days'} since your last export. Your courses live only in this browser.
            </span>
            <ExportButton />
          </AlertDescription>
        </Alert>
      )}
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
    </>
  );
}
