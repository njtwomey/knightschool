import { numberedMove, playMove, sideToMove, type Grade, type Played } from '@knightschool/core';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import type { Idea } from '@/components/chess/idea-badge';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun } from '@/components/chess/move-run';
import { VerdictBadge } from '@/components/chess/verdict-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { siteConfig } from '@/data/site-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MoveNoteEditor, type MoveNote } from './move-note-editor';

export type RefutationSymbol = '?!' | '?' | '??';

export type Refutation = {
  id: string;
  /** The wrong move. */
  uci: string;
  san: string;
  symbol: RefutationSymbol;
  /** Why, in one sentence: the wrong move's comment. */
  why: string;
  ideas: string[];
  /** The punishing moves, two to six plies, as UCI. */
  punishment: string[];
  /** A note on any punishing move, by its index in `punishment`. */
  punishmentNotes?: Record<number, string>;
};

/** The judgement of a wrong move: author, baked or live engine. Null while it is still being worked out. */
export type RefutationJudgement = { grade: Grade; costCp: number; bestReply?: string } | null;

export type RefutationEditorProps = {
  /** The position the wrong move is played from. */
  epd: string;
  /** The ply of the wrong move (0 is White's first). */
  ply: number;
  lineName: string;
  /** The opening's side, to say whose mistake it is. */
  side: 'white' | 'black';
  /** The refutations already written at this position. */
  refutations: Refutation[];
  /** What players at the learner's band play here, as shares of games, most played first. */
  common: { uci: string; san: string; share: number }[];
  judge: (uci: string, after: string) => RefutationJudgement;
  /** Saves one undoable action ("add the refutation 2...Bc5?"). */
  onSave: (refutation: Refutation, label: string) => void;
  onDelete?: (id: string, label: string) => void;
  /** A sound move is a line, not a refutation: goes to Branch here. */
  onBranch?: (uci: string) => void;
  ideas: Idea[];
  orientation?: 'white' | 'black';
  /** Opens straight on adding this wrong move (UCI), as when a common move is picked. */
  startWith?: string;
  /** Opens straight on editing this refutation. */
  editing?: string;
};

const SOUND: Grade[] = ['book', 'best', 'excellent', 'good'];
const SYMBOL_FOR: Partial<Record<Grade, RefutationSymbol>> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
  miss: '?',
};
const percent = (share: number) => `${Math.round(share * 100)}%`;

type Draft = { id: string; wrong: Played | null; punishment: Played[]; note: MoveNote; notes: Record<number, string> };

const emptyNote: MoveNote = { comment: '', symbol: '', ideas: [], tags: [] };

function draftOf(epd: string, refutation?: Refutation): Draft {
  if (!refutation) return { id: `r-${Date.now()}`, wrong: null, punishment: [], note: emptyNote, notes: {} };
  const wrong = playMove(epd, refutation.uci);
  const punishment: Played[] = [];
  let at = wrong?.epd;
  for (const uci of refutation.punishment) {
    const next = at ? playMove(at, uci) : null;
    if (!next) break;
    punishment.push(next);
    at = next.epd;
  }
  return {
    id: refutation.id,
    wrong,
    punishment,
    note: { comment: refutation.why, symbol: refutation.symbol, ideas: refutation.ideas, tags: [] },
    notes: refutation.punishmentNotes ?? {},
  };
}

/**
 * Play a wrong move at a position of a line, see what the engine thinks of it, play the reply that punishes it and
 * say why. Saved as a PGN variation under the line, never drilled as a line (docs/v2/components/refutation-editor.md).
 */
