import { type LineKind, MOVE_TAGS, numberedMove, runMove, type TrapKind, uciLine } from '@knightschool/core';
import { Camera, GitBranch, Scissors, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppBoard } from '@/components/board/app-board';
import { StepButtons } from '@/components/board/step-buttons';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { navigate } from '@/router/location';
import { GroupSelect } from './group-select';
import { useDraft } from './helpers';
import { draftChapter, fullLine, positionsOf, useAuthor, type DraftCourse } from './store';
import { createHref, lineEditHref } from '@/router/hrefs';

const KINDS: { value: LineKind | TrapKind; label: string }[] = [
  { value: 'main', label: 'Main line' },
  { value: 'gambit', label: 'Gambit' },
  { value: 'sideline', label: 'Sideline' },
  { value: 'rare', label: 'Rare' },
  { value: 'against-us', label: 'Trap to avoid' },
  { value: 'for-us', label: 'Trap to spring' },
];

/**
 * One line: its details, the board to play it on, its moves (yours to change are the ones after where it starts), and
 * the note on the move looked at. Play at the end of the line to add moves; choose Branch at any position to start a
 * new line from there.
 */
export function LineEditor({ course }: { course: DraftCourse }) {
  const { build, rows, lineId, ply, branching } = useAuthor();
  const line = fullLine(build, lineId);
  const own = lineId ? draftChapter(rows, lineId) : undefined;
  const positions = useMemo(() => positionsOf(line), [line]);
  const ucis = useMemo(() => uciLine(line), [line]);

  // Arrow keys step through the line, unless typing.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      const { ply: at, setPly } = useAuthor.getState();
      if (event.key === 'ArrowLeft') setPly(at - 1);
      else if (event.key === 'ArrowRight') setPly(at + 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!lineId)
    return <p className="text-sm text-muted-foreground">This course has no lines yet. Add one on the left.</p>;
  if (!line)
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This line cannot be shown: see what is wrong above. Undo the last change, or delete the line.
        </AlertDescription>
      </Alert>
    );

  const moves = line.game.moves;
  const length = moves.length;
  const at = branching ?? ply;
  const snapshot = own?.tags.Snapshot !== undefined ? Number(own.tags.Snapshot) : undefined;
  const mine = Boolean(own);
  // A comment the tree has from another chapter, on a move this line plays without one of its own.
  const edge = ply > 0 ? build?.tree.edges.get(`${positions[ply - 1]} ${ucis[ply - 1]}`) : undefined;
  const ownMove = own?.moves[ply - 1 - line.startPly];
  const explainedElsewhere = Boolean(
    edge?.note.comment && edge.writtenIn.some((chapter) => chapter !== lineId) && !ownMove?.comment,
  );
  const side = course.manifest.side;

  return (
    <div className="grid gap-4">
      <LineDetails course={course} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <AppBoard
            id="author"
            className="aspect-square w-full max-w-[26rem]"
            epd={positions[at]!}
            orientation={side}
            interactive
            onMove={(uci) => {
              // A branch opens a new line: the address follows it.
              void useAuthor
                .getState()
                .playMove(uci)
                .then(() => {
                  const opened = useAuthor.getState().lineId;
                  if (opened && opened !== lineId) navigate(lineEditHref(course.id, opened));
                });
              return true;
            }}
            lastMove={at > 0 ? ucis[at - 1] : undefined}
          />
          <div className="flex flex-wrap items-center gap-2">
            <StepButtons
              onFirst={() => useAuthor.getState().setPly(0)}
              onPrev={() => useAuthor.getState().setPly(ply - 1)}
              onNext={() => useAuthor.getState().setPly(ply + 1)}
              onLast={() => useAuthor.getState().setPly(length)}
              atStart={ply === 0}
              atEnd={ply >= length}
            />
            {branching === null ? (
              <Button
                variant="outline"
                onClick={() => useAuthor.getState().startBranch()}
                title="Start a new line from this position"
              >
                <GitBranch aria-hidden /> Branch here
              </Button>
            ) : (
              <Button variant="outline" onClick={() => useAuthor.getState().cancelBranch()}>
                <X aria-hidden /> Cancel the branch
              </Button>
            )}
            {mine && ply >= line.startPly && (
              <Button
                variant="outline"
                onClick={() => void useAuthor.getState().setSnapshot(ply === length ? undefined : ply)}
                title="Use this position as the line's picture"
              >
                <Camera aria-hidden /> Picture the line here
              </Button>
            )}
            {mine && ply < length && ply >= line.startPly && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Scissors aria-hidden /> Delete the moves after this
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete the last {length - ply} moves of this line?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Their notes go with them, and any line that branches from them will no longer fit. Undo brings
                      them back.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep them</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void useAuthor.getState().truncate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {branching !== null
              ? `Play the first move of the new line, after ${branching === 0 ? 'the start' : numberedMove(branching - 1, moves[branching - 1]!.san)}.`
              : ply === length
                ? mine
                  ? 'Play a move on the board to add it to the line.'
                  : 'This line is not yours: branch from it to write your own.'
                : 'Play the next move, or step with the arrows. Choose Branch here to play a different move.'}
          </p>
        </div>

        <div className="grid content-start gap-4">
          <MoveList
            sans={moves.map((move) => move.san)}
            startPly={line.startPly}
            ply={ply}
            snapshot={snapshot ?? length}
            tags={moves.map((move) => move.tags ?? [])}
          />
          {ply > 0 && (
            <MoveNote
              key={`${lineId}:${ply}`}
              label={numberedMove(ply - 1, moves[ply - 1]!.san)}
              comment={moves[ply - 1]!.comment ?? ''}
              tags={moves[ply - 1]!.tags ?? []}
              editable={mine && ply - 1 >= line.startPly}
              owner={line.parents.at(-1)}
              fixed={explainedElsewhere}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** The line's moves, numbered: the ones before its start dimmed, the picture marked; a move shows its position. */
function MoveList({
  sans,
  startPly,
  ply,
  snapshot,
  tags,
}: {
  sans: string[];
  startPly: number;
  ply: number;
  snapshot: number;
  tags: string[][];
}) {
  if (sans.length === 0) return <p className="text-sm text-muted-foreground">No moves yet.</p>;
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-1 font-mono text-sm" aria-label="The line">
      {sans.map((san, i) => (
        <li key={i}>
          <Button
            variant={i + 1 === ply ? 'secondary' : 'ghost'}
            size="xs"
            className={`h-auto px-1 font-mono ${i < startPly ? 'text-muted-foreground' : ''} ${i + 1 === snapshot ? 'underline decoration-dotted underline-offset-4' : ''}`}
            onClick={() => useAuthor.getState().setPly(i + 1)}
            title={i + 1 === snapshot ? 'The line is pictured here' : undefined}
          >
            {runMove(i, san, i === 0)}
            {tags[i]!.map((tag) => (
              <Badge key={tag} variant="outline" className="ml-1 px-1 py-0 font-sans text-[10px]">
                {tag}
              </Badge>
            ))}
          </Button>
        </li>
      ))}
    </ol>
  );
}

/** The note on a move: free text and supplementary tags (tip, trap, blunder or your own), shown to learners. */
function MoveNote({
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

/** The line's title, description, kind and group. Deleting it asks first. */
function LineDetails({ course }: { course: DraftCourse }) {
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
              {KINDS.map((option) => (
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
