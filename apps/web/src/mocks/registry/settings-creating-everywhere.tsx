import { fenToEpd, numberedMove, type Marks } from '@knightschool/core';
import { BookOpen, Copy, GraduationCap, Pencil, Play, Trash2 } from 'lucide-react';
import { useCallback, useState, type ReactNode } from 'react';
import { MarksEditor, type MarkSet } from '@/components/create/marks-editor';
import { MoveNoteEditor, type MoveNote } from '@/components/create/move-note-editor';
import { PgnImport } from '@/components/create/pgn-import';
import { ProblemsList, type Problem } from '@/components/create/problems-list';
import { PuzzlePicker, type PuzzleFilters, type PuzzleMatch } from '@/components/create/puzzle-picker';
import { RefutationEditor, type Refutation, type RefutationJudgement } from '@/components/create/refutation-editor';
import { StepEditor, type Step, type StepMove } from '@/components/create/step-editor';
import { UndoButton } from '@/components/create/undo-button';
import { StateBadge } from '@/components/progress/state-badge';
import { PresetPicker } from '@/components/settings/preset-picker';
import {
  matchesSetting,
  SETTINGS,
  valueLabel,
  type LayerValues,
  type SettingGroupId,
  type SettingValue,
  type WritableLayer,
} from '@/components/settings/registry';
import { SettingInline } from '@/components/settings/setting-inline';
import { SettingsGroup } from '@/components/settings/settings-group';
import { SettingsRow } from '@/components/settings/settings-row';
import { Breadcrumbs, type CrumbSibling } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Hint } from '@/components/shared/hint';
import { IconAction } from '@/components/shared/icon-action';
import { Notice } from '@/components/shared/notice';
import { PageShell } from '@/components/shared/page-shell';
import { PAUSED_REASON } from '@/components/shared/paused';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { Idea } from '@/components/chess/idea-badge';
import { MarkKey } from '@/components/chess/mark-key';
import { PUZZLE_IDEAS } from '../fixtures/ideas';
import { example, explorerMoves, gamesAt, engineLines, judgeAgainstLine, line, mainLine } from '../fixtures/example';
import type { MockItem } from './types';

const m = mainLine.moves;
/** Links in the mocks stay on this page. */
const here = (id: string) => `/mocks#${id}`;

// ---------------------------------------------------------------------------------------------------------------
// Settings: a small stand-in for use-setting, with saved notices and Undo.

type Layered = { presetId: string; layers: LayerValues };

function useSettingsState(initial: Layered, layer: WritableLayer = 'you') {
  const [state, setState] = useState<Layered>(initial);
  const [history, setHistory] = useState<{ before: Layered; label: string }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const commit = useCallback(
    (next: Layered, label: string, text: string) => {
      setHistory((old) => [...old, { before: state, label }]);
      setState(next);
      setNotice(text);
    },
    [state],
  );

  const write = (key: string, value: SettingValue | undefined) => {
    const own = { ...(state.layers[layer] ?? {}) };
    if (value === undefined) delete own[key];
    else own[key] = value;
    return { ...state, layers: { ...state.layers, [layer]: own } };
  };

  const onChange = (key: string, value: SettingValue) => {
    const def = SETTINGS[key]!;
    const shown = def.control.kind === 'secret' ? (value ? 'saved' : 'cleared') : valueLabel(def, value);
    commit(write(key, value), `${def.label} ${shown}`, `${def.label} set to ${shown}.`);
  };
  const onReset = (key: string) => {
    const def = SETTINGS[key]!;
    commit(write(key, undefined), `reset ${def.label}`, `${def.label} reset.`);
  };
  const onResetGroup = (keys: string[]) => {
    const own = { ...(state.layers[layer] ?? {}) };
    for (const key of keys) delete own[key];
    commit(
      { ...state, layers: { ...state.layers, [layer]: own } },
      `reset ${keys.length} settings`,
      `${keys.length} settings reset.`,
    );
  };
  const onPick = (presetId: string) => {
    const name = presetId.replace(/-/g, ' ');
    commit({ ...state, presetId }, `preset ${name}`, `Preset set to ${name.replace(/^./, (c) => c.toUpperCase())}.`);
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setState(last.before);
    setHistory(history.slice(0, -1));
    setNotice(`Took back: ${last.label}.`);
  };

  const noticeNode = notice ? (
    <Notice
      kind="saved"
      text={notice}
      action={
        history.length > 0 && !notice.startsWith('Took back') ? (
          <UndoButton size="sm" label={history[history.length - 1]!.label} onUndo={undo} />
        ) : null
      }
      onDismiss={() => setNotice(null)}
      onExpire={() => setNotice(null)}
    />
  ) : (
    <div className="h-10" aria-hidden />
  );

  return { ...state, onChange, onReset, onResetGroup, onPick, undo, history, notice: noticeNode, layer };
}

function RowDemo({
  keys,
  initial = { presetId: 'club', layers: {} },
  layer = 'you',
  density = 'full',
  highlight,
  disabledReason,
}: {
  keys: string[];
  initial?: Layered;
  layer?: WritableLayer;
  density?: 'full' | 'compact';
  highlight?: string;
  disabledReason?: string;
}) {
  const s = useSettingsState(initial, layer);
  return (
    <div className="grid max-w-3xl gap-2">
      {s.notice}
      <div className={density === 'compact' ? 'max-w-sm divide-y rounded-lg border px-3' : 'divide-y'}>
        {keys.map((key) => (
          <SettingsRow
            key={key}
            setting={key}
            layers={s.layers}
            presetId={s.presetId}
            layer={layer}
            onChange={s.onChange}
            onReset={s.onReset}
            density={density}
            highlight={highlight}
            disabledReason={disabledReason}
          />
        ))}
      </div>
    </div>
  );
}

function GroupDemo({
  groups,
  initial = { presetId: 'club', layers: {} },
  level = 'basic',
  query: startQuery,
  search = false,
  collapsible = false,
}: {
  groups: SettingGroupId[];
  initial?: Layered;
  level?: 'basic' | 'all';
  query?: string;
  search?: boolean;
  collapsible?: boolean;
}) {
  const s = useSettingsState(initial);
  const [query, setQuery] = useState(startQuery ?? '');
  const anyMatch = Object.values(SETTINGS).some((def) => groups.includes(def.group) && matchesSetting(def, query));
  return (
    <div className="grid max-w-3xl gap-3">
      {search ? (
        <Input
          value={query}
          placeholder="Search settings: delay, rare, token"
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
          aria-label="Search settings"
        />
      ) : null}
      {s.notice}
      {groups.map((group) => (
        <SettingsGroup
          key={group}
          group={group}
          layers={s.layers}
          presetId={s.presetId}
          level={level}
          query={query}
          collapsible={collapsible}
          onChange={s.onChange}
          onReset={s.onReset}
          onResetGroup={s.onResetGroup}
        />
      ))}
      {query && !anyMatch ? (
        <EmptyState
          kind="no-match"
          text={`No setting matches “${query}”. Try another word, or show Advanced.`}
          action={{ label: 'Clear the search', onClick: () => setQuery('') }}
        />
      ) : null}
    </div>
  );
}

