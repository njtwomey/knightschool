import { isOwnOpening, ownOpeningId, type Side } from '@knightschool/core';
import { Plus, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useBrowse } from '@/features/browse/store';
import { GroupActions } from './group-actions';
import { entryId, entrySection, useDraft } from './helpers';
import { createHref } from './tabs';
import { useGlossary } from '@/features/glossary/use-glossary';
import { navigate } from '@/router/location';
import { fullLine, useAuthor, type DraftCourse } from './store';

const FROM_START = '__start';

/** The app's openings a course can add to (not the "My courses" groups), with the first ECO code of each. */
function useOpenings() {
  const openings = useBrowse((state) => state.openings);
  return openings
    .filter((opening) => !isOwnOpening(opening.id))
    .map((opening) => ({ id: opening.id, name: opening.name, eco: opening.eco?.slice(0, 3) ?? '' }));
}

/** Where a course belongs: on its own ("My courses"), the default, or adding to one of the app's openings. */
function OpeningSelect({
  value,
  onChange,
  id,
  side,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
  side: Side;
}) {
  const openings = useOpenings();
  return (
    <Select value={isOwnOpening(value) ? ownOpeningId(side) : value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ownOpeningId(side)}>A course of its own (My courses)</SelectItem>
        <SelectSeparator />
        {openings.map((opening) => (
          <SelectItem key={opening.id} value={opening.id}>
            {opening.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Starts a course: its name, the side you play and the opening it is about. It begins with an empty main line. */
export function NewCourseDialog({ compact = false }: { compact?: boolean }) {
  const openings = useOpenings();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [side, setSide] = useState<Side>('white');
  const [opening, setOpening] = useState<string | null>(null);
  const chosen = openings.find((candidate) => candidate.id === opening);
  const [from, setFrom] = useState(FROM_START);
  // The lines of the app's courses in that opening, for your side, to carry on from.
  const index = useBrowse((state) => state.index);
  const lines = index
    .filter((course) => course.opening === opening && course.side === side)
    .flatMap((course) =>
      course.lines.filter((line) => line.kind === 'line').map((line) => ({ ...line, course: course.name })),
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={compact ? 'sm' : 'default'} className={compact ? undefined : 'justify-self-start'}>
          <Plus aria-hidden /> New course
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New course</DialogTitle>
          <DialogDescription>A course of its own, starting with an empty main line for you to play.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="new-course-name">Name</Label>
            <Input id="new-course-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>You play</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={side}
              onValueChange={(value) => value && setSide(value as Side)}
              className="justify-self-start"
            >
              <ToggleGroupItem value="white">White</ToggleGroupItem>
              <ToggleGroupItem value="black">Black</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {opening === null ? (
            <Button
              variant="link"
              className="h-auto justify-self-start p-0"
              onClick={() => setOpening(ownOpeningId(side))}
            >
              Or add a missing line to an opening the app has
            </Button>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="new-course-opening">It belongs to</Label>
              <OpeningSelect
                id="new-course-opening"
                value={opening}
                onChange={(value) => {
                  setOpening(value);
                  setFrom(FROM_START);
                }}
                side={side}
              />
            </div>
          )}
          {lines.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="new-course-from">Starting from</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger id="new-course-from" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FROM_START}>The first move</SelectItem>
                  <SelectSeparator />
                  {lines.map((line) => (
                    <SelectItem key={`${line.course}:${line.id}`} value={line.id}>
                      The end of {line.name} ({line.course})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              setOpen(false);
              const own = opening === null || isOwnOpening(opening);
              void useAuthor
                .getState()
                .createCourse({
                  name,
                  side,
                  opening: own ? undefined : opening,
                  eco: chosen?.eco,
                  from: !own && from !== FROM_START ? from : undefined,
                })
                .then((id) => id && navigate(createHref(id)));
              setName('');
              setOpening(null);
              setFrom(FROM_START);
            }}
          >
            Make the course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The Details tab: the course's name, side (while no line has moves), tier, opening, summary and introduction, plans,
 * motifs, and its groups of lines. Saved together; deleting asks first.
 */
export function CourseForm({ course }: { course: DraftCourse }) {
  const { manifest } = course;
  const build = useAuthor((state) => state.build);
  const glossary = useGlossary();
  const [name, setName] = useDraft(manifest.name);
  const [opening, setOpening] = useDraft(manifest.opening);
  const [tier, setTier] = useDraft(String(manifest.tier));
  const [summary, setSummary] = useDraft(manifest.summary);
  const [idea, setIdea] = useDraft(manifest.about.idea);
  const [risks, setRisks] = useDraft(manifest.about.risks);
  const [suits, setSuits] = useDraft(manifest.about.suits);
  const [plans, setPlans] = useDraft((manifest.plans ?? []).join('\n'));
  const [motifs, setMotifs] = useDraft(manifest.motifs ?? []);
  const groups = [...new Set(manifest.lines.map(entrySection).filter((group): group is string => Boolean(group)))];
  // The side can change only while no line has a move: every move is written for one side.
  const played = manifest.lines.some((entry) => {
    const line = fullLine(build, entryId(entry));
    return line && line.game.moves.length > line.startPly;
  });
  const field = (id: string, label: string, value: string, set: (value: string) => void, long = false) => (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {long ? (
        <Textarea id={id} value={value} onChange={(event) => set(event.target.value)} rows={3} />
      ) : (
        <Input id={id} value={value} onChange={(event) => set(event.target.value)} />
      )}
    </div>
  );
  return (
    <div className="grid max-w-3xl gap-4">
      {field('course-name', 'Name', name, setName)}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>You play</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            value={manifest.side}
            disabled={played}
            onValueChange={(value) => value && void useAuthor.getState().setSide(value as Side)}
            className="justify-self-start"
            title={
              played ? 'Every move is written for one side, so the side is fixed once a line has moves.' : undefined
            }
          >
            <ToggleGroupItem value="white">White</ToggleGroupItem>
            <ToggleGroupItem value="black">Black</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-tier">Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger id="course-tier" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Study first</SelectItem>
              <SelectItem value="2">Study next</SelectItem>
              <SelectItem value="3">Alternative or rare</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="course-opening">It belongs to</Label>
          <OpeningSelect id="course-opening" value={opening} onChange={setOpening} side={manifest.side} />
        </div>
      </div>
      {field('course-summary', 'Summary: what the opening is and what the course covers', summary, setSummary, true)}
      {field('course-idea', 'The idea: why you play it', idea, setIdea, true)}
      {field('course-risks', 'The risks: what can go wrong', risks, setRisks, true)}
      {field('course-suits', 'Who it suits', suits, setSuits, true)}
      {field('course-plans', 'Plans to remember, one on each line', plans, setPlans, true)}
      {glossary && glossary.length > 0 && (
        <div className="grid gap-1.5">
          <Label>Ideas in the course</Label>
          <ToggleGroup
            type="multiple"
            variant="outline"
            size="sm"
            value={motifs}
            onValueChange={setMotifs}
            className="flex flex-wrap justify-start"
            aria-label="Motifs"
          >
            {glossary.map((entry) => (
              <ToggleGroupItem key={entry.id} value={entry.id} title={entry.summary}>
                {entry.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() =>
            void useAuthor.getState().setCourseMeta({
              name: name.trim() || manifest.name,
              opening,
              tier: Number(tier) as 1 | 2 | 3,
              summary: summary.trim() || manifest.summary,
              about: {
                ...manifest.about,
                idea: idea.trim() || 'Not written yet.',
                risks: risks.trim() || 'Not written yet.',
                suits: suits.trim() || 'Not written yet.',
              },
              plans: plans
                .split('\n')
                .map((plan) => plan.trim())
                .filter(Boolean),
              motifs,
            })
          }
        >
          Save the details
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <Trash2 aria-hidden /> Delete the course
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {manifest.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Its lines go with it, unless another of your courses lists them. Undo brings it all back.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep it</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void useAuthor
                    .getState()
                    .deleteCourse(course.id)
                    .then(() => navigate('/create'))
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <section className="grid gap-2" aria-labelledby="groups-heading">
        <h3 id="groups-heading" className="font-semibold">
          Groups
        </h3>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No groups yet. Put a line in a group from its page; the course page then shows its lines under the groups.
          </p>
        ) : (
          <ul className="grid gap-1">
            {groups.map((group) => (
              <li key={group} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
                <span>
                  {group}{' '}
                  <span className="text-muted-foreground">
                    ({manifest.lines.filter((entry) => entrySection(entry) === group).length} lines)
                  </span>
                </span>
                <GroupActions name={group} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
