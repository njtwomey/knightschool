import { useState } from 'react';
import { Board, type Reveal } from '@/components/board/board';
import { BoardSurface } from '@/components/board/board-surface';
import { BoardThumb } from '@/components/board/board-thumb';
import { EvalBar } from '@/components/board/eval-bar';
import { EvalWords } from '@/components/chess/eval-words';
import { MarkKey } from '@/components/chess/mark-key';
import { MoveTable } from '@/components/chess/move-table';
import { TriesTable } from '@/components/chess/tries-table';
import { VerdictNote } from '@/components/chess/verdict-note';
import { playMove } from '@knightschool/core';
import { judgeAgainstLine, line, mainLine, positionsOf, scoreOf } from '../fixtures/example';
import { sampleTries } from '../fixtures/tries';
import type { MockItem } from './types';

const MAIN = positionsOf('giuoco-piano-main');
const LEGAL = positionsOf('legal-mate');

/** A board with its own cursor, so the mock can be stepped through like the real thing. */
function SteppingBoard({
  lineId,
  reveal,
  start,
  flippable = true,
}: {
  lineId: string;
  reveal: Reveal;
  start: number;
  flippable?: boolean;
}) {
  const positions = positionsOf(lineId);
  const moves = line(lineId).moves;
  const [index, setIndex] = useState(start);
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Board
        positions={positions}
        index={index}
        onIndex={setIndex}
        reveal={reveal}
        flippable={flippable}
        caption={
          index === 0 ? (
            <span className="text-muted-foreground">The start</span>
          ) : (
            <span>
              {moves[index - 1]!.note?.text ?? <span className="text-muted-foreground">No comment on this move.</span>}
            </span>
          )
        }
      />
      <div className="grid content-start gap-3">
        <EvalWords score={positions[index]!.score ?? null} />
        <MoveTable moves={moves} current={index - 1} onSelect={(i) => setIndex(i + 1)} side="white" />
      </div>
    </div>
  );
}

const wrongAt = mainLine.moves[8]!; // 5.d3: the learner plays 5.d4 instead
const wrongAfter = playMove(wrongAt.before, 'd2d4')!;
const wrongJudged = judgeAgainstLine(wrongAt, { uci: 'd2d4', after: wrongAfter.epd });
const wrongGrade = wrongJudged?.grade ?? 'inaccuracy';
const rightAt = mainLine.moves[6]!; // 4.c3