function PresetDemo({
  initial = { presetId: 'club', layers: {} },
  variant,
  onboarding,
  materialNote,
}: {
  initial?: Layered;
  variant?: 'cards' | 'select';
  onboarding?: boolean;
  materialNote?: string;
}) {
  const s = useSettingsState(initial);
  const own = Object.keys(s.layers.you ?? {}).length;
  return (
    <div className="grid gap-3">
      {onboarding ? null : s.notice}
      <PresetPicker
        value={s.presetId}
        layers={s.layers}
        variant={variant}
        onboarding={onboarding}
        materialNote={materialNote}
        onPick={s.onPick}
        onChange={s.onChange}
        onReset={s.onReset}
      />
      {own > 0 && !onboarding ? (
        <p className="text-xs text-muted-foreground">
          Picking another preset keeps your {own} own {own === 1 ? 'choice' : 'choices'}; the real notice offers “Clear
          my {own} {own === 1 ? 'change' : 'changes'} too”.
        </p>
      ) : null}
    </div>
  );
}

function InlineDemo({
  setting,
  prompt,
  layer = 'you',
  savedText,
  initial = { presetId: 'club', layers: {} },
}: {
  setting: string;
  prompt: string;
  layer?: WritableLayer;
  savedText?: (value: string) => string;
  initial?: Layered;
}) {
  const s = useSettingsState(initial, layer);
  const [saved, setSaved] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) {
    return (
      <Button variant="outline" size="sm" onClick={() => setHidden(false)}>
        Not now was pressed: show it again
      </Button>
    );
  }
  return (
    <div className="grid max-w-2xl gap-2">
      {saved ? s.notice : null}
      <SettingInline
        setting={setting}
        prompt={prompt}
        layers={s.layers}
        presetId={s.presetId}
        layer={layer}
        saved={saved}
        savedText={savedText}
        onChange={(key, value) => {
          s.onChange(key, value);
          setSaved(true);
        }}
        onReset={(key) => {
          s.onReset(key);
          setSaved(true);
        }}
        onNotNow={() => setHidden(true)}
        moreHref={here('settings-group')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Creating: the Italian example.

const IDEAS: Idea[] = [
  {
    id: 'f7-weakness',
    name: 'The weak f7 square',
    kind: 'tactic',
    summary: 'At the start only the king guards f7, so it is the first target.',
  },
  {
    id: 'centre',
    name: 'Control the centre',
    kind: 'principle',
    summary: 'Pawns and pieces on e4, d4, e5 and d5 give your pieces room.',
  },
  {
    id: 'development',
    name: 'Develop before you attack',
    kind: 'principle',
    summary: 'Bring out knights and bishops before moving a piece twice.',
  },
  {
    id: 'castling',
    name: 'Castle early',
    kind: 'principle',
    summary: 'Get the king out of the centre before it opens.',
  },
  { id: 'fork', name: 'Fork', kind: 'tactic', summary: 'One piece attacks two at once.' },
  {
    id: 'pin',
    name: 'Pin',
    kind: 'tactic',
    summary: 'A piece cannot move without exposing a more valuable one behind it.',
  },
  {
    id: 'd4-break',
    name: 'The d4 break',
    kind: 'plan',
    summary: 'With c3 in, White opens the centre with d4 when the pieces are ready.',
  },
  {
    id: 'fianchetto',
    name: 'Fianchetto',
    kind: 'structure',
    summary: 'A bishop on the long diagonal from g2, b2, g7 or b7.',
  },
];

const noteOf = (i: number, extra: Partial<MoveNote> = {}): MoveNote => ({
  comment: m[i]!.note?.text ?? '',
  symbol: '',
  ideas: [],
  tags: [],
  ...extra,
});

function NoteDemo({
  index,
  initial,
  owner,
  editable,
}: {
  index: number;
  initial: MoveNote;
  owner?: { name: string; href?: string };
  editable?: boolean;
}) {
  const [note, setNote] = useState(initial);
  const [last, setLast] = useState<string | null>(null);
  const move = m[index]!;
  return (
    <div className="grid max-w-xl gap-3">
      {last ? (
        <Notice kind="saved" text={`Saved: ${last}.`} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing saved yet: edit, then leave the box.</p>
      )}
      <MoveNoteEditor
        move={{ ply: index, san: move.san, epd: move.after, uci: move.uci }}
        lineName={mainLine.name}
        note={note}
        owner={owner}
        editable={editable}
        ideas={IDEAS}
        context={{ startEpd: m[0]!.before, moves: m }}
        side="white"
        onRefute={() => setLast('opened the refutation editor')}
        onSave={(next, label) => {
          setNote(next);
          setLast(label);
        }}
      />
    </div>
  );
}

const asMarkSet = (marks: Partial<Marks> | undefined): MarkSet => ({
  arrows: marks?.arrows ?? [],
  circles: marks?.circles ?? [],
});

function MarksDemo({
  index,
  initial,
  editable = true,
  orientation = 'white',
  tap = true,
}: {
  index: number;
  initial: MarkSet;
  editable?: boolean;
  orientation?: 'white' | 'black';
  tap?: boolean;
}) {
  const [marks, setMarks] = useState(initial);
  const [last, setLast] = useState<string | null>(null);
  const move = m[index]!;
  return (
    <div className="grid max-w-xl gap-3">
      <MarksEditor
        epd={move.after}
        lastMove={{ from: move.uci.slice(0, 2), to: move.uci.slice(2, 4) }}
        moveName={numberedMove(index, move.san)}
        marks={marks}
        editable={editable}
        owner={editable ? undefined : 'Giuoco Piano, 3...d6'}
        orientation={orientation}
        tapToDraw={tap}
        onChange={(next, label) => {
          setMarks(next);
          setLast(label);
        }}
      />
      <p className="font-mono text-xs text-muted-foreground">
        {last ? `${last}: ` : ''}
        {[
          marks.arrows.length ? `[%cal ${marks.arrows.join(',')}]` : '',
          marks.circles.length ? `[%csl ${marks.circles.join(',')}]` : '',
        ]
          .filter(Boolean)
          .join(' ') || 'No marks in the comment.'}
      </p>
    </div>
  );
}

// The refutation editor at 2...?: Black to move after 1.e4 e5 2.Nf3, the example's position with the most explorer moves.
const refBase = m[3]!;
const refTotal = gamesAt(refBase.before) ?? 1;
const refCommon = explorerMoves(refBase.before)
  .filter((move) => move.uci !== refBase.uci)
  .map((move) => ({ uci: move.uci, san: move.san, share: move.games / refTotal }));
/** Where the example has no evaluation, a stand-in judgement so the editor can be tried. */
const STAND_IN: Record<string, RefutationJudgement> = {
  d8f6: { grade: 'inaccuracy', costCp: 70, bestReply: 'b1c3' },
  d7d5: { grade: 'mistake', costCp: 140, bestReply: 'e4d5' },
  f7f6: { grade: 'mistake', costCp: 180, bestReply: 'f3e5' },
};
function judgeRef(uci: string, after: string): RefutationJudgement {
  const judged = judgeAgainstLine(refBase, { uci, after });
  if (!judged) return STAND_IN[uci] ?? null;
  return { grade: judged.grade, costCp: Math.max(0, judged.cost.cp), bestReply: engineLines(after)[0]?.pv[0] };
}
const REFUTATIONS: Refutation[] = [
  {
    id: 'r-bc5',
    uci: 'f8c5',
    san: 'Bc5',
    symbol: '?',
    why: 'Leaves e5 without a guard: 3.Nxe5 wins a pawn, and 3...Bxf2+ 4.Kxf2 only gives the bishop away.',
    ideas: ['development'],
    punishment: ['f3e5', 'c5f2', 'e1f2'],
  },
];

function RefutationDemo({
  startWith,
  editing,
  initial = REFUTATIONS,
}: {
  startWith?: string;
  editing?: string;
  initial?: Refutation[];
}) {
  const [refutations, setRefutations] = useState(initial);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {last ? <Notice kind="saved" text={`Saved: ${last}.`} onDismiss={() => setLast(null)} /> : null}
      <RefutationEditor
        epd={refBase.before}
        ply={3}
        lineName={mainLine.name}
        side="white"
        refutations={refutations}
        common={refCommon}
        judge={judgeRef}
        ideas={IDEAS}
        startWith={startWith}
        editing={editing}
        onBranch={(uci) => setLast(`branch here with ${uci}`)}
        onSave={(refutation, label) => {
          setRefutations([...refutations.filter((r) => r.id !== refutation.id), refutation]);
          setLast(label);
        }}
        onDelete={(id, label) => {
          setRefutations(refutations.filter((r) => r.id !== id));
          setLast(label);
        }}
      />
    </div>
  );
}

// Steps over the main line: the automatic cut, about three of White's moves each here.
const stepMoves: StepMove[] = m.map((move) => ({
  san: move.san,
  uci: move.uci,
  after: move.after,
  before: move.before,
}));
const AUTO = [
  { first: 0, last: 5 },
  { first: 6, last: 11 },
  { first: 12, last: 15 },
];
const STEPS: Step[] = [
  {
    id: 'gp:1',
    name: 'Aim at f7',
    text: 'White takes the centre, develops the knight with a threat and points the bishop at f7, the square only the king defends.',
    ...AUTO[0]!,
    ideas: ['f7-weakness'],
  },
  { id: 'gp:2', ...AUTO[1]! },
  { id: 'gp:3', ...AUTO[2]! },
];
const STEP_PROBLEMS: Problem[] = [
  {
    id: 'p-step2',
    level: 'bar',
    about: { itemId: 'gp:2', kind: 'step', name: 'Step 2' },
    what: 'has no text.',
    fix: 'Write two to four sentences, or leave it automatic.',
  },
];
const firstMatchLevel = (i: number): PuzzleMatch['level'] =>
  (['variation', 'variation', 'family', 'variation', 'family', 'structure', 'idea', 'family'] as const)[i] ?? 'family';
const PUZZLES: PuzzleMatch[] = example.puzzles.map((puzzle, i) => ({
  id: puzzle.id,
  fen: puzzle.fen,
  moves: puzzle.moves,
  rating: puzzle.rating,
  themes: puzzle.themes.filter((theme) => !['opening', 'middlegame', 'short', 'long'].includes(theme)),
  level: firstMatchLevel(i),
  solver: fenToEpd(puzzle.fen).split(' ')[1] === 'b' ? 'you' : 'them',
  plies: 8 + i * 3,
  how:
    firstMatchLevel(i) === 'variation'
      ? `From a game in the ${puzzle.openingTags[1]?.replace(/^Italian_Game_/, '').replace(/_/g, ' ')}, ${8 + i * 3} plies after the step.`
      : `From a game in the Italian Game family.`,
  url: `https://lichess.org/training/${puzzle.id}`,
  usedIn: i === 2 ? 'step 1' : undefined,
}));

function PuzzleDemo({
  defaults,
  chosen: start = [],
  max = 3,
  target = 'step 3',
}: {
  defaults: PuzzleFilters;
  chosen?: string[];
  max?: number;
  target?: string;
}) {
  const [chosen, setChosen] = useState(start);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {last ? <Notice kind="saved" text={`Saved: ${last}.`} onDismiss={() => setLast(null)} /> : null}
      <PuzzlePicker
        targetName={target}
        matches={PUZZLES}
        ideas={PUZZLE_IDEAS}
        chosen={chosen}
        max={max}
        defaults={defaults}
        onChange={(next, label) => {
          setChosen(next);
          setLast(label);
        }}
      />
    </div>
  );
}
const PUZZLE_DEFAULTS: PuzzleFilters = {
  level: 'variation',
  solver: 'either',
  soon: 'any',
  rating: [600, 1800],
  themes: [],
};

