import { gradeOf, moveCost, numberedMove, playMove, sideToMove, START_EPD, type Played } from '@knightschool/core';
import { ArrowRight, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Board, type BoardPosition } from '@/components/board/board';
import type { ControlsExercise } from '@/components/board/board-controls';
import { BoardExplorer, type ExplorerRow, type ExplorerState } from '@/components/board/board-explorer';
import { BoardFeedback, type Feedback } from '@/components/board/board-feedback';
import { BoardNotes, type NotesMove } from '@/components/board/board-notes';
import { BoardSettingsForm, BoardSettingsMenu, useBoardSettings } from '@/components/board/board-settings-menu';
import type { SystemArrow } from '@/components/board/board-surface';
import { IdeaBadge, type Idea } from '@/components/chess/idea-badge';
import { KindBadge } from '@/components/chess/kind-badge';
import { MoveExplanation, type Alternative } from '@/components/chess/move-explanation';
import { lichessOpeningUrl, OpeningName } from '@/components/chess/opening-name';
import { PositionCard } from '@/components/chess/position-card';
import { featureOnBoard, findFeatures, PositionFeatures, type Feature } from '@/components/chess/position-features';
import { RichText, type RichTextBoard, type RichTextContext } from '@/components/chess/rich-text';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/data/site-config';
import {
  engineLines,
  example,
  explorerMoves,
  gamesAt,
  judgeAgainstLine,
  line,
  mainLine,
  positionsOf,
  scoreOf,
  squares,
  type ExampleLine,
  type ExampleMove,
} from '../fixtures/example';
import type { MockItem } from './types';

/* The example's data, shaped for these components. */

const MAIN = positionsOf('giuoco-piano-main');
const m = mainLine.moves;
const legal = line('legal-mate').moves;
const ALL_LINES: ExampleLine[] = Object.values(example.lines);
const LEARNER = example.opening.side;
const START_GAMES = gamesAt(START_EPD) ?? 1;

/** The line's move from a position, the main line first. */
function lineMoveFrom(epd: string): ExampleMove | undefined {
  for (const each of ALL_LINES) {
    const found = each.moves.find((move) => move.before === epd);
    if (found) return found;
  }
  return undefined;
}

/** The engine's best line from a position, as moves (at most `n`). */
function enginePv(epd: string, n = 4): Played[] {
  const pv = engineLines(epd)[0]?.pv ?? [];
  const out: Played[] = [];
  let at = epd;
  for (const uci of pv.slice(0, n)) {
    const played = playMove(at, uci);
    if (!played) break;
    out.push(played);
    at = played.epd;
  }
  return out;
}

const asRun = (moves: Played[]) => moves.map((move) => ({ san: move.san, uci: move.uci, after: move.epd }));

/** A move instead of the line's: its grade and cost from the stored evaluations, or against the best when off-line. */
function judge(epd: string, played: Played, againstBest = false) {
  const book = againstBest ? undefined : lineMoveFrom(epd);
  if (book) {
    const judged = judgeAgainstLine(book, { uci: played.uci, after: played.epd });
    return judged ? { grade: judged.grade, costCp: Math.round(judged.cost.cp) } : null;
  }
  const before = scoreOf(epd);
  const after = scoreOf(played.epd);
  if (!before || !after) return null;
  const cost = moveCost(before, after, sideToMove(epd));
  return { grade: gradeOf(cost, siteConfig.judge.grades), costCp: Math.round(cost.cp) };
}

/** The explorer's rows for a position: real counts, each move judged where the evaluations exist. */
function explorerRows(epd: string): ExplorerRow[] {
  const book = lineMoveFrom(epd);
  const covered = new Set(
    ALL_LINES.flatMap((each) => each.moves.filter((move) => move.before === epd)).map((move) => move.san),
  );
  const total = gamesAt(epd) ?? 0;
  const theirs = sideToMove(epd) !== LEARNER;
  return explorerMoves(epd).flatMap((move) => {
    const played = playMove(epd, move.san);
    if (!played) return [];
    return [
      {
        uci: played.uci,
        san: move.san,
        games: move.games,
        white: move.white,
        draws: move.draws,
        black: move.black,
        after: played.epd,
        grade: judge(epd, played)?.grade,
        book: book?.san === move.san,
        gap: theirs && !covered.has(move.san) && total > 0 && move.games / total >= 0.05,
      },
    ];
  });
}

const explorerState = (epd: string): ExplorerState => {
  const rows = explorerRows(epd);
  return rows.length > 0
    ? { status: 'ready', rows, games: gamesAt(epd) ?? 0, source: 'baked' }
    : { status: 'no-token' };
};

const whiteScore = (move: { games: number; white: number; draws: number }) =>
  Math.round(((move.white + move.draws / 2) / move.games) * 100);

/** Ideas, as content will hold them (v1's motifs carried over). */
const IDEAS: Record<string, Idea> = {
  'weak-f7': {
    id: 'weak-f7',
    name: 'The weak f7 square',
    kind: 'tactic',
    summary: 'At the start only the king guards f7, so a bishop on c4 and a knight or queen can hit it together.',
    example: { epd: m[4]!.after, lastMove: squares(m[4]!.uci) },
  },
  pin: {
    id: 'pin',
    name: 'Pin',
    kind: 'tactic',
    summary: 'A piece cannot move without exposing a more valuable one behind it.',
    example: { epd: legal[7]!.after, lastMove: squares(legal[7]!.uci) },
  },
  'c3-d4': {
    id: 'c3-d4',
    name: 'Build the centre with c3 and d4',
    kind: 'plan',
    summary: 'Prepare d4 with c3, so the pawn centre comes with a gain of time on the bishop on c5.',
  },
  'develop-first': {
    id: 'develop-first',
    name: 'Develop before attacking',
    kind: 'principle',
    summary: 'Bring the knights and bishops out and castle before starting anything.',
  },
  'italian-chain': {
    id: 'italian-chain',
    name: 'The c3, d3, e4 chain',
    kind: 'structure',
    summary: 'A solid triangle of pawns that keeps the centre closed until White is ready for d4.',
  },
  'legal-mate': {
    id: 'legal-mate',
    name: 'Legal Mate',
    kind: 'trap',
    summary: 'A pinned knight jumps away anyway, offering the queen; taking it allows mate with the minor pieces.',
    example: { epd: legal[13]!.after, lastMove: squares(legal[13]!.uci) },
  },
};

