import { contributionYaml, issueFields, issueUrl, MAX_ISSUE_URL } from '@knightschool/core';
import { Copy, Download, ExternalLink, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { download } from '@/data/backup';
import { navigate } from '@/router/location';
import { type DraftCourse } from './draft';
import { useAuthor } from './store';
import { createHref } from '@/router/hrefs';
import { errorText } from '@/lib/errors';

/** Copies text to the clipboard; false when the browser will not. */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Publish: the course as a contribution (YAML, the moves as PGN), to propose for the app on GitHub. The link fills in
 * the contribution form; when the YAML is too long for a link, GitHub opens with a short note and the YAML is copied to
 * paste, or downloaded to attach.
 */
export function PublishPanel({ course }: { course: DraftCourse }) {
  const build = useAuthor((state) => state.build);
  const rows = useAuthor((state) => state.rows);
  const [status, setStatus] = useState<string | null>(null);
  const result = useMemo(() => {
    try {
      const contribution = useAuthor.getState().contribution(course.id);
      return {
        yaml: contributionYaml(contribution),
        fields: issueFields(contribution),
        lines: contribution.chapters.length,
        error: null,
      };
    } catch (error) {
      return { yaml: '', fields: undefined, lines: 0, error: errorText(error) };
    }
    // The contribution is rebuilt whenever the saved rows change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, rows, build]);
  const problems = (build?.problems ?? []).filter(
    (problem) =>
      problem.id === course.id ||
      course.manifest.lines.some((entry) => (typeof entry === 'string' ? entry : entry.id) === problem.id),
  );
  if (result.error)
    return (
      <Alert variant="destructive">
        <AlertTitle>Not ready to publish</AlertTitle>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  const title = `Contribution: ${course.manifest.name}`;
  const link = issueUrl(title, result.yaml, result.fields);
  const file = `${course.id}-contribution.txt`;
  return (
    <div className="grid gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Propose this course for Knight School. It goes as one readable file: the course and its {result.lines}{' '}
        {result.lines === 1 ? 'line' : 'lines'} with their notes, tags and groups, the moves as PGN. Proposing opens a
        new issue on GitHub (you need a GitHub account); nothing is sent until you submit it there.
      </p>
      {problems.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Some of this course cannot be used yet (see above). Fix that before proposing it.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            if (!link.full) {
              const copied = await copy(result.yaml);
              download(file, result.yaml, 'text/plain');
              setStatus(
                `Too long for a link (${result.yaml.length} characters), so GitHub opens with a short note. The YAML is ${copied ? 'copied: paste it into the form' : 'downloaded'}, or attach ${file}.`,
              );
            } else
              setStatus(
                'GitHub opened with your contribution filled in. Check the answers, add how you checked the lines, and submit the issue there.',
              );
            window.open(link.url, '_blank', 'noopener');
          }}
        >
          <ExternalLink aria-hidden /> Propose it on GitHub
        </Button>
        <Button
          variant="outline"
          onClick={async () =>
            setStatus((await copy(result.yaml)) ? 'Copied the YAML.' : 'The browser would not copy it.')
          }
        >
          <Copy aria-hidden /> Copy the YAML
        </Button>
        <Button variant="outline" onClick={() => download(file, result.yaml, 'text/plain')}>
          <Download aria-hidden /> Download it
        </Button>
      </div>
      {!link.full && (
        <p className="text-sm text-muted-foreground">
          At {result.yaml.length} characters it does not fit in a link (the limit is about {MAX_ISSUE_URL}), so you will
          paste it or attach the file.
        </p>
      )}
      {status && (
        <Alert role="status">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}
      <pre
        className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs"
        aria-label="The contribution"
      >
        {result.yaml}
      </pre>
    </div>
  );
}

/** Loads a contribution (pasted, or a file) into your courses, to check it as a learner would see it. */
export function ImportContributionDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload aria-hidden /> Import contribution
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import a contribution</DialogTitle>
          <DialogDescription>
            Paste the YAML or choose the file. It becomes one of your courses; a course or line of yours with the same
            id is replaced, and Undo brings it back.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="import-file">File</Label>
            <Input
              id="import-file"
              type="file"
              accept=".yaml,.yml,.txt,text/plain"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setText(await file.text());
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="import-text">Or the YAML</Label>
            <Textarea
              id="import-text"
              className="font-mono text-xs"
              rows={10}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!text.trim()}
            onClick={async () => {
              const problem = await useAuthor.getState().importContribution(text);
              setError(problem);
              if (!problem) {
                setOpen(false);
                setText('');
                const imported = useAuthor.getState().courseId;
                if (imported) navigate(createHref(imported));
              }
            }}
          >
            Import it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