function StepDemo() {
  const [steps, setSteps] = useState(STEPS);
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {last ? (
        <Notice kind="saved" text={`Saved: ${last}.`} />
      ) : (
        <p className="text-sm text-muted-foreground">Every change saves as one undoable action.</p>
      )}
      <StepEditor
        variationName="Giuoco Piano, main line"
        moves={stepMoves}
        side="white"
        steps={steps}
        auto={AUTO}
        ideas={IDEAS}
        problems={STEP_PROBLEMS}
        suggestedIdeas={(step) =>
          step.first <= 4
            ? ['centre', 'f7-weakness', 'development']
            : step.first <= 11
              ? ['d4-break', 'castling']
              : ['castling']
        }
        stageFeeds={(step) => ({
          read: step.text ? 'Its text and key position' : null,
          watch: `${Math.ceil((step.last - step.first + 1) / 2)} of your moves, each shown first`,
          try: 'The same moves from memory',
          mistakes: step.first === 0 ? '1 refutation in this stretch: 2...Bc5?' : null,
          done: 'Joins your reviews',
        })}
        puzzles={(step) => (
          <PuzzleDemo
            key={step.id}
            target={`step ${steps.indexOf(step) + 1}`}
            defaults={PUZZLE_DEFAULTS}
            chosen={step.id === 'gp:1' ? ['pH6Ye'] : []}
          />
        )}
        onChange={(next, label) => {
          setSteps(next);
          setLast(label);
        }}
      />
    </div>
  );
}

const SAMPLE_PGN = `[Event "Italian study: Two Knights, 4.Ng5"]
[ChapterName "Two Knights, 4.Ng5"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 { Points the bishop at f7. [%cal Gc4f7] } 3... Nf6 4. Ng5 d5 5. exd5 Na5 { The main line: Black gives the pawn back for time. } (5... Nxd5?! { Natural, but it walks into the Fried Liver. } 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3) (5... b5 { The Ulvestad. } 6. Bf1) 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4 10. Ne5 *

[Event "Italian study: Giuoco Piano with 4.c3"]
[ChapterName "Giuoco Piano, 4.c3"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 { Ready for d4. } 4... Nf6 5. d4 exd4 6. e5 d5 7. Bb5 Ne4 8. cxd4 Bb4+ 9. Bd2 Bxd2+ 10. Nbxd2 Nxd2 11. Qxd2 O-O 12. Kxd8 *`;