export function RefutationEditor({
  epd,
  ply,
  lineName,
  side,
  refutations,
  common,
  judge,
  onSave,
  onDelete,
  onBranch,
  ideas,
  orientation = side,
  startWith,
  editing,
}: RefutationEditorProps) {
  const [draft, setDraft] = useState<Draft | null>(() => {
    const refutation = refutations.find((r) => r.id === editing);
    if (refutation) return draftOf(epd, refutation);
    if (!startWith) return null;
    const wrong = playMove(epd, startWith);
    const judged = wrong ? judge(wrong.uci, wrong.epd) : null;
    return { ...draftOf(epd), wrong, note: { ...emptyNote, symbol: judged ? (SYMBOL_FOR[judged.grade] ?? '') : '' } };
  });
  const [cursor, setCursor] = useState(() => (draft?.wrong ? 1 + draft.punishment.length : 0));
  const [tried, setTried] = useState(false);
  const maxPlies = siteConfig.judge.refutationPlies;
  const yours = sideToMove(epd) === side;
  const whose = yours ? 'Your mistake' : 'Their mistake';
  const written = new Set(refutations.map((r) => r.uci));
  const suggestions = common.filter((move) => !written.has(move.uci));

  const open = (refutation?: Refutation, firstMove?: string) => {
    const next = draftOf(epd, refutation);
    if (firstMove) next.wrong = playMove(epd, firstMove);
    if (next.wrong && !refutation) {
      const judged = judge(next.wrong.uci, next.wrong.epd);
      next.note = { ...emptyNote, symbol: judged ? (SYMBOL_FOR[judged.grade] ?? '') : '' };
    }
    setDraft(next);
    setCursor(next.wrong ? 1 + next.punishment.length : 0);
  };

  if (!draft) {
    return (
      <div className="grid gap-4">
        <header className="grid gap-0.5">
          <h3 className="font-medium">Wrong moves here</h3>
          <p className="text-sm text-muted-foreground">
            {sideToMove(epd) === 'white' ? 'White' : 'Black'} to move at move {Math.floor(ply / 2) + 1} of {lineName}. A
            refutation shows to every learner who plays the move, in every opening that reaches this position.
          </p>
        </header>
        {refutations.length === 0 ? (
          <EmptyState kind="new" size="part" text="No wrong move is written here yet." />
        ) : (
          <ul className="grid divide-y rounded-lg border">
            {refutations.map((refutation) => {
              const share = common.find((move) => move.uci === refutation.uci)?.share;
              return (
                <li key={refutation.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <MoveChip
                    ply={ply}
                    san={refutation.san + refutation.symbol}
                    preview={false}
                    onSelect={() => open(refutation)}
                  />
                  {share !== undefined ? (
                    <span className="text-muted-foreground tabular-nums">{percent(share)} of games</span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{refutation.why}</span>
                  <Button variant="ghost" size="xs" onClick={() => open(refutation)}>
                    Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => open()}>
            <Plus aria-hidden /> Add a wrong move
          </Button>
          {suggestions.length > 0 ? (
            <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              Players at your level also play
              {suggestions.slice(0, 3).map((move, i) => (
                <span key={move.uci} className="inline-flex items-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-1 font-mono"
                    onClick={() => open(undefined, move.uci)}
                  >
                    {numberedMove(ply, move.san)}
                  </Button>
                  ({percent(move.share)}){i < Math.min(suggestions.length, 3) - 1 ? ',' : '.'}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const { wrong, punishment } = draft;
  const judged = wrong ? judge(wrong.uci, wrong.epd) : null;
  const sound = judged ? SOUND.includes(judged.grade) : false;
  const played = wrong ? [wrong, ...punishment] : [];
  const positions: BoardPosition[] = [
    { epd },
    ...played.map((move) => ({ epd: move.epd, lastMove: { from: move.from, to: move.to } })),
  ];
  const atEnd = cursor === positions.length - 1;
  const full = punishment.length >= maxPlies;
  const symbolOk = draft.note.symbol === '?!' || draft.note.symbol === '?' || draft.note.symbol === '??';
  const tooShort = punishment.length < 1;
  const label = wrong ? `add the refutation ${numberedMove(ply, wrong.san)}${draft.note.symbol}` : '';

  const onMove = (from: string, to: string) => {
    const at = positions[cursor]!.epd;
    const move = playMove(at, from + to) ?? playMove(at, `${from}${to}q`);
    if (!move) return false;
    if (cursor === 0) {
      const judgedNow = judge(move.uci, move.epd);
      setDraft({
        ...draft,
        wrong: move,
        punishment: [],
        note: { ...draft.note, symbol: judgedNow ? (SYMBOL_FOR[judgedNow.grade] ?? '') : draft.note.symbol },
      });
    } else {
      const kept = punishment.slice(0, cursor - 1);
      if (kept.length >= maxPlies) return false;
      setDraft({ ...draft, punishment: [...kept, move] });
    }
    setCursor(cursor + 1);
    return true;
  };

  const arrows =
    wrong && judged?.bestReply && punishment.length === 0 && cursor === 1 && !sound
      ? [{ from: judged.bestReply.slice(0, 2), to: judged.bestReply.slice(2, 4), kind: 'engine' as const }]
      : [];
  const prompt = !wrong
    ? 'Play the wrong move on the board, for either side.'
    : sound
      ? null
      : punishment.length === 0
        ? 'Now play the reply that punishes it. The engine’s best reply is drawn in grey.'
        : full
          ? `That is ${maxPlies} plies, the most a refutation shows.`
          : 'Play on to show the punishment, or stop here.';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Board
        positions={positions}
        index={cursor}
        onIndex={setCursor}
        interactive={!sound && atEnd && !full}
        onMove={onMove}
        orientation={orientation}
        arrows={arrows}
        flippable
        caption={prompt ? <span className="text-muted-foreground">{prompt}</span> : undefined}
      />
      <div className="grid content-start gap-4">
        <header className="flex flex-wrap items-center gap-2">
          {wrong ? (
            <>
              <h3 className="font-mono text-lg font-semibold">
                {numberedMove(ply, wrong.san)}
                {draft.note.symbol}
              </h3>
              {judged ? (
                <>
                  <VerdictBadge grade={judged.grade} />
                  <span className="text-sm text-muted-foreground tabular-nums">−{Math.round(judged.costCp)} cp</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Judging…</span>
              )}
              <Badge variant="outline">{whose}</Badge>
            </>
          ) : (
            <h3 className="font-medium">A new wrong move</h3>
          )}
        </header>

        {sound && wrong && judged ? (
          <div role="alert" className="grid gap-2 rounded-lg border p-3 text-sm">
            <p>That move holds up (only {Math.round(judged.costCp)} centipawns worse). Write it as a line instead.</p>
            <div className="flex gap-2">
              {onBranch ? (
                <Button size="sm" variant="outline" onClick={() => onBranch(wrong.uci)}>
                  <GitBranch aria-hidden /> Branch here
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => open()}>
                Try another move
              </Button>
            </div>
          </div>
        ) : null}

        {wrong && !sound ? (
          <>
            <div className="grid gap-1 text-sm">
              <p className="text-muted-foreground">The punishment</p>
              {punishment.length > 0 ? (
                <MoveRun
                  moves={punishment.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }))}
                  firstPly={ply + 1}
                  current={cursor >= 2 ? cursor - 2 : undefined}
                  onSelect={(i) => setCursor(i + 2)}
                />
              ) : (
                <p className="text-muted-foreground">Not played yet.</p>
              )}
            </div>

            {cursor >= 2 ? (
              <div className="grid gap-1.5">
                <Label htmlFor="punish-note">
                  Note on {numberedMove(ply + cursor - 1, punishment[cursor - 2]!.san)}
                </Label>
                <Textarea
                  id="punish-note"
                  rows={2}
                  value={draft.notes[cursor - 2] ?? ''}
                  placeholder="Optional: what this move does."
                  onChange={(event) =>
                    setDraft({ ...draft, notes: { ...draft.notes, [cursor - 2]: event.target.value } })
                  }
                />
              </div>
            ) : null}

            <MoveNoteEditor
              move={{ ply, san: wrong.san, epd: wrong.epd, uci: wrong.uci }}
              lineName={lineName}
              note={draft.note}
              inLine={false}
              ideas={ideas}
              preview={false}
              onSave={(note) => setDraft({ ...draft, note })}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => {
                  if (!symbolOk || tooShort || !draft.note.comment.trim()) {
                    setTried(true);
                    return;
                  }
                  onSave(
                    {
                      id: draft.id,
                      uci: wrong.uci,
                      san: wrong.san,
                      symbol: draft.note.symbol as RefutationSymbol,
                      why: draft.note.comment.trim(),
                      ideas: draft.note.ideas,
                      punishment: punishment.map((move) => move.uci),
                      punishmentNotes: draft.notes,
                    },
                    label,
                  );
                  setDraft(null);
                  setTried(false);
                }}
              >
                Save the refutation
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              {onDelete && refutations.some((r) => r.id === draft.id) ? (
                <Button
                  variant="ghost"
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    onDelete(draft.id, `delete the refutation ${numberedMove(ply, wrong.san)}`);
                    setDraft(null);
                  }}
                >
                  <Trash2 aria-hidden /> Delete
                </Button>
              ) : null}
            </div>
            <p
              role="status"
              className={cn(
                'text-xs text-destructive',
                (!tried || (symbolOk && !tooShort && draft.note.comment.trim())) && 'hidden',
              )}
            >
              {!symbolOk
                ? 'Pick ?, ?? or ?! for the wrong move.'
                : tooShort
                  ? 'Play at least one punishing move.'
                  : 'Say why in the comment.'}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