export const boardMocks: MockItem[] = [
  {
    id: 'board',
    variants: [
      {
        name: 'Study: an opening page',
        note: 'Everything shown: marks, eval bar, comments. Step with the buttons, the arrow keys are off here.',
        render: () => <SteppingBoard lineId="giuoco-piano-main" reveal="study" start={5} />,
      },
      {
        name: 'Watch: the move to play',
        note: 'The violet arrow is the move to play, in a colour no mark uses.',
        render: () => <SteppingBoard lineId="giuoco-piano-main" reveal="learn" start={6} />,
      },
      {
        name: 'Try: being tested',
        note: 'No marks, no eval, no arrows: nothing gives the answer away. The side is fixed, so no flip.',
        render: () => (
          <Board
            positions={MAIN}
            index={6}
            reveal="test"
            flippable={false}
            caption="Your move: what does White play?"
          />
        ),
      },
      {
        name: 'Answered: a right move',
        note: 'A tick on the square; the comment stays until your next move.',
        render: () => (
          <Board
            positions={MAIN}
            index={7}
            reveal="answered"
            flippable={false}
            badge={{ square: 'c3', kind: 'right' }}
            caption={rightAt.note?.text}
          />
        ),
      },
      {
        name: 'Answered: a wrong move, with why',
        note: '5.d4 instead of 5.d3: graded from the stored evaluations, the wrong move in magenta.',
        render: () => (
          <div className="grid gap-4 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <Board
              positions={MAIN}
              index={8}
              reveal="answered"
              flippable={false}
              arrows={[{ from: 'd2', to: 'd4', kind: 'wrong' }]}
              badge={{ square: 'd4', kind: 'grade', grade: wrongGrade }}
            />
            <VerdictNote
              grade={wrongGrade}
              ply={8}
              san="d4"
              costCp={wrongJudged ? Math.round(wrongJudged.cost.cp) : undefined}
              because="Opens the centre before White has castled; after 5...exd4 6.cxd4 Bb4+ Black gets easy play."
              lineMove={wrongAt.san}
            />
          </div>
        ),
      },
      {
        name: 'A trap: the Legal Mate',
        note: 'The author’s marks on the board, in their meaning colours.',
        render: () => <SteppingBoard lineId="legal-mate" reveal="study" start={11} />,
      },
      {
        name: 'Played as Black',
        note: 'The board turned round; the eval bar turns with it.',
        render: () => <Board positions={MAIN} index={9} orientation="black" reveal="study" />,
      },
    ],
  },
  {
    id: 'board-surface',
    variants: [
      {
        name: 'The last move',
        render: () => (
          <div className="max-w-xs">
            <BoardSurface epd={MAIN[5]!.epd} lastMove={MAIN[5]!.lastMove} />
          </div>
        ),
      },
      {
        name: 'Marks: all four colours',
        note: 'Idea (green), Threat (red), Target (yellow), Support (blue), as rings and arrows.',
        render: () => (
          <div className="grid max-w-xs gap-2">
            <BoardSurface epd={MAIN[5]!.epd} marks={{ arrows: ['Gc4f7', 'Rc5f2', 'Bf3e5'], circles: ['Yf7', 'Yf2'] }} />
            <MarkKey marks={{ arrows: ['Gc4f7', 'Rc5f2', 'Bf3e5'], circles: ['Yf7'] }} />
          </div>
        ),
      },
      {
        name: 'Icons on squares',
        note: 'Legal Mate, after 5...Bh5: the knight on f3 is pinned, f7 is the weak square, e5 hangs. Written [%icon pin@f3,weak@f7,hanging@e5].',
        render: () => {
          const marks = { arrows: ['Rh5d1'], icons: ['pin@f3', 'weak@f7', 'hanging@e5'] };
          return (
            <div className="grid max-w-xs gap-2">
              <BoardSurface epd={LEGAL[10]!.epd} lastMove={LEGAL[10]!.lastMove} marks={marks} />
              <MarkKey marks={marks} />
            </div>
          );
        },
      },
      {
        name: 'Every icon',
        note: 'The fixed vocabulary, each in the colour of its meaning: danger red, targets yellow, good squares green, support blue.',
        render: () => {
          const marks = {
            icons: [
              'pin@a8',
              'fork@b8',
              'hanging@c8',
              'attack@d8',
              'check@e8',
              'mate@f8',
              'trap@g8',
              'weak@a1',
              'key@b1',
              'outpost@c1',
              'defended@d1',
            ],
          };
          return (
            <div className="grid max-w-xs gap-2">
              <BoardSurface epd="8/8/8/8/8/8/8/8 w - -" marks={marks} />
              <MarkKey marks={marks} />
            </div>
          );
        },
      },
      {
        name: 'System arrows',
        note: 'The move to play (violet), the engine’s move (slate), a wrong move (magenta): never a mark colour.',
        render: () => (
          <div className="max-w-xs">
            <BoardSurface
              epd={MAIN[6]!.epd}
              arrows={[
                { from: 'c2', to: 'c3', kind: 'play' },
                { from: 'b1', to: 'c3', kind: 'engine' },
                { from: 'f3', to: 'g5', kind: 'wrong' },
              ]}
            />
          </div>
        ),
      },
      {
        name: 'Badges',
        note: 'A tick, a cross, and grades, on the square the piece moved to.',
        render: () => (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BoardSurface epd={MAIN[7]!.epd} lastMove={MAIN[7]!.lastMove} badge={{ square: 'c3', kind: 'right' }} />
            <BoardSurface epd={MAIN[7]!.epd} badge={{ square: 'g5', kind: 'wrong' }} />
            <BoardSurface epd={MAIN[7]!.epd} badge={{ square: 'd4', kind: 'grade', grade: 'mistake' }} />
            <BoardSurface
              epd={LEGAL[12]!.epd}
              lastMove={LEGAL[12]!.lastMove}
              badge={{ square: 'd1', kind: 'grade', grade: 'blunder' }}
            />
          </div>
        ),
      },
    ],
  },
  {
    id: 'board-eval',
    variants: [
      {
        name: 'The bar, from equal to mate',
        note: 'White’s share is its winning chance, so a pawn matters less the further ahead you are.',
        render: () => (
          <div className="flex items-end gap-6">
            {[0, 60, 180, 420, -250].map((cp) => (
              <div key={cp} className="grid justify-items-center gap-2">
                <EvalBar score={{ cp }} className="h-40" />
                <span className="font-mono text-xs">{cp > 0 ? `+${cp / 100}` : cp / 100}</span>
              </div>
            ))}
            <div className="grid justify-items-center gap-2">
              <EvalBar score={{ mate: 2 }} className="h-40" />
              <span className="font-mono text-xs">M2</span>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'move-table',
    variants: [
      {
        name: 'The main line, two moves a row',
        note: 'Your moves (White) in bold, the current one filled. Click a move to go there.',
        render: () => <MoveTable moves={mainLine.moves} current={7} side="white" onSelect={() => {}} />,
      },
      {
        name: 'With grades',
        note: 'A guessed line: each move carries its grade symbol.',
        render: () => (
          <MoveTable
            moves={mainLine.moves
              .slice(0, 10)
              .map((move, i) => ({ ...move, grade: i === 8 ? 'inaccuracy' : undefined }))}
            current={9}
            side="white"
          />
        ),
      },
    ],
  },
  {
    id: 'tries-table',
    variants: [
      {
        name: 'A session on the main line',
        note: 'Every try: the wrong ones are the moves players at 1000 to 1600 most often play there, costed by Stockfish.',
        render: () => <TriesTable tries={sampleTries()} onSelect={() => {}} />,
      },
      { name: 'Before the first move', render: () => <TriesTable tries={[]} /> },
      {
        name: 'A cost still being worked out',
        render: () => (
          <TriesTable
            tries={[{ ply: 10, asked: 'O-O', played: 'Bg5', grade: 'good', costCp: null, drop: null, ms: 5100 }]}
          />
        ),
      },
    ],
  },
  {
    id: 'mark-key',
    variants: [
      {
        name: 'The colours on the board',
        note: 'Only the colours present are listed; hover for their meaning.',
        render: () => <MarkKey marks={{ arrows: ['Gc4f7', 'Rd8h4'], circles: ['Yf7', 'Bd1'] }} />,
      },
      { name: 'One colour', render: () => <MarkKey marks={{ arrows: ['Gc4f7'] }} /> },
    ],
  },
  {
    id: 'board-thumb',
    variants: [
      {
        name: 'Small boards for cards and lists',
        render: () => (
          <div className="flex flex-wrap gap-3">
            {[MAIN[5]!, MAIN[10]!, MAIN[16]!, LEGAL[15]!].map((position) => (
              <BoardThumb key={position.epd} epd={position.epd} lastMove={position.lastMove} className="w-32" />
            ))}
          </div>
        ),
      },
    ],
  },
];

export const mainScore = scoreOf(MAIN[16]!.epd);
