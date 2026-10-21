import { Pencil, Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthor } from './store';

/** Rename or delete a group of lines. Deleting keeps the lines; it only takes them out of the group. */
export function GroupActions({ name }: { name: string }) {
  const [draft, setDraft] = useState(name);
  const [open, setOpen] = useState(false);
  return (
    <span className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="size-6" aria-label={`Rename the group ${name}`}>
            <Pencil aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="grid w-64 gap-2">
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="New name" />
          <Button
            size="sm"
            onClick={() => {
              setOpen(false);
              void useAuthor.getState().renameGroup(name, draft);
            }}
          >
            Rename
          </Button>
        </PopoverContent>
      </Popover>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" className="size-6" aria-label={`Delete the group ${name}`}>
            <Trash2 aria-hidden />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the group {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Its lines stay in the course, without a group. Undo puts it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void useAuthor.getState().deleteGroup(name)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </span>
  );
}