/** The main line's context, for comments with moves in them. */
const MAIN_CONTEXT: RichTextContext = { startEpd: START_EPD, moves: m.map((move) => ({ ...move })) };

/* Shared demo pieces. */

function Columns({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">{children}</div>;
}

/** A board the text and panels talk to: a preview over the shown position, a pin, lit squares and arrows. */
function useLinkedBoard(positions: BoardPosition[], start: number) {
  const [index, setIndex] = useState(start);
  const [preview, setPreview] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [lit, setLit] = useState<string[] | null>(null);
  const shownEpd = preview ?? pinned;
  const board: RichTextBoard = {
    onPreview: setPreview,
    onPin: setPinned,
    pinned,
    onLight: setLit,
  };
  const step = (next: number) => {
    setPinned(null);
    setIndex(next);
  };
  const shownPositions = shownEpd ? [{ epd: shownEpd, score: scoreOf(shownEpd) }] : positions;
  const props = {
    positions: shownPositions,
    index: shownEpd ? 0 : index,
    onIndex: shownEpd ? undefined : step,
    lit: lit ?? undefined,
  };
  return { index, setIndex: step, board, props, previewing: Boolean(shownEpd) };
}

/* board-controls */

function ControlsDemo({
  index: start = 6,
  flippable = true,
  stepper = true,
  exercise,
  hintsAllowed,
  triesSpent,
  actions,
  settings = true,
  asked,
}: {
  index?: number;
  flippable?: boolean;
  stepper?: boolean;
  exercise?: boolean;
  hintsAllowed?: boolean;
  triesSpent?: boolean;
  actions?: ReactNode;
  settings?: boolean;
  asked?: number;
}) {
  const [index, setIndex] = useState(start);
  const [help, setHelp] = useState<ControlsExercise['help']>('none');
  const answer = MAIN[asked ?? start]!.next;
  const arrows: SystemArrow[] = help === 'shown' && answer ? [{ ...answer, kind: 'play' }] : [];
  return (
    <div className="grid max-w-xs gap-2">
      <Board
        positions={MAIN}
        index={index}
        onIndex={stepper ? setIndex : undefined}
        reveal={exercise ? 'test' : 'study'}
        flippable={flippable}
        settings={settings}
        asked={asked}
        arrows={arrows}
        lit={help === 'hint' && answer ? [answer.from] : undefined}
        exercise={
          exercise
            ? {
                help,
                onHint: () => setHelp('hint'),
                onShow: () => setHelp('shown'),
                hintsAllowed,
                triesSpent,
              }
            : undefined
        }
        actions={actions}
      />
    </div>
  );
}

/* board-settings-menu */

function SettingsReadout() {
  const values = useBoardSettings();
  return (
    <p className="font-mono text-xs text-muted-foreground">
      theme {values.theme}, pieces {values.pieces}, coordinates {String(values.coordinates)}, notation {values.notation}
      , engine {values.engineOn ? `on, ${values.engineLines} line(s)` : 'off'}
    </p>
  );
}

/* step-buttons */

function StepDemo({
  start,
  min,
  asked,
  offLine,
  keys,
}: {
  start: number;
  min?: number;
  asked?: number;
  offLine?: boolean;
  keys?: boolean;
}) {
  const [index, setIndex] = useState(start);
  const [off, setOff] = useState(offLine ?? false);
  const at = m[index - 1];
  return (
    <div className="grid gap-2">
      <Board
        positions={MAIN}
        index={index}
        onIndex={setIndex}
        stepMin={min}
        asked={asked}
        offLine={off}
        onBackToLine={() => setOff(false)}
        keys={keys}
        flippable={false}
        settings={false}
        className="max-w-xs"
      />
      <p className="text-sm text-muted-foreground">
        {index === 0 || !at ? 'The start' : `After ${numberedMove(index - 1, at.san)}`}
        {asked !== undefined && index < asked ? ' (looking back; the exercise waits)' : ''}
        {off ? ' (off the line: a refutation being stepped through)' : ''}
      </p>
    </div>
  );
}

/* board-explorer */

function ExplorerDemo({ start, startPly, onPlay = true }: { start: string; startPly: number; onPlay?: boolean }) {
  const [path, setPath] = useState<{ epd: string; ply: number; lastMove?: { from: string; to: string } }[]>([
    { epd: start, ply: startPly },
  ]);
  const [index, setIndex] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const here = path[index]!;
  const state = explorerState(here.epd);
  const rows = state.status === 'ready' ? state.rows : [];
  const hovered = rows.find((row) => row.uci === hover);
  const play = (uci: string) => {
    const played = playMove(here.epd, uci);
    if (!played) return;
    setPath([
      ...path.slice(0, index + 1),
      { epd: played.epd, ply: here.ply + 1, lastMove: { from: played.from, to: played.to } },
    ]);
    setIndex(index + 1);
    setHover(null);
  };
  return (
    <Columns>
      <Board
        positions={path.map((p) => ({ epd: p.epd, lastMove: p.lastMove, score: scoreOf(p.epd) }))}
        index={index}
        onIndex={(next) => {
          setIndex(next);
          setHover(null);
        }}
        arrows={hovered ? [{ from: hovered.uci.slice(0, 2), to: hovered.uci.slice(2, 4), kind: 'preview' }] : []}
      />
      <BoardExplorer
        state={state}
        ply={here.ply}
        onHover={setHover}
        onPlay={onPlay ? play : undefined}
        gapHref={() => '#gap-link'}
      />
    </Columns>
  );
}

/* board-feedback: real moves from the example. */

// 5.Nxe5?? in the Legal Mate line, too early: the knight is not pinned yet and the queen hangs.
const blunderAt = legal[8]!; // the line plays 5.h3
const blunderPlayed = playMove(blunderAt.before, 'Nxe5')!;
const blunderJudged = judge(blunderAt.before, blunderPlayed);
const blunderRefutation = enginePv(blunderPlayed.epd, 3);
// 4.c3, right.
const rightAt = m[6]!;
// At 3...Bc5, the most played sound move that is not 4.c3.
const altPlayed = explorerRows(rightAt.before)
  .filter((row) => !row.book && row.grade && ['best', 'excellent', 'good'].includes(row.grade))
  .map((row) => ({ row, played: playMove(rightAt.before, row.san)! }))[0];
// 5...Bh5? in the Legal Mate line: Black's mistake, and White's punishment 6.Nxe5.
const bh5 = legal[9]!;
const bh5Row = explorerMoves(bh5.before).find((move) => move.san === 'Bh5')!;
const bh5Share = Math.round((bh5Row.games / (gamesAt(bh5.before) ?? 1)) * 100);
const bh5Judged = judge(bh5.before, playMove(bh5.before, 'Bh5')!, true);
// 6.g4 instead of 6.Nxe5: the punishment missed.
const punish = legal[10]!;
const g4 = playMove(punish.before, 'g4')!;
const punishRun = asRun([playMove(punish.before, punish.san)!, ...enginePv(punish.after, 3)]);

const FEEDBACK: Record<string, Feedback> = {
  right: {
    kind: 'right',
    ply: 6,
    san: rightAt.san,
    ...squares(rightAt.uci),
    comment: rightAt.note?.text,
    ideas: <IdeaBadge idea={IDEAS['c3-d4']} />,
  },
  wrong: {
    kind: 'wrong',
    ply: 8,
    san: blunderPlayed.san,
    from: blunderPlayed.from,
    to: blunderPlayed.to,
    grade: blunderJudged?.grade ?? 'blunder',
    costCp: blunderJudged?.costCp,
    because: `A blunder: after 5...${blunderRefutation[0]?.san ?? 'Nxe5'} White has lost a knight for a pawn.`,
    authorNote:
      'Too early: the knight on f3 is not pinned yet, and nothing is gained. First {5. h3}, asking the bishop.',
    refutation: asRun(blunderRefutation),
  },
  alternative: altPlayed
    ? {
        kind: 'alternative',
        ply: 6,
        san: altPlayed.played.san,
        from: altPlayed.played.from,
        to: altPlayed.played.to,
        grade: altPlayed.row.grade!,
        lineMove: rightAt.san,
        linePly: 6,
      }
    : {
        kind: 'alternative',
        ply: 6,
        san: 'O-O',
        from: 'e1',
        to: 'g1',
        grade: 'excellent',
        lineMove: rightAt.san,
        linePly: 6,
      },
  opponent: {
    kind: 'opponent-mistake',
    ply: 9,
    san: bh5.san,
    ...squares(bh5.uci),
    grade: bh5Judged?.grade ?? 'mistake',
    sharePct: bh5Share,
    because: 'leaves e5 to a knight that looks pinned but is not.',
  },
  miss: {
    kind: 'miss',
    ply: 10,
    san: g4.san,
    from: g4.from,
    to: g4.to,
    punish: { ply: 10, san: punish.san, ...squares(punish.uci) },
    because: 'wins a pawn at once, and the queen offer leads to mate if Black takes it.',
    refutation: punishRun,
  },
};

/** Feedback beside a board: hovering the panel lights the move's squares; Show why steps through the refutation. */
function FeedbackDemo({ feedback, at }: { feedback: Feedback; at: string }) {
  const [lit, setLit] = useState<string[] | null>(null);
  const [why, setWhy] = useState<number | null>(null);
  const refutation = feedback.kind === 'wrong' || feedback.kind === 'miss' ? (feedback.refutation ?? []) : [];
  const played = feedback.kind === 'miss' || feedback.kind === 'wrong' ? playMove(at, feedback.san) : null;
  const first = feedback.kind === 'miss' ? at : (played?.epd ?? at);
  const whyPositions: BoardPosition[] = [
    { epd: first, score: scoreOf(first) },
    ...refutation.map((move) => ({ epd: move.after, lastMove: squares(move.uci), score: scoreOf(move.after) })),
  ];
  const shownAt =
    feedback.kind === 'opponent-mistake' || feedback.kind === 'right' ? playMove(at, feedback.san)! : null;
  const epd = shownAt?.epd ?? at;
  return (
    <Columns>
      {why !== null ? (
        <Board positions={whyPositions} index={why} onIndex={setWhy} reveal="answered" flippable={false} />
      ) : (
        <Board
          positions={[{ epd, lastMove: { from: feedback.from, to: feedback.to } }]}
          index={0}
          reveal="answered"
          flippable={false}
          lit={lit ?? undefined}
          badge={
            feedback.kind === 'right'
              ? { square: feedback.to, kind: 'right' }
              : feedback.kind === 'wrong'
                ? { square: feedback.to, kind: 'wrong' }
                : feedback.kind === 'miss'
                  ? { square: feedback.to, kind: 'grade', grade: 'miss' }
                  : { square: feedback.to, kind: 'grade', grade: feedback.grade }
          }
          arrows={feedback.kind === 'wrong' ? [{ from: feedback.from, to: feedback.to, kind: 'wrong' }] : []}
        />
      )}
      <BoardFeedback
        feedback={feedback}
        onLight={setLit}
        onShowWhy={() => setWhy(1)}
        showingWhy={why !== null}
        onBackToLine={() => setWhy(null)}
        triesLeft={feedback.kind === 'wrong' ? 1 : undefined}
        context={{ startEpd: START_EPD, moves: legal.map((move) => ({ ...move })) }}
      />
    </Columns>
  );
}

/* board-notes */

const notesFor = (i: number): NotesMove | undefined => {
  const move = m[i];
  if (!move) return undefined;
  return {
    ply: i,
    san: move.san,
    comment: move.note?.text,
    marks: move.note,
    name:
      i === 5
        ? {
            name: 'Italian Game: Giuoco Piano',
            eco: 'C50',
            lichessUrl: lichessOpeningUrl('Italian Game: Giuoco Piano'),
          }
        : i === 4
          ? { name: 'Italian Game', eco: 'C50', lichessUrl: lichessOpeningUrl('Italian Game') }
          : undefined,
    ideas: i === 4 ? <IdeaBadge idea={IDEAS['weak-f7']} /> : i === 6 ? <IdeaBadge idea={IDEAS['c3-d4']} /> : undefined,
    tags: i === 8 ? ['Tip'] : undefined,
  };
};

function explanationFor(i: number) {
  const move = m[i]!;
  const row = explorerMoves(move.before).find((candidate) => candidate.san === move.san);
  const total = gamesAt(move.before) ?? 0;
  const alternatives: Alternative[] = explorerRows(move.before)
    .filter((candidate) => !candidate.book)
    .slice(0, 3)
    .map((candidate) => {
      const judged = judge(move.before, playMove(move.before, candidate.san)!);
      return {
        ply: i,
        san: candidate.san,
        uci: candidate.uci,
        after: candidate.after!,
        grade: judged?.grade,
        costCp: judged?.costCp,
      };
    });
  return {
    move: { ply: i, san: move.san, uci: move.uci, after: move.after, grade: 'book' as const },
    comment: move.note?.text,
    played:
      row && total ? { sharePct: Math.round((row.games / total) * 100), whiteScorePct: whiteScore(row) } : undefined,
    alternatives,
    scoreAfter: scoreOf(move.after),
  };
}

function NotesDemo() {
  const linked = useLinkedBoard(MAIN, 5);
  const i = linked.index - 1;
  const explained = i >= 0 ? explanationFor(i) : null;
  return (
    <Columns>
      <Board {...linked.props} markKey={false} />
      <BoardNotes
        move={notesFor(i)}
        startText={example.opening.variations[0]!.intro}
        board={linked.board}
        side={LEARNER}
        context={MAIN_CONTEXT}
        more={
          explained ? (
            <MoveExplanation
              {...explained}
              side={LEARNER}
              board={linked.board}
              features={
                <PositionFeatures
                  epd={m[i]!.after}
                  learner={LEARNER}
                  limit={3}
                  onLight={(f) => linked.board.onLight?.(f?.squares ?? null)}
                />
              }
            />
          ) : null
        }
      />
    </Columns>
  );
}

/* position-features */

function FeaturesDemo({ lineId, start, limit }: { lineId: string; start: number; limit?: number }) {
  const positions = positionsOf(lineId);
  const [index, setIndex] = useState(start);
  const [lit, setLit] = useState<Feature | null>(null);
  return (
    <Columns>
      <Board
        {...featureOnBoard(lit, positions, index)}
        index={index}
        onIndex={(next) => {
          setIndex(next);
          setLit(null);
        }}
      />
      <PositionFeatures epd={positions[index]!.epd} learner={LEARNER} limit={limit} onLight={setLit} />
    </Columns>
  );
}

/* rich-text */

const RICH = [
  'After {3...Bc5} White plays {4. c3}, getting ready for d4. The bishop on c4 aims at [[f7]], which only the king defends: see [[the weak f7 square|idea:weak-f7]].',
  'If Black tries {4...Nf6} instead of guarding the centre, {5. d4} hits [[the bishop on c5|c5]] and the pawn on [[e5|e5]] at once, and [the position after 5.d4](r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/2P2N2/PP3PPP/RNBQK2R b KQkq -) is easy for White.',
  'The plan is [[c3-d4|idea:c3-d4]], but [[develop first|idea:develop-first]].',
].join('\n\n');

function RichDemo() {
  const linked = useLinkedBoard(MAIN, 6);
  return (
    <Columns>
      <div className="grid gap-1">
        <Board {...linked.props} />
        {linked.previewing ? (
          <p className="text-xs text-muted-foreground">Previewing; click a position to pin it.</p>
        ) : null}
      </div>
      <RichText
        text={RICH}
        context={MAIN_CONTEXT}
        ideas={IDEAS}
        side={LEARNER}
        board={{
          ...linked.board,
          onMove: (ply) => {
            const index = ply + 1;
            if (index < MAIN.length) linked.setIndex(index);
          },
        }}
      />
    </Columns>
  );
}

const shareOf = (epd: string) => ((gamesAt(epd) ?? 0) / START_GAMES) * 100;
const giuocoLines = ['giuoco-piano-main', 'giuoco-piano-d5', 'giuoco-piano-bg4'].map((id) => {
  const each = line(id);
  return {
    id,
    name: each.name.replace('Giuoco Piano: ', '').replace(/^./, (c) => c.toUpperCase()),
    kind: each.kind as 'main' | 'sideline',
    href: '#line',
    endEpd: each.moves.at(-1)!.after,
  };
});
const legalCard = {
  id: 'legal-mate',
  name: 'Legal Mate trap',
  kind: 'for-us' as const,
  href: '#line',
  endEpd: legal.at(-1)!.after,
};

export const boardMoreMocks: MockItem[] = [
  {
    id: 'board-controls',
    variants: [
      {
        name: 'Studying a line',
        note: 'Settings, flip, the steps. No Hint or Show me: nothing is being asked.',
        render: () => <ControlsDemo />,
      },
      {
        name: 'An exercise waiting for an answer',
        note: 'The side is fixed, so no flip; forward stops at the move asked. Hint lights the piece, Show me draws the move.',
        render: () => <ControlsDemo exercise flippable={false} asked={6} />,
      },
      {
        name: 'Tries spent',
        note: 'Show me stands out once the tries have run out (teach.triesBeforeShown).',
        render: () => <ControlsDemo exercise flippable={false} asked={6} triesSpent />,
      },
      {
        name: 'Exam preset: no help offered',
        note: 'feedback.hints off: Hint and Show me are hidden, not greyed.',
        render: () => <ControlsDemo exercise flippable={false} asked={6} hintsAllowed={false} />,
      },
      {
        name: 'With the page’s own actions',
        note: 'Last in the row, after everything else.',
        render: () => (
          <ControlsDemo
            exercise
            flippable={false}
            asked={6}
            actions={
              <>
                <Button variant="outline" size="sm">
                  <RotateCcw aria-hidden />
                  Restart
                </Button>
                <Button size="sm">
                  Next
                  <ArrowRight aria-hidden />
                </Button>
              </>
            }
          />
        ),
      },
      {
        name: 'A still position with one action',
        note: 'No line to step through: only the gear, flip and "Open on the board".',
        render: () => (
          <ControlsDemo
            stepper={false}
            actions={
              <Button variant="outline" size="sm">
                <SquareArrowOutUpRight aria-hidden />
                Open on the board
              </Button>
            }
          />
        ),
      },
    ],
  },
  {
    id: 'board-settings-menu',
    variants: [
      {
        name: 'The gear',
        note: 'Opens the menu as a popover (a bottom sheet on a phone). Changes apply at once and are saved.',
        render: () => (
          <div className="grid gap-2">
            <BoardSettingsMenu groups={['look', 'display']} />
            <SettingsReadout />
          </div>
        ),
      },
      {
        name: 'What the menu holds',
        note: 'Look, Display and Engine (Engine only on boards with an eval part). A reset shows beside anything changed.',
        render: () => (
          <div className="grid max-w-80 gap-2 rounded-lg border p-4">
            <BoardSettingsForm groups={['look', 'display', 'engine']} />
          </div>
        ),
      },
      {
        name: 'On a phone: a bottom sheet',
        note: 'The same rows, from the bottom of the screen.',
        render: () => <BoardSettingsMenu groups={['look', 'display', 'engine']} layout="sheet" />,
      },
      {
        name: 'Two boards, one setting',
        note: 'Change something in either menu and both read it: the settings are shared by every board on the page.',
        render: () => (
          <div className="grid gap-2">
            <div className="flex gap-2">
              <BoardSettingsMenu />
              <BoardSettingsMenu groups={['engine']} />
            </div>
            <SettingsReadout />
          </div>
        ),
      },
    ],
  },
  {
    id: 'step-buttons',
    variants: [
      {
        name: 'Part-way along a line',
        note: 'Hold back or forward to repeat. The arrow keys, Home and End do the same on the primary board (on here).',
        render: () => <StepDemo start={6} keys />,
      },
      { name: 'At the start', note: 'Start and back disabled, kept in place.', render: () => <StepDemo start={0} /> },
      { name: 'At the end', note: 'Forward and end disabled.', render: () => <StepDemo start={MAIN.length - 1} /> },
      {
        name: 'A step that starts part-way',
        note: 'min: the first position stepping may reach is after 3...Bc5.',
        render: () => <StepDemo start={8} min={6} />,
      },
      {
        name: 'During an exercise',
        note: 'Asked at 4.c3: back is looking back, forward never goes past the move being asked.',
        render: () => <StepDemo start={4} asked={6} />,
      },
      {
        name: 'Off the line',
        note: 'Stepping through a refutation: "Back to the line" follows the four buttons.',
        render: () => <StepDemo start={9} offLine />,
      },
    ],
  },
  {
    id: 'board-explorer',
    variants: [
      {
        name: 'Follow the moves',
        note: 'Real counts at 1000 to 1600. Hover a row to draw the move; click to play it and the panel follows. Positions the bake lacks ask for a token.',
        render: () => <ExplorerDemo start={m[6]!.before} startPly={6} />,
      },
      {
        name: 'Black to move: a gap',
        note: 'After 3.Bc4. 3...Nf6 is the most played reply and no line here answers it: "Not covered" links to the gap.',
        render: () => <ExplorerDemo start={m[5]!.before} startPly={5} />,
      },
      {
        name: 'Only showing, not playing',
        note: 'Without onPlay a click only shows the move: the Legal Mate position after 5...Bh5, with 6.Nxe5 the opening’s move and the popular 6.g4 a mistake.',
        render: () => <ExplorerDemo start={legal[10]!.before} startPly={10} onPlay={false} />,
      },
      {
        name: 'Fewer rows, the rest under More',
        render: () => <BoardExplorer state={explorerState(m[5]!.before)} ply={5} limit={3} />,
      },
      { name: 'Loading', render: () => <BoardExplorer state={{ status: 'loading' }} ply={6} /> },
      {
        name: 'Live from Lichess',
        note: 'Another band, asked of the live explorer with the learner’s token.',
        render: () => {
          const state = explorerState(m[2]!.before);
          return (
            <BoardExplorer
              state={state.status === 'ready' ? { ...state, source: 'live' } : state}
              ply={2}
              band="1600 to 2000"
            />
          );
        },
      },
      {
        name: 'No games',
        render: () => <BoardExplorer state={{ status: 'ready', rows: [], games: 0, source: 'baked' }} ply={20} />,
      },
      {
        name: 'A Lichess error',
        render: () => (
          <BoardExplorer
            state={{ status: 'error', message: 'Could not reach Lichess. Trying again in a minute.' }}
            ply={6}
          />
        ),
      },
      { name: 'No token, no baked numbers', render: () => <BoardExplorer state={{ status: 'no-token' }} ply={6} /> },
      {
        name: 'While testing',
        note: 'Hidden at the learn and test reveal levels: nothing renders below.',
        render: () => <BoardExplorer state={explorerState(m[6]!.before)} ply={6} reveal="test" />,
      },
    ],
  },
  {
    id: 'board-feedback',
    variants: [
      {
        name: 'A right move',
        note: 'The tick on the board, Book, and the move’s comment, which stays until your next move.',
        render: () => <FeedbackDemo feedback={FEEDBACK.right!} at={rightAt.before} />,
      },
      {
        name: 'A wrong move, with why',
        note: '5.Nxe5 in the Legal Mate line, before h3: graded from the stored evaluations, with the author’s note. Show why steps through the refutation on the board.',
        render: () => <FeedbackDemo feedback={FEEDBACK.wrong!} at={blunderAt.before} />,
      },
      {
        name: 'As good, but not the line’s move',
        note: 'No cross, no try used; the grade kept, and the line’s move asked for.',
        render: () => <FeedbackDemo feedback={FEEDBACK.alternative!} at={rightAt.before} />,
      },
      {
        name: 'The opponent’s mistake',
        note: `5...Bh5 is played in ${bh5Share}% of games at the band: find the punishment.`,
        render: () => <FeedbackDemo feedback={FEEDBACK.opponent!} at={bh5.before} />,
      },
      {
        name: 'A missed punishment',
        note: '6.g4 instead of 6.Nxe5. Show why plays the punishment through.',
        render: () => <FeedbackDemo feedback={FEEDBACK.miss!} at={punish.before} />,
      },
      {
        name: 'Symbol only',
        note: 'feedback.explain set to the symbol: the grade without the sentence.',
        render: () => <BoardFeedback feedback={FEEDBACK.wrong!} explain="symbol" />,
      },
      {
        name: 'A miss that waits for Next',
        note: 'Something to read, so it stays up with Next; tries and help in one quiet line.',
        render: () => (
          <BoardFeedback feedback={FEEDBACK.miss!} explain="sentence" onNext={() => {}} triesLeft={0} help="hint" />
        ),
      },
      {
        name: 'A move with no feedback',
        note: 'Stepped back to a move with none: the panel is empty.',
        render: () => <BoardFeedback feedback={null} />,
      },
    ],
  },
  {
    id: 'board-notes',
    variants: [
      {
        name: 'Following the board',
        note: 'Step through: the comment, ideas, tags and the key follow the cursor. "More about this move" opens the full explanation.',
        render: () => <NotesDemo />,
      },
      {
        name: 'A move with marks and a name',
        note: '3.Bc4: the Idea arrow at f7, the key under the comment, and the position’s name with its ECO code.',
        render: () => <BoardNotes move={notesFor(4)} />,
      },
      {
        name: 'At the start',
        note: 'Before any move: the variation’s own text.',
        render: () => <BoardNotes startText={example.opening.variations[0]!.intro} />,
      },
      {
        name: 'Learn: the comment ahead of the move',
        note: 'At the learn level the next move’s comment shows before it is played.',
        render: () => <BoardNotes reveal="learn" move={notesFor(5)} ahead={notesFor(6)} />,
      },
      {
        name: 'A move with tags and no comment',
        note: 'No "No comment": only what there is.',
        render: () => (
          <BoardNotes
            move={{
              ply: 9,
              san: 'Bh5',
              symbol: '?',
              tags: ['Trap', 'Common blunder'],
              ideas: <IdeaBadge idea={IDEAS.pin} />,
            }}
          />
        ),
      },
      {
        name: 'While testing',
        note: 'Hidden at the test level: a note would give the answer away. Nothing renders below.',
        render: () => <BoardNotes move={notesFor(6)} reveal="test" />,
      },
    ],
  },
  {
    id: 'position-card',
    variants: [
      {
        name: 'Cards in a grid',
        note: 'The whole card is a link; the line links keep their own clicks and preview where the line goes.',
        render: () => (
          <div className="grid gap-3 sm:grid-cols-3">
            <PositionCard
              epd={m[4]!.after}
              lastMove={squares(m[4]!.uci)}
              name={{ name: 'Italian Game', eco: 'C50' }}
              moves={{ run: m.slice(2, 5), firstPly: 2, cut: true }}
              sharePct={shareOf(m[4]!.after)}
              lines={[...giuocoLines, legalCard]}
              openings={[{ name: 'Italian Game, as White', state: 'learning' }]}
              href="#board"
            />
            <PositionCard
              epd={m[5]!.after}
              lastMove={squares(m[5]!.uci)}
              name={{ name: 'Italian Game: Giuoco Piano', eco: 'C50' }}
              moves={{ run: m.slice(3, 6), firstPly: 3, cut: true }}
              sharePct={shareOf(m[5]!.after)}
              lines={giuocoLines}
              score={scoreOf(m[5]!.after)}
              href="#board"
            />
            <PositionCard
              epd={legal[9]!.after}
              lastMove={squares(legal[9]!.uci)}
              name={{ name: 'Italian Game: Paris Defense' }}
              moves={{ run: legal.slice(7, 10), firstPly: 7, cut: true }}
              sharePct={shareOf(legal[9]!.after)}
              lines={[legalCard]}
              reason="Shows a pin"
              href="#board"
            />
          </div>
        ),
      },
      {
        name: 'As a row',
        note: 'In a list: the thumb beside, the name cut short first.',
        render: () => (
          <div className="max-w-xl">
            <PositionCard
              layout="row"
              epd={m[6]!.after}
              lastMove={squares(m[6]!.uci)}
              name={{ name: 'Italian Game: Giuoco Piano, Main Line', eco: 'C53' }}
              moves={{ run: m.slice(4, 7), firstPly: 4, cut: true }}
              sharePct={shareOf(m[6]!.after)}
              lines={giuocoLines}
              openings={[{ name: 'Italian Game, as White', state: 'known' }]}
              reason="Matches your board search"
              href="#board"
            />
          </div>
        ),
      },
      {
        name: 'Little known',
        note: 'Empty fields are left out, never "0" or "none".',
        render: () => (
          <div className="max-w-56">
            <PositionCard
              epd={blunderPlayed.epd}
              lastMove={{ from: blunderPlayed.from, to: blunderPlayed.to }}
              href="#board"
            />
          </div>
        ),
      },
      {
        name: 'Loading',
        note: 'Keeps its size with a muted thumb; share and lines fill in.',
        render: () => (
          <div className="max-w-56">
            <PositionCard epd={m[5]!.after} name={{ name: 'Italian Game: Giuoco Piano' }} loading href="#board" />
          </div>
        ),
      },
    ],
  },
  {
    id: 'move-explanation',
    variants: [
      {
        name: 'Everything about 4.c3',
        note: 'Comment, verdict, how often (real counts), why not the others (graded from the evaluations), and what it leaves.',
        render: () => {
          const explained = explanationFor(6);
          return (
            <MoveExplanation
              {...explained}
              side={LEARNER}
              name={{ name: 'Italian Game: Giuoco Piano, Main Line', eco: 'C53' }}
              ideas={<IdeaBadge idea={IDEAS['c3-d4']} />}
              tags={['Tip']}
              alternatives={explained.alternatives.map((alt, i) =>
                i === 0
                  ? {
                      ...alt,
                      because: 'Just as good: the other main way, keeping d4 for later and castling first.',
                      authored: true,
                    }
                  : alt,
              )}
              features={<PositionFeatures epd={m[6]!.after} learner={LEARNER} limit={3} />}
            />
          );
        },
      },
      {
        name: 'Compact, beside a board',
        note: 'The move, what it does, its ideas.',
        render: () => (
          <MoveExplanation
            {...explanationFor(4)}
            side={LEARNER}
            form="compact"
            name={{ name: 'Italian Game', eco: 'C50' }}
            ideas={<IdeaBadge idea={IDEAS['weak-f7']} />}
          />
        ),
      },
      {
        name: 'No comment: the site’s own words',
        note: '6...Bg4 in the pin line, which the author left bare: sentences from looking at the board, marked as ours.',
        render: () => {
          const bg4 = line('giuoco-piano-bg4').moves[11]!;
          const feature = findFeatures(bg4.after, ['pin'])[0];
          return (
            <MoveExplanation
              move={{ ply: 11, san: bg4.san, uci: bg4.uci, after: bg4.after, grade: 'book' }}
              siteSentences={['Develops the bishop.', ...(feature ? [feature.text] : [])]}
              scoreAfter={scoreOf(bg4.after)}
            />
          );
        },
      },
      {
        name: 'While the words are still coming',
        note: 'Parts fill in as they are known; the space is kept so nothing jumps.',
        render: () => {
          const bg4 = line('giuoco-piano-bg4').moves[11]!;
          return <MoveExplanation move={{ ply: 11, san: bg4.san, uci: bg4.uci, after: bg4.after }} />;
        },
      },
      {
        name: 'A blunder',
        note: '7...Bxd1, taking the queen in the Legal Mate: graded from the evaluations, mate follows.',
        render: () => {
          const bxd1 = legal[11]!;
          const judged = judge(bxd1.before, playMove(bxd1.before, bxd1.san)!, true);
          return (
            <MoveExplanation
              move={{ ply: 11, san: bxd1.san, uci: bxd1.uci, after: bxd1.after, grade: judged?.grade ?? 'blunder' }}
              comment="Takes the queen, and walks into mate in two: {8. Bxf7+ Ke7 9. Nd5#}."
              context={{ startEpd: START_EPD, moves: legal.map((move) => ({ ...move })) }}
              ideas={<IdeaBadge idea={IDEAS['legal-mate']} />}
              scoreAfter={scoreOf(bxd1.after)}
            />
          );
        },
      },
    ],
  },
  {
    id: 'position-features',
    variants: [
      {
        name: 'Stepping through the Legal Mate',
        note: 'Hover an item to light its squares on the board; click to pin it while you look. It follows the cursor.',
        render: () => <FeaturesDemo lineId="legal-mate" start={10} />,
      },
      {
        name: 'Something attacked: after 4...Nf6',
        note: 'The e4 pawn is attacked and undefended: "watch out" for White.',
        render: () => <FeaturesDemo lineId="giuoco-piano-main" start={8} />,
      },
      {
        name: 'Mate in one',
        note: 'Before 9.Nd5: the most urgent item first.',
        render: () => <FeaturesDemo lineId="legal-mate" start={14} limit={2} />,
      },
      {
        name: 'Threats only',
        note: 'kinds: a step can ask for pieces that can be taken and pins only.',
        render: () => (
          <PositionFeatures epd={legal[10]!.after} learner={LEARNER} kinds={['hanging', 'attacked', 'pin']} />
        ),
      },
      {
        name: 'Nothing found',
        render: () => <PositionFeatures epd={START_EPD} learner={LEARNER} />,
      },
      {
        name: 'While testing',
        note: 'Never at the test level: it would be the answer. Nothing renders below.',
        render: () => <PositionFeatures epd={legal[9]!.after} reveal="test" />,
      },
    ],
  },
  {
    id: 'idea-badge',
    variants: [
      {
        name: 'One of each kind',
        note: 'Tactic, plan, structure, principle, trap pattern, each with its icon. Hover for the summary; a tactic shows its example.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {['weak-f7', 'c3-d4', 'italian-chain', 'develop-first', 'legal-mate'].map((id) => (
              <IdeaBadge key={id} idea={IDEAS[id]} />
            ))}
          </div>
        ),
      },
      {
        name: 'With progress',
        note: 'Open, learning (seen), known (practised): on in a step’s Done and on Today.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            <IdeaBadge idea={IDEAS.pin} progress="open" />
            <IdeaBadge idea={IDEAS['weak-f7']} progress="learning" />
            <IdeaBadge idea={IDEAS['c3-d4']} progress="known" />
          </div>
        ),
      },
      {
        name: 'Inline in a sentence',
        render: () => (
          <p className="text-sm">
            The bishop on g4 sets up a <IdeaBadge idea={IDEAS.pin} size="inline" />, and White breaks it with the{' '}
            <IdeaBadge idea={IDEAS['legal-mate']} size="inline" />.
          </p>
        ),
      },
      {
        name: 'In the middle of an exercise',
        note: 'The link opens in a new tab, so the session is never lost to a click.',
        render: () => <IdeaBadge idea={IDEAS.pin} inExercise />,
      },
      {
        name: 'An idea that no longer exists',
        note: 'Plain text, never a broken link.',
        render: () => <IdeaBadge name="Minority attack" />,
      },
      {
        name: 'Would name the answer',
        note: 'Hidden at the test level when it gives the answer away ("Pin" before the puzzle is solved). Nothing renders below.',
        render: () => <IdeaBadge idea={IDEAS.pin} reveal="test" givesAway />,
      },
    ],
  },
  {
    id: 'kind-badge',
    variants: [
      {
        name: 'Every kind',
        note: 'Hover for what each means.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {(['main', 'sideline', 'rare', 'gambit', 'for-us', 'against-us'] as const).map((kind) => (
              <KindBadge key={kind} kind={kind} />
            ))}
          </div>
        ),
      },
      {
        name: 'Kind and risk',
        render: () => (
          <div className="grid gap-2">
            <KindBadge kind="main" risk="low" show="kind and risk" />
            <KindBadge kind="sideline" risk="medium" show="kind and risk" />
            <KindBadge kind="gambit" risk="high" show="kind and risk" />
          </div>
        ),
      },
      {
        name: 'Everything, with character and tricks',
        note: 'The first three and "…" to open the rest in place.',
        render: () => (
          <KindBadge
            kind="for-us"
            risk="medium"
            show="all"
            tags={[
              { name: 'Tactical', hint: 'Tactics decide it more than plans.' },
              { name: 'Early mate', hint: 'You can mate before move ten if they take the queen.' },
              { name: 'Queen sacrifice', hint: 'You offer the queen on purpose.' },
              { name: 'Pin', hint: 'A pin that is not what it seems.' },
              { name: 'Common at your level', hint: 'Black falls for it often at 1000 to 1600.' },
            ]}
          />
        ),
      },
      {
        name: 'A trap written for the other side',
        note: 'Written for Black as a trap to spring; for a White learner it shows flipped, as a trap to avoid.',
        render: () => <KindBadge kind="for-us" writtenFor="black" learner="white" />,
      },
      {
        name: 'While testing',
        note: 'A trap to spring is hidden at the test level until it is sprung. Nothing renders below.',
        render: () => <KindBadge kind="for-us" reveal="test" />,
      },
    ],
  },
  {
    id: 'opening-name',
    variants: [
      {
        name: 'Opening and variation, with ECO',
        note: 'The ECO badge opens the position on Lichess in a new tab.',
        render: () => (
          <OpeningName
            name="Italian Game: Giuoco Piano"
            eco="C50"
            lichessUrl={lichessOpeningUrl('Italian Game: Giuoco Piano')}
          />
        ),
      },
      {
        name: 'One of our openings, with its side',
        note: 'The names link to our opening and variation pages.',
        render: () => (
          <OpeningName
            name="Italian Game: Giuoco Piano"
            side="as White"
            href="#opening"
            variationHref="#variation"
            eco="C50"
          />
        ),
      },
      {
        name: 'Opening only, variation only',
        render: () => (
          <div className="grid gap-1">
            <OpeningName name="Italian Game: Giuoco Piano" level="opening" />
            <OpeningName name="Italian Game: Giuoco Piano" level="variation" />
            <OpeningName name="Caro-Kann Defense" side="against 1.e4" eco="B10" />
          </div>
        ),
      },
      {
        name: 'In a one-line row',
        note: 'The variation part is cut with "…" first; hover gives the full name.',
        render: () => (
          <div className="w-64 rounded-md border p-2">
            <OpeningName name="Italian Game: Giuoco Piano, Center Attack, Greco Gambit" eco="C54" oneLine />
          </div>
        ),
      },
      {
        name: 'Without a Lichess address',
        note: 'The code as a plain badge.',
        render: () => <OpeningName name="Italian Game: Paris Defense" eco="C50" />,
      },
      {
        name: 'Name it, before answering',
        note: 'The name is the answer, so it is not drawn at the test level. Nothing renders below.',
        render: () => <OpeningName name="Italian Game: Giuoco Piano" reveal="test" isAnswer />,
      },
    ],
  },
  {
    id: 'rich-text',
    variants: [
      {
        name: 'Beside a board',
        note: 'Hover a dotted position to see it on the board, click to pin; hover a move or a square to light it; a move chip goes there.',
        render: () => <RichDemo />,
      },
      {
        name: 'With no board near',
        note: 'Positions and moves open a small preview card instead.',
        render: () => <RichText text={RICH} context={MAIN_CONTEXT} ideas={IDEAS} side={LEARNER} />,
      },
      {
        name: 'Plain, in a search result',
        note: 'Positions as plain words and moves as plain text.',
        render: () => <RichText text={RICH} context={MAIN_CONTEXT} ideas={IDEAS} plain />,
      },
      {
        name: 'With a diagram',
        note: 'An inline board where the author asks for one.',
        render: () => (
          <RichText
            text={`The Legal Mate ends here: [[board:${legal.at(-1)!.after}]] Three minor pieces mate the king that took the queen.`}
          />
        ),
      },
      {
        name: 'Bad markup',
        note: 'A link that does not read as a position, moves that are not on the line, an unknown idea: left as plain words.',
        render: () => (
          <RichText
            text="See [this position](not a fen), or {9. Qh5} which the line never reaches, and [[the minority attack|idea:minority]]."
            context={MAIN_CONTEXT}
            ideas={IDEAS}
          />
        ),
      },
      {
        name: 'The syntax',
        note: 'Explicit marks, so the build can check every one.',
        render: () => (
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {[
              '[the position after Nxf7](FEN or EPD)   a position',
              '{4. Ng5 d5}  {3...Nf6}                  moves, resolved against the line',
              '[[d5]]  [[the bishop on b5|b5]]         a square (or "b5,c6"), lit on the board',
              '[[idea:fork]]  [[a fork|idea:fork]]     an idea',
              '[[board:FEN or EPD]]                    a small diagram',
            ].join('\n')}
          </pre>
        ),
      },
    ],
  },
];