function ImportDemo({
  target,
  initialText,
  offline,
}: {
  target?: { id: string; name: string; side: 'white' | 'black' };
  initialText?: string;
  offline?: boolean;
}) {
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {last ? (
        <Notice
          kind="saved"
          text="Imported."
          action={<UndoButton size="sm" label={last} onUndo={() => setLast(null)} />}
          onDismiss={() => setLast(null)}
        />
      ) : null}
      <PgnImport
        target={target}
        openings={[
          { id: 'italian', name: 'Italian Game', side: 'white' },
          { id: 'my-caro', name: 'My Caro-Kann', side: 'black' },
        ]}
        initialText={initialText}
        offline={offline}
        existingComment={(before, uci) =>
          m.find((move) => move.before === before && move.uci === uci)?.note?.text ?? null
        }
        joinsAt={(ucis) => {
          let same = 0;
          while (same < ucis.length && ucis[same] === m[same]?.uci) same++;
          if (same === 0) return null;
          return same >= ucis.length
            ? `already in ${mainLine.name}`
            : `starts after ${numberedMove(same - 1, m[same - 1]!.san)} in ${mainLine.name}`;
        }}
        onImport={(_rows, _into, label) => setLast(label)}
      />
    </div>
  );
}

function UndoDemo() {
  const [actions, setActions] = useState(['add the line 4.c3', 'rename step 3', 'delete line 2...Bc5']);
  const [took, setTook] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <UndoButton
          label={actions[actions.length - 1] ?? null}
          shortcut
          onUndo={() => {
            setTook(actions[actions.length - 1] ?? null);
            setActions(actions.slice(0, -1));
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => setActions([...actions, `move the end of step 2 to 6.c3`])}>
          Make a change
        </Button>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        {took ? `Took back: ${took}.` : 'Press Ctrl+Z (or Cmd+Z) with focus outside a text field.'}
      </p>
    </div>
  );
}

const PROBLEMS: Problem[] = [
  {
    id: 'b1',
    level: 'blocking',
    about: { itemId: 'fried-liver', kind: 'line', name: 'Fried Liver', href: here('problems-list') },
    what: '[Start] names a line that does not exist.',
    fix: 'Pick where it branches from again.',
  },
  {
    id: 'b2',
    level: 'blocking',
    about: { itemId: 'two-knights', kind: 'move', name: 'Two Knights', move: { ply: 7, san: 'Nf6', epd: m[7]!.after } },
    what: 'has two comments, one here and one in the shipped line Two Knights.',
    fix: 'Keep one.',
  },
  {
    id: 'b3',
    level: 'blocking',
    about: { itemId: 'giuoco-d5', kind: 'opening', name: 'The opening' },
    what: 'gives two answers at the position after 3...Nf6.',
    fix: 'Mark one line as an alternative.',
  },
  {
    id: 'c1',
    level: 'bar',
    about: { itemId: 'giuoco-main', kind: 'line', name: 'Giuoco Piano main' },
    what: '5 of your moves have no comment.',
  },
  {
    id: 'c2',
    level: 'bar',
    about: { itemId: 'giuoco-main', kind: 'move', name: 'Giuoco Piano main', move: { ply: 7, san: 'Nxe4' } },
    what: 'has no refutation, and is played in 18% of games.',
    fix: 'Write why it fails in the refutation editor.',
  },
  {
    id: 'w1',
    level: 'warning',
    about: { itemId: 'italian', kind: 'opening', name: 'Your White opening and your Black opening' },
    what: 'disagree after 1.e4 e5 2.Nf3.',
  },
];

// ---------------------------------------------------------------------------------------------------------------
// Everywhere.

const VARIATIONS: CrumbSibling[] = [
  {
    id: 'giuoco-piano',
    label: 'Giuoco Piano',
    href: here('breadcrumbs'),
    badge: <StateBadge state="learning" of="variation" size="dot" />,
  },
  {
    id: 'two-knights',
    label: 'Two Knights',
    href: here('breadcrumbs'),
    badge: <StateBadge state="open" of="variation" size="dot" />,
  },
  { id: 'evans', label: 'Evans Gambit', href: here('breadcrumbs'), locked: 'Opens when Giuoco Piano is known.' },
  {
    id: 'traps',
    label: 'Traps to know',
    href: here('breadcrumbs'),
    badge: <StateBadge state="known" of="variation" size="dot" />,
  },
];
const STEP_ITEMS: CrumbSibling[] = [
  { id: 's1', label: 'Step 1: Aim at f7', href: here('breadcrumbs'), badge: <StateBadge state="known" size="dot" /> },
  { id: 's2', label: 'Step 2', href: here('breadcrumbs'), badge: <StateBadge state="learning" size="dot" /> },
  { id: 's3', label: 'Step 3', href: here('breadcrumbs'), badge: <StateBadge state="open" size="dot" /> },
  { id: 's4', label: 'Step 4', href: here('breadcrumbs'), locked: 'Opens when Step 3 is known.' },
];
const OPENING_TABS = {
  label: 'Opening pages',
  value: 'steps',
  items: [
    { value: 'overview', label: 'Overview', href: here('breadcrumbs'), hint: 'The idea, the risks, who it suits' },
    { value: 'steps', label: 'Steps', href: here('breadcrumbs'), hint: 'Every step in study order' },
    { value: 'lines', label: 'Lines', href: here('breadcrumbs'), hint: 'Every line, by kind' },
    { value: 'map', label: 'Map', href: here('breadcrumbs'), hint: 'The opening as a tree' },
  ],
};
const stepTrail = (
  <Breadcrumbs
    root={{ label: 'Learn', href: here('breadcrumbs') }}
    crumbs={[
      { label: 'Italian Game (White)', href: here('breadcrumbs') },
      {
        label: 'Giuoco Piano',
        href: here('breadcrumbs'),
        siblings: { current: 'giuoco-piano', items: VARIATIONS, label: 'Every variation of the Italian Game' },
      },
      { label: 'Step 3', siblings: { current: 's3', items: STEP_ITEMS, label: 'Every step of Giuoco Piano' } },
    ]}
    previous={{ label: 'Step 2', href: here('breadcrumbs') }}
    next={{ label: 'Step 4', href: here('breadcrumbs') }}
  />
);

function Thrower(): ReactNode {
  throw new Error('The step’s moves could not be read: line giuoco-piano-main has no move 17.');
}

function ShellFrame({ children }: { children: ReactNode }) {
  return <div className="max-h-[32rem] overflow-y-auto rounded-lg border bg-background">{children}</div>;
}

function PausedDemo() {
  const [paused, setPaused] = useState(true);
  return (
    <ShellFrame>
      <PageShell
        title="Settings"
        showTitle
        documentTitle={false}
        paused={paused ? { onUseHere: () => setPaused(false) } : undefined}
        trail={<Breadcrumbs root={{ label: 'You', href: here('page-shell') }} crumbs={[{ label: 'Settings' }]} />}
      >
        <RowDemo keys={['review.newPerDay', 'feedback.hints']} disabledReason={paused ? PAUSED_REASON : undefined} />
      </PageShell>
    </ShellFrame>
  );
}

