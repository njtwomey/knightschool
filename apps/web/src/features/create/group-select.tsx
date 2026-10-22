import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { entrySection, type DraftCourse } from './draft';
import { useAuthor } from './store';

const NO_GROUP = '__none';
const NEW_GROUP = '__new';

/**
 * A line's group: the course's groups, No group, or New group… (asks for a name). A change saves at once, as one
 * undoable action. The same control on the Lines table and on the line page.
 */
export function GroupSelect({
  course,
  lineId,
  id,
  className,
}: {
  course: DraftCourse;
  lineId: string;
  id?: string;
  className?: string;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const groups = [
    ...new Set(course.manifest.lines.map(entrySection).filter((group): group is string => Boolean(group))),
  ];
  const entry = course.manifest.lines.find(
    (candidate) => (typeof candidate === 'string' ? candidate : candidate.id) === lineId,
  );
  const current = entry ? entrySection(entry) : undefined;
  const choose = (group: string | undefined) => void useAuthor.getState().setGroup(group, lineId);
  return (
    <>
      <Select
        value={current ?? NO_GROUP}
        onValueChange={(value) => {
          if (value === NEW_GROUP) {
            setName('');
            setNaming(true);
          } else choose(value === NO_GROUP ? undefined : value);
        }}
      >
        <SelectTrigger id={id} className={className ?? 'w-full'} aria-label="Group">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_GROUP}>No group</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group} value={group}>
              {group}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={NEW_GROUP}>New group…</SelectItem>
        </SelectContent>
      </Select>
      <Dialog open={naming} onOpenChange={setNaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>The course page shows its lines under their groups.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              setNaming(false);
              choose(name);
            }}
          >
            <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} aria-label="Group name" />
            <DialogFooter>
              <Button type="submit" disabled={!name.trim()}>
                Put the line in it
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
