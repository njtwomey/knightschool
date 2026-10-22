import type { LineKind, TrapKind } from '@knightschool/core';
import { Trash2 } from 'lucide-react';
import { KIND_OPTIONS } from '@/components/tags/hints';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createHref } from '@/router/hrefs';
import { navigate } from '@/router/location';
import { draftChapter, fullLine, type DraftCourse } from './draft';
import { GroupSelect } from './group-select';
import { useDraft } from './helpers';
import { useAuthor } from './store';

/** The line's title, description, kind and group. Deleting it asks first. */
export function LineDetails({ course }: { course: DraftCourse }) {
  const { build, rows, lineId } = useAuthor();
  const line = fullLine(build, lineId);
  const own = lineId ? draftChapter(rows, lineId) : undefined;
  const [title, setTitle] = useDraft(own?.tags.Variation ?? '');
  const [description, setDescription] = useDraft(own?.tags.Description ?? '');
  const [kind, setKind] = useDraft((own?.tags.Kind ?? 'sideline') as LineKind | TrapKind);
  if (!own || !line) return null;
  const children = [...(build?.tree.lines.values() ?? [])].filter((other) => other.parents.includes(line.id)).length;
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <div className="grid gap-1.5">
          <Label htmlFor="line-title">Title</Label>
          <Input id="line-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="line-kind">Kind</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as LineKind | TrapKind)}>
            <SelectTrigger id="line-kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="line-group">Group</Label>
          <GroupSelect id="line-group" course={course} lineId={line.id} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="line-description">What it is and why it matters</Label>
        <Textarea
          id="line-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void useAuthor.getState().setLineMeta({ title, description, kind })}>
          Save the line
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Trash2 aria-hidden /> Delete the line
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {own.tags.Variation}?</AlertDialogTitle>
              <AlertDialogDescription>
                {children > 0
                  ? `${children} ${children === 1 ? 'line branches' : 'lines branch'} from it and will be deleted too. `
                  : ''}
                Undo brings everything back.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void useAuthor
                    .getState()
                    .deleteLine()
                    .then(() => navigate(createHref(course.id, 'lines')))
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
