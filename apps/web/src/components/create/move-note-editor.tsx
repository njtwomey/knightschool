import { Lightbulb, Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { MoveChip } from '@/components/chess/move-chip';
import { Hint } from '@/components/shared/hint';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { numberedMove } from '@knightschool/core';
import { MOVE_SYMBOLS, MOVE_TAGS, SYMBOL_HINT, type IdeaOption, type MoveNote, type MoveSymbol } from './move-note';

export type { IdeaOption, MoveNote, MoveSymbol } from './move-note';

export type MoveNoteEditorProps = {
  /** The move being edited, as the board is on it. */
  move: { ply: number; san: string; epd?: string; uci?: string };
  /** The line it belongs to. */
  lineName: string;
  note: MoveNote;
  /** Saves one undoable action, named for Undo ("edit the note on 4...Nf6"). */
  onSave: (note: MoveNote, label: string) => void;
  /**
   * Another line already gives this move's comment (one comment per move across the site): the comment is read-only
   * here, symbol, ideas and tags can still be added.
   */
  owner?: { name: string; href?: string };
  /** False for a shipped line seen inside Create: everything read-only, with its owner named. */
  editable?: boolean;
  /** The move is part of the line itself, so `?` and `??` are refused: a wrong move is a refutation. */
  inLine?: boolean;
  /** Opens the refutation editor, from the refusal. */
  onRefute?: () => void;
  /** The ideas list to choose from. */
  ideas: IdeaOption[];
  /** The note as a learner sees it, under the editor. */
  preview?: boolean;
  className?: string;
};

function NotePreview({
  move,
  note,
  ideas,
}: {
  move: MoveNoteEditorProps['move'];
  note: MoveNote;
  ideas: IdeaOption[];
}) {
  const empty = !note.comment && !note.symbol && note.ideas.length === 0 && note.tags.length === 0;
  return (
    <section className="grid gap-1.5 rounded-lg bg-muted/50 p-3 text-sm" aria-label="As a learner sees it">
      <p className="text-xs text-muted-foreground">As a learner sees it</p>
      {empty ? (
        <p className="text-muted-foreground">No note on this move yet.</p>
      ) : (
        <>
          <p>
            <span className="mr-1.5 font-mono font-semibold">
              {numberedMove(move.ply, move.san)}
              {note.symbol}
            </span>
            {note.comment}
          </p>
          {note.ideas.length > 0 || note.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {note.ideas.map((idea) => (
                <Badge key={idea} variant="secondary">
                  <Lightbulb aria-hidden /> {ideas.find((option) => option.id === idea)?.name ?? idea}
                </Badge>
              ))}
              {note.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function Editor({
  move,
  lineName,
  note,
  onSave,
  owner,
  editable = true,
  inLine = true,
  onRefute,
  ideas,
  preview = true,
  className,
}: MoveNoteEditorProps) {
  const id = useId();
  const [comment, setComment] = useState(note.comment);
  const [ideaQuery, setIdeaQuery] = useState('');
  const [tagText, setTagText] = useState('');
  const [refused, setRefused] = useState(false);
  const name = numberedMove(move.ply, move.san);
  const label = `edit the note on ${name}`;
  const commentLocked = !editable || !!owner;
  const save = (next: Partial<MoveNote>) => onSave({ ...note, comment, ...next }, label);

  const matches = ideaQuery.trim()
    ? ideas.filter(
        (idea) =>
          !note.ideas.includes(idea.id) &&
          `${idea.name} ${idea.summary}`.toLowerCase().includes(ideaQuery.trim().toLowerCase()),
      )
    : [];
  const exact = ideas.some((idea) => idea.name.toLowerCase() === ideaQuery.trim().toLowerCase());
  const addIdea = (idea: IdeaOption) => {
    save({ ideas: [...note.ideas, idea.id] });
    setIdeaQuery('');
  };
  const suggestIdea = () => {
    const word = ideaQuery.trim().toLowerCase();
    if (word && !note.tags.includes(word)) save({ tags: [...note.tags, word] });
    setIdeaQuery('');
  };
  const addTag = () => {
    const word = tagText.trim().toLowerCase();
    if (word && !note.tags.includes(word)) save({ tags: [...note.tags, word] });
    setTagText('');
  };

  return (
    <div className={cn('grid gap-4', className)}>
      <header className="grid gap-0.5">
        <h3 className="flex flex-wrap items-baseline gap-1.5 font-medium">
          Note on{' '}
          <MoveChip
            ply={move.ply}
            san={move.san}
            epd={move.epd}
            from={move.uci?.slice(0, 2)}
            to={move.uci?.slice(2, 4)}
          />
        </h3>
        <p className="text-sm text-muted-foreground">
          {editable ? `In the line ${lineName}` : `A shipped line, ${lineName}: read only here.`}
        </p>
      </header>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-comment`}>Comment</Label>
        <Textarea
          id={`${id}-comment`}
          value={comment}
          readOnly={commentLocked}
          rows={3}
          placeholder="One to three sentences, for both sides: what the move does and why."
          className={cn(commentLocked && 'bg-muted/50 text-muted-foreground')}
          onChange={(event) => setComment(event.target.value)}
          onBlur={() => {
            if (!commentLocked && comment !== note.comment) save({});
          }}
        />
        {owner ? (
          <p className="text-xs text-muted-foreground">
            Written in the line{' '}
            {owner.href ? (
              <a href={owner.href} className="underline underline-offset-2">
                {owner.name}
              </a>
            ) : (
              owner.name
            )}
            . A move has one comment across the site; symbol, ideas and tags can still be added here.
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label id={`${id}-symbol`}>Symbol</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={0}
          value={note.symbol || 'none'}
          disabled={!editable}
          aria-labelledby={`${id}-symbol`}
          onValueChange={(next) => {
            if (!next) return;
            const symbol = (next === 'none' ? '' : next) as MoveSymbol;
            if (inLine && (symbol === '?' || symbol === '??')) {
              setRefused(true);
              return;
            }
            setRefused(false);
            save({ symbol });
          }}
        >
          {MOVE_SYMBOLS.map((symbol) => (
            <Hint key={symbol || 'none'} text={SYMBOL_HINT[symbol]}>
              <ToggleGroupItem
                value={symbol || 'none'}
                aria-label={SYMBOL_HINT[symbol]}
                className="min-w-10 font-mono aria-checked:bg-primary aria-checked:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {symbol || <span className="font-sans text-xs">None</span>}
              </ToggleGroupItem>
            </Hint>
          ))}
        </ToggleGroup>
        {refused ? (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 text-sm">
            <span>A wrong move is a refutation, never part of a line.</span>
            {onRefute ? (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={onRefute}>
                Write it as a refutation
              </Button>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-ideas`}>Ideas</Label>
        {note.ideas.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {note.ideas.map((ideaId) => {
              const idea = ideas.find((option) => option.id === ideaId);
              return (
                <Hint key={ideaId} text={idea?.summary ?? 'Not in the ideas list yet.'}>
                  <Badge variant="secondary" className="gap-1 pr-0.5">
                    <Lightbulb aria-hidden /> {idea?.name ?? ideaId}
                    {editable ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-4"
                        aria-label={`Remove ${idea?.name ?? ideaId}`}
                        onClick={() => save({ ideas: note.ideas.filter((x) => x !== ideaId) })}
                      >
                        <X aria-hidden />
                      </Button>
                    ) : null}
                  </Badge>
                </Hint>
              );
            })}
          </div>
        ) : null}
        {editable ? (
          <>
            <Input
              id={`${id}-ideas`}
              value={ideaQuery}
              placeholder="Search the ideas: fork, fianchetto, pin"
              onChange={(event) => setIdeaQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (matches[0]) addIdea(matches[0]);
                else if (!exact) suggestIdea();
              }}
            />
            {ideaQuery.trim() ? (
              <div className="flex flex-wrap gap-1" aria-label="Matching ideas">
                {matches.slice(0, 6).map((idea) => (
                  <Hint key={idea.id} text={idea.summary}>
                    <Button variant="outline" size="xs" onClick={() => addIdea(idea)}>
                      <Plus aria-hidden /> {idea.name}
                    </Button>
                  </Hint>
                ))}
                {!exact ? (
                  <Button variant="ghost" size="xs" onClick={suggestIdea}>
                    Suggest a new idea: {ideaQuery.trim()}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-tag`}>Tags</Label>
        <div className="flex flex-wrap items-center gap-1">
          {MOVE_TAGS.map((tag) => (
            <Toggle
              key={tag}
              variant="outline"
              size="sm"
              pressed={note.tags.includes(tag)}
              disabled={!editable}
              className="aria-pressed:bg-primary aria-pressed:text-primary-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              onPressedChange={(on) => save({ tags: on ? [...note.tags, tag] : note.tags.filter((t) => t !== tag) })}
            >
              {tag}
            </Toggle>
          ))}
          {note.tags
            .filter((tag) => !(MOVE_TAGS as readonly string[]).includes(tag))
            .map((tag) => (
              <Badge key={tag} variant="outline" className="gap-1 pr-0.5">
                {tag}
                {editable ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-4"
                    aria-label={`Remove the tag ${tag}`}
                    onClick={() => save({ tags: note.tags.filter((t) => t !== tag) })}
                  >
                    <X aria-hidden />
                  </Button>
                ) : null}
              </Badge>
            ))}
          {editable ? (
            <Input
              id={`${id}-tag`}
              value={tagText}
              placeholder="Any word"
              className="h-7 w-32"
              onChange={(event) => setTagText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
            />
          ) : null}
        </div>
      </div>

      {preview ? <NotePreview move={move} note={{ ...note, comment }} ideas={ideas} /> : null}
    </div>
  );
}

/**
 * Everything an author writes about one move: its comment, its symbol, the ideas it shows and its tags. Edits the move
 * the board is on; the comment saves when you leave the box, as one undoable action
 * (docs/v2/components/move-note-editor.md).
 */
export function MoveNoteEditor(props: MoveNoteEditorProps) {
  // A new move starts a fresh draft.
  return <Editor key={`${props.move.ply}-${props.move.san}`} {...props} />;
}
