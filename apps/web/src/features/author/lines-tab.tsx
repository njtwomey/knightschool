import { Copy, GitBranch, PenLine, Plus, TextCursorInput, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { navigate, to } from '@/router/location';
import { entryId, entrySection, problemsFor } from './helpers';
import { draftChapter, fullLine, useAuthor, type DraftCourse } from './store';
import { lineEditHref } from './tabs';

const KIND: Record<string, string> = {
  main: 'Main line',
  gambit: 'Gambit',
  sideline: 'Sideline',
  rare: 'Rare',
  'against-us': 'Trap to avoid',
  'for-us': 'Trap to spring',
};

/** The Lines tab: every line of the course in one table, with what each grows from and what can be done to it. */
export function LinesTab({ course }: { course: DraftCourse }) {
  const { build, rows } = useAuthor();
  const lines = course.manifest.lines;
  const title = (id: string) =>
    fullLine(build, id)?.game.tags.Variation ?? draftChapter(rows, id)?.tags.Variation ?? id;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {lines.length} {lines.length === 1 ? 'line' : 'lines'}. Open one to play it, branch it and note its moves.
        </p>
        <NewLineDialog course={course} />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead className="text-right">Moves</TableHead>
              <TableHead>Grows from</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((entry) => {
              const id = entryId(entry);
              const line = fullLine(build, id);
              const own = draftChapter(rows, id);
              const problems = problemsFor(build, [id]);
              const parent = line?.parents.at(-1);
              const alternative = typeof entry !== 'string' && entry.alternative;
              const kind = line?.game.tags.Kind ?? own?.tags.Kind ?? '';
              return (
                <TableRow
                  key={id}
                  className={own ? 'cursor-pointer' : undefined}
                  onClick={(event) => {
                    if (own && !(event.target as HTMLElement).closest('a, button, [role=dialog]'))
                      navigate(lineEditHref(course.id, id));
                  }}
                >
                  <TableCell className="min-w-40 whitespace-normal font-medium">
                    {own ? (
                      <a href={to(lineEditHref(course.id, id))} className="hover:underline">
                        {title(id)}
                      </a>
                    ) : (
                      <span title="A line of the app: it is listed here but written elsewhere.">{title(id)}</span>
                    )}
                    {problems.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="ml-2" tabIndex={0}>
                            Problem
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">{problems.map((p) => p.message).join(' ')}</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {KIND[kind] ?? kind}
                    {alternative && <span className="text-muted-foreground"> (alternative)</span>}
                  </TableCell>
                  <TableCell className="text-sm">{entrySection(entry) ?? '–'}</TableCell>
                  <TableCell className="font-mono text-xs">{line?.game.tags.Opponent ?? ''}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line ? line.game.moves.length - line.startPly : (own?.moves.length ?? 0)}
                  </TableCell>
                  <TableCell className="whitespace-normal text-sm">
                    {parent ? (
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="size-3.5 text-muted-foreground" aria-hidden />
                        {title(parent)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">the start</span>
                    )}
                  </TableCell>
                  <TableCell>{own && <LineActions courseId={course.id} id={id} title={title(id)} />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Edit, rename, copy and delete one line. */
function LineActions({ courseId, id, title }: { courseId: string; id: string; title: string }) {
  const [name, setName] = useState(title);
  const [open, setOpen] = useState(false);
  const children = [...(useAuthor((state) => state.build)?.tree.lines.values() ?? [])].filter((line) =>
    line.parents.includes(id),
  ).length;
  return (
    <div className="flex justify-end gap-0.5">
      <Button asChild size="icon" variant="ghost" className="size-8" title="Edit">
        <a href={to(lineEditHref(courseId, id))} aria-label={`Edit ${title}`}>
          <PenLine aria-hidden />
        </a>
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" title="Rename" aria-label={`Rename ${title}`}>
            <TextCursorInput aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="grid w-72 gap-2">
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="New title" />
          <Button
            size="sm"
            onClick={() => {
              setOpen(false);
              void useAuthor.getState().renameLine(id, name);
            }}
          >
            Rename
          </Button>
        </PopoverContent>
      </Popover>
      <Button
        size="icon"
        variant="ghost"
        className="size-8"
        title="Make a copy"
        aria-label={`Copy ${title}`}
        onClick={() => void useAuthor.getState().duplicateLine(id)}
      >
        <Copy aria-hidden />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="size-8" title="Delete" aria-label={`Delete ${title}`}>
            <Trash2 aria-hidden />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {children > 0
                ? `${children} ${children === 1 ? 'line branches' : 'lines branch'} from it and will be deleted too. `
                : ''}
              Undo brings everything back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void useAuthor.getState().deleteLine(id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * A new line: from the start (made at once), or branching from a position of another line (that line opens, to step
 * to the position and choose Branch here).
 */
function NewLineDialog({ course }: { course: DraftCourse }) {
  const build = useAuthor((state) => state.build);
  const [open, setOpen] = useState(false);
  const [how, setHow] = useState<'start' | 'branch'>('start');
  const ids = course.manifest.lines.map(entryId).filter((id) => fullLine(build, id));
  const [from, setFrom] = useState(ids[0] ?? '');
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden /> New line
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New line</DialogTitle>
          <DialogDescription>Start from the first move, or branch from a position of another line.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <ToggleGroup
            type="single"
            variant="outline"
            value={how}
            onValueChange={(value) => value && setHow(value as 'start' | 'branch')}
            className="justify-self-start"
          >
            <ToggleGroupItem value="start">From the start</ToggleGroupItem>
            <ToggleGroupItem value="branch" disabled={ids.length === 0}>
              Branching from a line
            </ToggleGroupItem>
          </ToggleGroup>
          {how === 'branch' && (
            <div className="grid gap-1.5">
              <Label htmlFor="branch-from">Branching from</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger id="branch-from" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ids.map((id) => (
                    <SelectItem key={id} value={id}>
                      {fullLine(build, id)?.game.tags.Variation ?? id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                That line opens: step to the position to branch from, choose Branch here, and play the new move.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={async () => {
              setOpen(false);
              if (how === 'start') {
                useAuthor.getState().open(course.id);
                const id = await useAuthor.getState().createLine();
                if (id) navigate(lineEditHref(course.id, id));
              } else if (from) {
                useAuthor
                  .getState()
                  .hintNext('Step to the position to branch from, choose Branch here, then play the new move.');
                navigate(lineEditHref(course.id, from));
              }
            }}
          >
            {how === 'start' ? 'Make the line' : 'Open the line'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
