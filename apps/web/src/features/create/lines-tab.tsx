import { Copy, GitBranch, PenLine, Plus, TextCursorInput, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FilterToggle } from '@/components/filter-toggle';
import { ABOVE_ROW_LINK, RowLink, SortableHeader, type SortColumn } from '@/components/sortable-table';
import { useSort } from '@/hooks/use-sort';
import { KIND_LABEL, kindLabel } from '@/components/tags/hints';
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
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { navigate, to } from '@/router/location';
import { entryId, draftChapter, fullLine, type DraftCourse } from './draft';
import { GroupSelect } from './group-select';
import { problemsFor } from './helpers';
import { useAuthor } from './store';
import { lineEditHref } from '@/router/hrefs';

/** One line of the table, worked out once so that any column can sort it. */
type Row = {
  id: string;
  /** Where it is in the course's list: the table's own order. */
  order: number;
  title: string;
  kind: string;
  alternative: boolean;
  section: string;
  opponent: string;
  moves: number;
  /** The title of the line it grows from; none for a line from the start. */
  parent: string | undefined;
  own: boolean;
  problems: string[];
};
type SortKey = 'order' | 'title' | 'kind' | 'section' | 'opponent' | 'moves' | 'parent';
const COLUMNS: SortColumn<SortKey>[] = [
  { key: 'title', label: 'Line' },
  { key: 'kind', label: 'Kind' },
  { key: 'section', label: 'Group' },
  { key: 'opponent', label: 'Opponent' },
  { key: 'moves', label: 'Moves', className: 'text-right' },
  { key: 'parent', label: 'Grows from' },
];
// Kinds sort by importance (main lines first), not by name; an unknown kind goes last.
const kindRank = (kind: string) => {
  const rank = Object.keys(KIND_LABEL).indexOf(kind);
  return rank < 0 ? Infinity : rank;
};
const compare: Record<SortKey, (a: Row, b: Row) => number> = {
  order: (a, b) => a.order - b.order,
  title: (a, b) => a.title.localeCompare(b.title),
  kind: (a, b) => kindRank(a.kind) - kindRank(b.kind) || Number(a.alternative) - Number(b.alternative),
  section: (a, b) => a.section.localeCompare(b.section),
  opponent: (a, b) => a.opponent.localeCompare(b.opponent),
  moves: (a, b) => a.moves - b.moves,
  // Lines from the start first.
  parent: (a, b) => (a.parent ?? '').localeCompare(b.parent ?? ''),
};

/**
 * The Lines tab: every line of the course in one table, with what each grows from and what can be done to it. In the
 * course's order to begin with; a heading sorts by its column.
 */
export function LinesTab({ course }: { course: DraftCourse }) {
  const { build, rows } = useAuthor();
  const lines = course.manifest.lines;
  const { sort, sortBy, sorted } = useSort(compare, {
    initial: { key: 'order', descending: false },
    fallback: compare.order,
  });
  const title = (id: string) =>
    fullLine(build, id)?.game.tags.Variation ?? draftChapter(rows, id)?.tags.Variation ?? id;
  const data: Row[] = lines.map((entry, order) => {
    const id = entryId(entry);
    const line = fullLine(build, id);
    const own = draftChapter(rows, id);
    const parent = line?.parents.at(-1);
    return {
      id,
      order,
      title: title(id),
      kind: line?.game.tags.Kind ?? own?.tags.Kind ?? '',
      alternative: typeof entry !== 'string' && Boolean(entry.alternative),
      section: (typeof entry !== 'string' && entry.section) || '',
      opponent: line?.game.tags.Opponent ?? '',
      moves: line ? line.game.moves.length - line.startPly : (own?.moves.length ?? 0),
      parent: parent === undefined ? undefined : title(parent),
      own: own !== undefined,
      problems: problemsFor(build, [id]).map((problem) => problem.message),
    };
  });
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
          <SortableHeader columns={COLUMNS} sort={sort} onSort={sortBy} trailing={['Actions']} />
          <TableBody>
            {sorted(data).map((row) => (
              <TableRow key={row.id} className={row.own ? 'relative' : undefined}>
                <TableCell className="min-w-40 whitespace-normal font-medium">
                  {row.own ? (
                    <RowLink href={lineEditHref(course.id, row.id)}>{row.title}</RowLink>
                  ) : (
                    <span title="A line of the app: it is listed here but written elsewhere.">{row.title}</span>
                  )}
                  {row.problems.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className={`ml-2 ${ABOVE_ROW_LINK}`} tabIndex={0}>
                          Problem
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">{row.problems.join(' ')}</TooltipContent>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell className="whitespace-normal text-sm">
                  {kindLabel(row.kind)}
                  {row.alternative && <span className="text-muted-foreground"> (alternative)</span>}
                </TableCell>
                <TableCell>
                  <GroupSelect course={course} lineId={row.id} className={`h-8 w-40 ${ABOVE_ROW_LINK}`} />
                </TableCell>
                <TableCell className="font-mono text-xs">{row.opponent}</TableCell>
                <TableCell className="text-right tabular-nums">{row.moves}</TableCell>
                <TableCell className="whitespace-normal text-sm">
                  {row.parent !== undefined ? (
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="size-3.5 text-muted-foreground" aria-hidden />
                      {row.parent}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">the start</span>
                  )}
                </TableCell>
                <TableCell>{row.own && <LineActions courseId={course.id} id={row.id} title={row.title} />}</TableCell>
              </TableRow>
            ))}
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
    <div className={`flex justify-end gap-0.5 ${ABOVE_ROW_LINK}`}>
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
          <FilterToggle
            value={how}
            onChange={setHow}
            options={[
              { value: 'start', label: 'From the start' },
              { value: 'branch', label: 'Branching from a line', disabled: ids.length === 0 },
            ]}
            label="Where the line starts"
            className="justify-self-start"
          />
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