function SavedNoticeDemo() {
  const [shown, setShown] = useState(true);
  return shown ? (
    <Notice
      kind="saved"
      text="New moves a day set to 15."
      action={<UndoButton size="sm" label="New moves a day 15" onUndo={() => setShown(false)} />}
      onDismiss={() => setShown(false)}
      onExpire={() => setShown(false)}
    />
  ) : (
    <Button variant="outline" size="sm" onClick={() => setShown(true)}>
      Show it again (it goes after eight seconds)
    </Button>
  );
}

const legal = line('legal-mate').moves;

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <IconAction label={on ? 'Hide the moves' : 'Show the moves'} pressed={on} onClick={() => setOn(!on)}>
      <BookOpen aria-hidden />
    </IconAction>
  );
}

function NoMatch() {
  const [query, setQuery] = useState('scotch gambit black');
  return (
    <div className="grid gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
        aria-label="Search"
      />
      {query ? (
        <EmptyState
          kind="no-match"
          text={`Nothing matches “${query}”. Try fewer words or clear a filter.`}
          action={{ label: 'Clear filters', onClick: () => setQuery('') }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Every opening shows here.</p>
      )}
    </div>
  );
}

export const settingsCreatingEverywhereMocks: MockItem[] = [
  // Settings ------------------------------------------------------------------------------------------------------
  {
    id: 'settings-row',
    variants: [
      {
        name: 'A slider, from the preset',
        note: 'Drag it: the meaning updates as it moves, and it saves when let go, with Undo in the notice.',
        render: () => <RowDemo keys={['review.newPerDay']} />,
      },
      {
        name: 'Your own choice, with a reset',
        note: 'The reset names what it falls back to; hover it.',
        render: () => (
          <RowDemo
            keys={['review.newPerDay', 'feedback.speed']}
            initial={{ presetId: 'club', layers: { you: { 'review.newPerDay': 15, 'feedback.speed': 'slow' } } }}
          />
        ),
      },
      {
        name: 'Every kind of control',
        note: 'Switch, one-of-several, select, number and text, each drawn from its registry entry.',
        render: () => (
          <RowDemo
            keys={['feedback.hints', 'feedback.evalAfter', 'feedback.explain', 'engine.lines', 'lichess.username']}
          />
        ),
      },
      {
        name: 'Where it is kept',
        note: 'Device settings show a screen icon, the token a key; learner settings show nothing. Hover the icons.',
        render: () => <RowDemo keys={['board.coordinates', 'lichess.token', 'level.includeRare']} />,
      },
      {
        name: 'A bad value never saves',
        note: 'Type 9 in Engine lines: the range shows under the box and the last good value stays.',
        render: () => (
          <RowDemo keys={['engine.lines']} initial={{ presetId: 'club', layers: { you: { 'engine.lines': 3 } } }} />
        ),
      },
      {
        name: 'Set for this opening, and by its author',
        note: 'On an opening’s page the row writes the opening layer; the author’s suggestion sits below it.',
        render: () => (
          <RowDemo
            layer="opening"
            keys={['level.includeRare', 'review.newPerDay']}
            initial={{
              presetId: 'club',
              layers: { material: { 'level.includeRare': true }, opening: { 'review.newPerDay': 5 } },
            }}
          />
        ),
      },
      {
        name: 'This session, on the practice card',
        note: 'Compact: the hint is behind the label, the source shows when it is not the row’s own layer.',
        render: () => (
          <RowDemo
            layer="session"
            density="compact"
            keys={['feedback.hints', 'feedback.speed', 'review.movesPerQuestion']}
            initial={{ presetId: 'exam', layers: { session: { 'feedback.speed': 'fast' } } }}
          />
        ),
      },
      {
        name: 'Matching a search',
        note: 'The searched words are marked in the label and the hint.',
        render: () => <RowDemo keys={['feedback.speed', 'feedback.explain']} highlight="move" />,
      },
      {
        name: 'Paused by another tab',
        note: 'Readable, but the controls are disabled with the reason on hover.',
        render: () => <RowDemo keys={['review.newPerDay', 'feedback.hints']} disabledReason={PAUSED_REASON} />,
      },
    ],
  },
  {
    id: 'settings-group',
    variants: [
      {
        name: 'Feedback, basic',
        note: 'Basic rows only; the line at the end opens the advanced ones in place.',
        render: () => <GroupDemo groups={['feedback']} />,
      },
      {
        name: 'With your changes and the preset',
        note: 'Reset group takes back every row that differs, as one undoable change.',
        render: () => (
          <GroupDemo
            groups={['review', 'feedback']}
            level="all"
            initial={{ presetId: 'exam', layers: { you: { 'review.newPerDay': 20, 'feedback.speed': 'slow' } } }}
          />
        ),
      },
      {
        name: 'Saved on this device, kept in this browser',
        note: 'A group that shares one store says where it is kept.',
        render: () => <GroupDemo groups={['board', 'accounts']} level="all" />,
      },
      {
        name: 'Search',
        note: 'Rows match on label, hint, key and a few synonyms: try “delay”, “rare”, or “colour” for the empty state.',
        render: () => (
          <GroupDemo groups={['level', 'review', 'feedback', 'board', 'engine', 'accounts']} search query="delay" />
        ),
      },
      {
        name: 'Folding, as on a phone',
        note: 'Each group folds; the one the address names starts open.',
        render: () => <GroupDemo groups={['review', 'engine']} collapsible />,
      },
    ],
  },
  {
    id: 'preset-picker',
    variants: [
      {
        name: 'Four cards',
        note: 'Hover or focus another card for what picking it would change; arrow keys move, Space picks.',
        render: () => <PresetDemo />,
      },
      {
        name: 'With changes of your own',
        note: 'The chosen card says so, and “Show them” lists them as compact rows with their resets.',
        render: () => (
          <PresetDemo
            initial={{
              presetId: 'club',
              layers: { you: { 'review.newPerDay': 15, 'feedback.hints': false, 'feedback.speed': 'fast' } },
            }}
          />
        ),
      },
      {
        name: 'Onboarding',
        note: 'No “what changes” list, since nothing is set yet; the first answer preselects one.',
        render: () => <PresetDemo onboarding initial={{ presetId: 'getting-started', layers: {} }} />,
      },
      {
        name: 'An author’s suggestion stays',
        render: () => (
          <PresetDemo materialNote="The Italian Game’s author includes its rare lines; a preset never changes that." />
        ),
      },
      {
        name: 'As a select, for narrow places',
        render: () => (
          <PresetDemo variant="select" initial={{ presetId: 'club', layers: { you: { 'review.newPerDay': 15 } } }} />
        ),
      },
    ],
  },
  {
    id: 'setting-inline',
    variants: [
      {
        name: 'End of a step: too fast?',
        note: 'Shown by the page after quick misses; change it to see the saved line and the notice.',
        render: () => (
          <InlineDemo
            setting="feedback.speed"
            prompt="Too fast? Slow the feedback down"
            savedText={(value) => `Saved. Feedback is now ${value} everywhere.`}
          />
        ),
      },
      {
        name: 'Today’s due card: too many reviews?',
        render: () => <InlineDemo setting="review.newPerDay" prompt="40 reviews due. Fewer new moves a day?" />,
      },
      {
        name: 'On an opening’s page',
        note: 'Writes the opening layer: the saved line says “for this opening”.',
        render: () => (
          <InlineDemo setting="level.includeRare" layer="opening" prompt="Sharp opening. Include its rare lines?" />
        ),
      },
    ],
  },
  // Creating ------------------------------------------------------------------------------------------------------
  {
    id: 'move-note-editor',
    variants: [
      {
        name: 'Your own move',
        note: 'The comment saves when you leave the box; symbol, ideas and tags save at once. Try ? to see it refused.',
        render: () => <NoteDemo index={6} initial={noteOf(6, { ideas: ['d4-break'], tags: ['tip'] })} />,
      },
      {
        name: 'Comment written in another line',
        note: 'One comment per move across the site: read-only here, with its owner; ideas and tags can still be added.',
        render: () => (
          <NoteDemo
            index={9}
            initial={noteOf(9)}
            owner={{ name: 'Giuoco Piano, 3...d6', href: here('move-note-editor') }}
          />
        ),
      },
      {
        name: 'A shipped line seen in Create',
        render: () => <NoteDemo index={4} initial={noteOf(4, { ideas: ['f7-weakness'] })} editable={false} />,
      },
      {
        name: 'No note yet',
        render: () => <NoteDemo index={12} initial={{ comment: '', symbol: '', ideas: [], tags: [] }} />,
      },
    ],
  },
  {
    id: 'marks-editor',
    variants: [
      {
        name: 'Tap to draw, with a mark',
        note: '3.Bc4 with its Idea arrow at f7. Tap two squares for an arrow, one twice for a ring; 1 to 4 pick a colour.',
        render: () => <MarksDemo index={4} initial={asMarkSet(m[4]!.note)} />,
      },
      {
        name: 'Several colours',
        note: 'The key under the board shows only the colours in use; Clear names how many go.',
        render: () => (
          <MarksDemo index={10} initial={{ arrows: ['Gd2d4', 'Rc5f2', 'Bf1e1'], circles: ['Yf7', 'Be4'] }} />
        ),
      },
      {
        name: 'No marks yet, tap to draw off',
        render: () => <MarksDemo index={8} initial={{ arrows: [], circles: [] }} tap={false} />,
      },
      {
        name: 'Owned by another line',
        note: 'The marks live in the comment, so they follow the one-comment rule.',
        render: () => <MarksDemo index={9} initial={{ arrows: ['Gc8g4'], circles: [] }} editable={false} />,
      },
      {
        name: 'From Black’s side',
        render: () => <MarksDemo index={5} initial={{ arrows: ['Gc5f2'], circles: ['Rf2'] }} orientation="black" />,
      },
    ],
  },
  {
    id: 'refutation-editor',
    variants: [
      {
        name: 'Wrong moves here',
        note: 'After 1.e4 e5 2.Nf3: the written refutation, and the explorer’s common moves to add, at 1000 to 1600.',
        render: () => <RefutationDemo />,
      },
      {
        name: 'Adding 2...Bc5, judged',
        note: 'Graded from the example’s Stockfish evaluations, the engine’s best reply in grey. Play the punishment on the board.',
        render: () => <RefutationDemo startWith="f8c5" initial={[]} />,
      },
      {
        name: 'A sound move is refused',
        note: '2...Nf6 holds up, so it is written as a line instead: Branch here.',
        render: () => <RefutationDemo startWith="g8f6" />,
      },
      {
        name: 'Editing a written one',
        note: 'The punishment steps on the board; each punishing move can carry a note.',
        render: () => <RefutationDemo editing="r-bc5" />,
      },
    ],
  },
  {
    id: 'step-editor',
    variants: [
      {
        name: 'Three steps over the main line',
        note: 'Step 1 is taught (named, with text); the others are automatic. Move a stretch’s ends with the arrows; moving step 1’s start is refused.',
        render: () => <StepDemo />,
      },
    ],
  },
  {
    id: 'puzzle-picker',
    variants: [
      {
        name: 'Matches, best first',
        note: 'Real Lichess puzzles from the Giuoco Piano. Tick up to three; Try it solves one on a small board.',
        render: () => <PuzzleDemo defaults={PUZZLE_DEFAULTS} chosen={['pH6Ye']} />,
      },
      {
        name: 'Falling down the levels',
        note: 'Nothing passed through this exact position, so the list shows the next level and says so.',
        render: () => <PuzzleDemo defaults={{ ...PUZZLE_DEFAULTS, level: 'through' }} />,
      },
      {
        name: 'Nothing after filtering',
        render: () => <PuzzleDemo defaults={{ ...PUZZLE_DEFAULTS, level: 'any', rating: [600, 900] }} />,
      },
      {
        name: 'Full',
        note: 'Three chosen for a step: the rest cannot be ticked until one is removed.',
        render: () => (
          <PuzzleDemo defaults={{ ...PUZZLE_DEFAULTS, level: 'any' }} chosen={['pH6Ye', 'G0eP2', 'oMZKH']} />
        ),
      },
    ],
  },
  {
    id: 'pgn-import',
    variants: [
      {
        name: 'A pasted study, read',
        note: 'Two chapters: a refutation (5...Nxd5?!), a branch (5...b5), comments, a mark, a clash with a written comment, an illegal move.',
        render: () => <ImportDemo initialText={SAMPLE_PGN} />,
      },
      {
        name: 'Into an opening of yours',
        render: () => (
          <ImportDemo
            initialText={SAMPLE_PGN.split('\n\n[Event')[0]}
            target={{ id: 'italian', name: 'Italian Game', side: 'white' }}
          />
        ),
      },
      {
        name: 'Ready to paste',
        note: 'Nothing read yet: Paste, a .pgn file, or a Lichess study.',
        render: () => <ImportDemo />,
      },
      {
        name: 'Offline',
        note: 'Open the Lichess study tab: it needs a connection; Paste and File still work.',
        render: () => <ImportDemo offline />,
      },
    ],
  },
  {
    id: 'undo-button',
    variants: [
      {
        name: 'Named after the action',
        note: 'Click it, or press Ctrl+Z: each takes back one action.',
        render: () => <UndoDemo />,
      },
      {
        name: 'A long name, cut',
        note: 'Cut at about 40 characters; the whole name is on the hint.',
        render: () => <UndoButton label="import 4 lines from the Two Knights study by a friend" onUndo={() => {}} />,
      },
      { name: 'Nothing to undo', render: () => <UndoButton label={null} onUndo={() => {}} /> },
      {
        name: 'Small, in a notice',
        render: () => (
          <Notice
            kind="saved"
            text="Line deleted."
            action={<UndoButton size="sm" label="delete line 2...Bc5" onUndo={() => {}} />}
          />
        ),
      },
    ],
  },
  {
    id: 'problems-list',
    variants: [
      {
        name: 'Every level',
        note: 'Blocking, the bar, and warnings from the build; each says what to do.',
        render: () => <ProblemsList problems={PROBLEMS} />,
      },
      {
        name: 'While writing: blocking only',
        render: () => <ProblemsList problems={PROBLEMS} levels={['blocking']} />,
      },
      {
        name: 'One line’s problems',
        note: 'A line page shows only its own.',
        render: () => <ProblemsList problems={PROBLEMS} ids={['giuoco-main']} />,
      },
      {
        name: 'Compact, in a table row',
        render: () => (
          <div className="flex items-center gap-4 rounded-lg border px-3 py-2 text-sm">
            <span className="font-medium">Italian Game</span>
            <span className="text-muted-foreground">White · 6 lines</span>
            <span className="ml-auto">
              <ProblemsList problems={PROBLEMS} compact />
            </span>
          </div>
        ),
      },
      {
        name: 'No problems',
        note: 'Nothing at all is drawn, not a green box: the border below is empty.',
        render: () => (
          <div className="min-h-8 rounded-lg border border-dashed">
            <ProblemsList problems={[]} />
          </div>
        ),
      },
    ],
  },
  // Everywhere ----------------------------------------------------------------------------------------------------
  {
    id: 'breadcrumbs',
    variants: [
      {
        name: 'A step',
        note: 'Giuoco Piano and Step 3 are menus of their siblings, each with its state; a locked one says what opens it.',
        render: () => stepTrail,
      },
      {
        name: 'An opening, with its tabs',
        render: () => (
          <Breadcrumbs
            root={{ label: 'Learn', href: here('breadcrumbs') }}
            crumbs={[{ label: 'Italian Game (White)' }]}
            tabs={OPENING_TABS}
          />
        ),
      },
      {
        name: 'A line, with previous and next',
        render: () => (
          <Breadcrumbs
            root={{ label: 'Explore', href: here('breadcrumbs') }}
            crumbs={[{ label: 'Italian Game (White)', href: here('breadcrumbs') }, { label: 'Legal Mate' }]}
            tabs={{
              label: 'Line pages',
              value: 'about',
              items: [
                { value: 'about', label: 'About', href: here('breadcrumbs') },
                { value: 'learn', label: 'Learn', href: here('breadcrumbs') },
                { value: 'drill', label: 'Drill', href: here('breadcrumbs') },
                { value: 'map', label: 'Map', href: here('breadcrumbs') },
              ],
            }}
            previous={{ label: 'Giuoco Piano, 3...Bg4', href: here('breadcrumbs') }}
            next={{ label: 'Fried Liver', href: here('breadcrumbs') }}
          />
        ),
      },
      {
        name: 'During a test',
        note: 'Name it never names the answer: the crumb counts positions.',
        render: () => (
          <Breadcrumbs
            root={{ label: 'Practice', href: here('breadcrumbs') }}
            crumbs={[{ label: 'Name it', href: here('breadcrumbs') }, { label: 'Position 4 of 10' }]}
          />
        ),
      },
      {
        name: 'In a narrow column, as on a phone',
        note: 'The last crumb with a back arrow whose menu lists the crumbs above; the tabs drop below, full width.',
        render: () => (
          <div className="max-w-sm rounded-lg border p-3">
            <Breadcrumbs
              root={{ label: 'Learn', href: here('breadcrumbs') }}
              crumbs={[
                { label: 'Italian Game (White)', href: here('breadcrumbs') },
                {
                  label: 'Giuoco Piano',
                  href: here('breadcrumbs'),
                  siblings: { current: 'giuoco-piano', items: VARIATIONS, label: 'Every variation' },
                },
              ]}
              tabs={{ ...OPENING_TABS, value: 'overview' }}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: 'page-shell',
    variants: [
      {
        name: 'A page, ready',
        note: 'One column width, the trail, the page’s notices under it, the footer.',
        render: () => (
          <ShellFrame>
            <PageShell
              title="Giuoco Piano"
              documentTitle={false}
              trail={stepTrail}
              notices={
                <Notice
                  kind="reminder"
                  text="Keep a copy of your work. 23 changes in 9 days since your last export."
                  action={
                    <Button size="sm" variant="outline">
                      Export
                    </Button>
                  }
                  onDismiss={() => {}}
                />
              }
            >
              <p className="text-muted-foreground">The page’s own content goes here, in its own grid.</p>
            </PageShell>
          </ShellFrame>
        ),
      },
      {
        name: 'Loading a board page',
        note: 'The skeleton in the page’s shape, after 300 ms so a fast load never flickers.',
        render: () => (
          <ShellFrame>
            <PageShell
              title="Step 3"
              documentTitle={false}
              gate={{ state: 'loading' }}
              skeleton="board"
              trail={stepTrail}
              footer={false}
            >
              {null}
            </PageShell>
          </ShellFrame>
        ),
      },
      {
        name: 'Loading a list',
        render: () => (
          <ShellFrame>
            <PageShell title="Openings" showTitle documentTitle={false} gate={{ state: 'loading' }} footer={false}>
              {null}
            </PageShell>
          </ShellFrame>
        ),
      },
      {
        name: 'Cannot open',
        note: 'A gate that cannot be met says why and what to do.',
        render: () => (
          <ShellFrame>
            <PageShell
              title="Create"
              showTitle
              documentTitle={false}
              footer={false}
              gate={{
                state: 'blocked',
                text: 'Progress cannot be saved in this window, so Create cannot open. Open Knight School in a normal window.',
                action: { label: 'How to fix it', href: here('page-shell') },
              }}
            >
              {null}
            </PageShell>
          </ShellFrame>
        ),
      },
      {
        name: 'Another tab has it',
        note: 'Readable; saving is disabled with the reason. “Use it in this tab” takes it back.',
        render: () => <PausedDemo />,
      },
      {
        name: 'Offline',
        render: () => (
          <ShellFrame>
            <PageShell
              title="Explore"
              showTitle
              documentTitle={false}
              footer={false}
              banners={
                <Notice
                  kind="offline"
                  text="Offline. Everything you have learned works; the live explorer and your games wait."
                />
              }
            >
              <p className="text-muted-foreground">Shipped content works as usual.</p>
            </PageShell>
          </ShellFrame>
        ),
      },
      {
        name: 'The page fails to draw',
        note: 'Replaced by a message with Reload and the details in a fold (the console logs the error on purpose).',
        render: () => (
          <ShellFrame>
            <PageShell title="Step 3" documentTitle={false} footer={false} trail={stepTrail}>
              <Thrower />
            </PageShell>
          </ShellFrame>
        ),
      },
    ],
  },
  {
    id: 'hint',
    variants: [
      {
        name: 'On a word',
        note: 'Hover for half a second, or focus with the keyboard; on a touch screen, a long-press keeps it open until the next tap.',
        render: () => (
          <p className="text-sm">
            The red arrow is a{' '}
            <Hint text="Threat: what the other side threatens, a trap, a pin against you.">
              <span tabIndex={0} className="cursor-help underline decoration-dotted underline-offset-4">
                Threat
              </span>
            </Hint>
            .
          </p>
        ),
      },
      {
        name: 'On marks in a key',
        render: () => <MarkKey marks={{ arrows: ['Gc4f7', 'Rd8h4'], circles: ['Yf7', 'Bf3'] }} />,
      },
      {
        name: 'Above, when below would cover it',
        render: () => (
          <Hint text="Opens above, so the row below stays visible." side="top">
            <Button variant="outline" size="sm">
              Hover me
            </Button>
          </Hint>
        ),
      },
      {
        name: 'On icon buttons: the long delay',
        note: 'Sweep across the row: 900 ms before the first opens, then the neighbours open at once.',
        render: () => (
          <div className="flex">
            <IconAction label="Learn this step" onClick={() => {}}>
              <GraduationCap aria-hidden />
            </IconAction>
            <IconAction label="Drill this step" onClick={() => {}}>
              <Play aria-hidden />
            </IconAction>
            <IconAction label="Read about it" onClick={() => {}}>
              <BookOpen aria-hidden />
            </IconAction>
          </div>
        ),
      },
    ],
  },
  {
    id: 'icon-action',
    variants: [
      {
        name: 'In a row',
        note: 'Flat, with an edge on hover; the label is the hint and the accessible name.',
        render: () => (
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <span className="font-medium">Legal Mate</span>
            <span className="text-muted-foreground">trap to spring · {legal.length} moves</span>
            <span className="ml-auto flex">
              <IconAction label="Edit the line" onClick={() => {}}>
                <Pencil aria-hidden />
              </IconAction>
              <IconAction label="Copy the line" onClick={() => {}}>
                <Copy aria-hidden />
              </IconAction>
              <IconAction
                label="Delete the line"
                tone="danger"
                onClick={() => {}}
                confirm={{
                  title: 'Delete Legal Mate?',
                  description: 'Nothing grows from it. You can undo this.',
                  action: 'Delete',
                }}
              >
                <Trash2 aria-hidden />
              </IconAction>
            </span>
          </div>
        ),
      },
      {
        name: 'A toggle, on and off',
        render: () => <ToggleDemo />,
      },
      {
        name: 'Disabled, saying why',
        render: () => (
          <IconAction label="Learn this step" disabled disabledReason="Opens when Step 2 is known.">
            <GraduationCap aria-hidden />
          </IconAction>
        ),
      },
      {
        name: 'Danger: asks first',
        note: 'Red only on hover; the dialog says what goes with it.',
        render: () => (
          <IconAction
            label="Delete Fried Liver"
            tone="danger"
            onClick={() => {}}
            confirm={{
              title: 'Delete Fried Liver and the 2 lines that grow from it?',
              description: 'You can undo this.',
              action: 'Delete 3 lines',
            }}
          >
            <Trash2 aria-hidden />
          </IconAction>
        ),
      },
      {
        name: 'As a link',
        note: 'A real link: middle-click opens a new tab.',
        render: () => (
          <IconAction label="Open the step" href={here('icon-action')}>
            <Play aria-hidden />
          </IconAction>
        ),
      },
    ],
  },
  {
    id: 'empty-state',
    variants: [
      {
        name: 'New: nothing chosen yet',
        render: () => (
          <EmptyState
            kind="new"
            text="Your repertoire is empty. Pick an opening for White to start."
            action={{ label: 'Choose an opening', href: here('empty-state') }}
          />
        ),
      },
      {
        name: 'Done: good news, and what next',
        render: () => (
          <EmptyState
            kind="done"
            text="Nothing due today. Your next review is tomorrow, 6 moves."
            action={{ label: 'Learn the next step', href: here('empty-state') }}
          />
        ),
      },
      {
        name: 'No match',
        note: 'A filtered list keeps its filters above the message.',
        render: () => <NoMatch />,
      },
      {
        name: 'Locked',
        render: () => (
          <EmptyState
            kind="locked"
            text="Opens when Step 2 is known. Or take its check to test out."
            action={{ label: 'Go to Step 2', href: here('empty-state') }}
            secondary={{ label: 'Test out', href: here('empty-state') }}
          />
        ),
      },
      {
        name: 'Needs a username',
        render: () => (
          <EmptyState
            kind="needs-username"
            text="Your games need your Lichess or Chess.com username."
            action={{ label: 'Add it in Settings', href: here('settings-row') }}
          />
        ),
      },
      {
        name: 'Inside a board part',
        note: 'One muted line, not a card.',
        render: () => (
          <div className="grid gap-2">
            <EmptyState kind="not-covered" size="part" text="No games reach this position at 1000 to 1600." />
            <EmptyState
              kind="offline"
              size="part"
              text="The live explorer needs a connection. Showing the counts shipped with the site."
            />
            <EmptyState
              kind="not-covered"
              size="part"
              text="No opening of yours reaches this position."
              action={{ label: 'Step back', onClick: () => {} }}
            />
          </div>
        ),
      },
      {
        name: 'A page with nothing',
        render: () => (
          <EmptyState
            kind="new"
            size="page"
            text="You have not written an opening yet."
            action={{ label: 'New opening', onClick: () => {} }}
            secondary={{ label: 'Import a PGN', onClick: () => {} }}
          />
        ),
      },
    ],
  },
  {
    id: 'notice',
    variants: [
      {
        name: 'Saved, with Undo',
        note: 'Goes after eight seconds or the next action.',
        render: () => <SavedNoticeDemo />,
      },
      {
        name: 'Problem',
        render: () => (
          <Notice
            kind="problem"
            text="Some of your work cannot be used yet"
            detail={<ProblemsList problems={PROBLEMS.slice(0, 2)} className="border-0 p-0" />}
          />
        ),
      },
      {
        name: 'Reminder',
        render: () => (
          <Notice
            kind="reminder"
            text="Keep a copy of your work. 23 changes in 9 days since your last export."
            action={
              <Button size="sm" variant="outline">
                Export
              </Button>
            }
            onDismiss={() => {}}
          />
        ),
      },
      {
        name: 'Offline',
        note: 'A site banner; it cannot be closed while it is true.',
        render: () => (
          <Notice
            kind="offline"
            text="Offline. Everything you have learned works; the live explorer and your games wait."
          />
        ),
      },
      {
        name: 'Paused',
        render: () => (
          <Notice
            kind="paused"
            text="Knight School is open in another tab, so progress is paused here."
            action={
              <Button size="sm" variant="outline">
                Use it in this tab
              </Button>
            }
          />
        ),
      },
      {
        name: 'Update',
        render: () => (
          <Notice
            kind="update"
            text="A new version is ready."
            action={
              <Button size="sm" variant="outline">
                Reload
              </Button>
            }
          />
        ),
      },
      {
        name: 'Error',
        render: () => (
          <Notice
            kind="error"
            text="Could not reach Lichess. Trying again in a minute."
            action={
              <Button size="sm" variant="outline">
                Try again
              </Button>
            }
          />
        ),
      },
      {
        name: 'Beside what it is about',
        note: 'Page notices sit next to the control, never in a corner.',
        render: () => (
          <div className="grid max-w-md gap-2">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              Sounds <Switch defaultChecked aria-label="Sounds" />
            </div>
            <Notice
              kind="saved"
              text="Sounds set to off."
              action={<UndoButton size="sm" label="Sounds off" onUndo={() => {}} />}
            />
          </div>
        ),
      },
    ],
  },
];
