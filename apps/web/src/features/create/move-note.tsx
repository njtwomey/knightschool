import { MOVE_TAGS } from '@knightschool/core';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuthor } from './store';

/** The note on a move: free text and supplementary tags (tip, trap, blunder or your own), shown to learners. */
export function MoveNote({
  label,
  comment,
  tags,
  editable,
  owner,
  fixed,
}: {
  label: string;
  comment: string;
  tags: string[];
  editable: boolean;
  owner: string | undefined;
  /** The comment comes from another line that plays this move too: a move has one comment, so it is not changed here. */
  fixed: boolean;
}) {
  const [text, setText] = useState(comment);
  const [chosen, setChosen] = useState(tags.filter((tag) => (MOVE_TAGS as readonly string[]).includes(tag)));
  const [others, setOthers] = useState(
    tags.filter((tag) => !(MOVE_TAGS as readonly string[]).includes(tag)).join(', '),
  );
  if (!editable)
    return (
      <div className="grid gap-1 rounded-lg border p-3 text-sm">
        <p className="font-medium">{label}</p>
        {comment ? <p>{comment}</p> : <p className="text-muted-foreground">No note.</p>}
        <p className="text-xs text-muted-foreground">
          This move belongs to {owner ? `the line ${owner}` : 'another line'}: its note is written there.
        </p>
      </div>
    );
  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <Label htmlFor="move-note">Note on {label}</Label>
      {fixed ? (
        <div className="grid gap-1 text-sm">
          <p>{comment}</p>
          <p className="text-xs text-muted-foreground">
            Another line already explains this move, and a move has one comment wherever it is played. You can still tag
            it.
          </p>
        </div>
      ) : (
        <Textarea
          id="move-note"
          rows={3}
          value={text}
          placeholder="Why this move, or what to look out for. Learners see it while studying."
          onChange={(event) => setText(event.target.value)}
        />
      )}
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        value={chosen}
        onValueChange={setChosen}
        className="justify-self-start"
        aria-label="Tags"
      >
        {MOVE_TAGS.map((tag) => (
          <ToggleGroupItem key={tag} value={tag}>
            {tag === 'blunder' ? 'common blunder' : tag}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Input
        value={others}
        onChange={(event) => setOthers(event.target.value)}
        placeholder="Other tags, separated by commas"
        aria-label="Other tags"
      />
      <Button
        size="sm"
        className="justify-self-start"
        onClick={() => void useAuthor.getState().setNote(fixed ? '' : text, [...chosen, ...others.split(',')])}
      >
        Save the note
      </Button>
    </div>
  );
}
