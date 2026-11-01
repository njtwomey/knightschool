import { GRADES, playMove } from '@knightschool/core';
import { EvalWords } from '@/components/chess/eval-words';
import { MoveChip } from '@/components/chess/move-chip';
import { MoveRun } from '@/components/chess/move-run';
import { VerdictBadge } from '@/components/chess/verdict-badge';
import { VerdictNote } from '@/components/chess/verdict-note';
import { judgeAgainstLine, line, mainLine } from '../fixtures/example';
import type { MockItem } from './types';

const m = mainLine.moves;
const legal = line('legal-mate').moves;
const bxd1 = legal.findIndex((move) => move.san === 'Bxd1');
const mateRun = legal.slice(bxd1 + 1);

// 4.Ng5 instead of 4.c3: the most played wrong move there, judged against the line.
const ng5 = playMove(m[6]!.before, 'f3g5')!;
const ng5Judged = judgeAgainstLine(m[6]!, { uci: 'f3g5', after: ng5.epd });
// 4.O-O instead of 4.c3: sound, but not the line's move.
const castles = playMove(m[6]!.before, 'e1g1')!;
const castlesJudged = judgeAgainstLine(m[6]!, { uci: 'e1g1', after: castles.epd });

export const chessTextMocks: MockItem[] = [
  {
    id: 'move-chip',
    variants: [
      {
        name: 'Theirs and yours',
        note: 'Your moves are bold. Hover any chip for a small board of the position after it.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            <MoveChip ply={4} san="Bc4" epd={m[4]!.after} from="f1" to="c4" mine />
            <MoveChip ply={5} san="Bc5" epd={m[5]!.after} from="f8" to="c5" />
          </div>
        ),
      },
      {
        name: 'The current move',
        render: () => (
          <MoveChip ply={6} san="c3" epd={m[6]!.after} from="c2" to="c3" mine current onSelect={() => {}} />
        ),
      },
      {
        name: 'With grades',
        note: 'The symbol in its grade colour.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {(['best', 'inaccuracy', 'mistake', 'blunder'] as const).map((grade, i) => (
              <MoveChip
                key={grade}
                ply={8 + i * 2}
                san={['d3', 'd4', 'Ng5', 'Qe2'][i]!}
                grade={grade}
                mine
                preview={false}
              />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    id: 'move-run',
    variants: [
      {
        name: 'The main line in text',
        note: 'Numbers where a run needs them; hover any move to see it.',
        render: () => <MoveRun moves={m.slice(0, 12)} side="white" />,
      },
      {
        name: 'Starting part-way, at Black’s move',
        render: () => <MoveRun moves={m.slice(9, 14)} firstPly={9} side="white" />,
      },
      {
        name: 'The current move marked',
        render: () => <MoveRun moves={m.slice(0, 10)} side="white" current={6} onSelect={() => {}} />,
      },
    ],
  },
  {
    id: 'position-preview',
    variants: [
      {
        name: 'Hover a move',
        note: 'The preview opens from any move chip: in a run, a table, a note.',
        render: () => (
          <p className="text-sm">
            After <MoveChip ply={6} san="c3" epd={m[6]!.after} from="c2" to="c3" mine /> White is ready for d4, and
            after <MoveChip ply={7} san="Nf6" epd={m[7]!.after} from="g8" to="f6" /> Black hits e4.
          </p>
        ),
      },
    ],
  },
  {
    id: 'verdict-badge',
    variants: [
      {
        name: 'Every grade',
        note: 'Chess.com’s Game Review words, which beginners know; no Brilliant. Hover for what each means.',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {GRADES.map((grade) => (
              <VerdictBadge key={grade} grade={grade} />
            ))}
          </div>
        ),
      },
      {
        name: 'Small, symbol only where there is one',
        render: () => (
          <div className="flex flex-wrap gap-2">
            {GRADES.map((grade) => (
              <VerdictBadge key={grade} grade={grade} size="sm" showName={false} />
            ))}
          </div>
        ),
      },
    ],
  },
  {
    id: 'verdict-note',
    variants: [
      {
        name: 'A mistake, with the cost',
        note: '4.Ng5 instead of 4.c3: the most played wrong move there at 1000 to 1600, graded by Stockfish.',
        render: () => (
          <VerdictNote
            grade={ng5Judged?.grade ?? 'mistake'}
            ply={6}
            san="Ng5"
            costCp={ng5Judged ? Math.round(ng5Judged.cost.cp) : undefined}
            because="Attacks f7 too early: Black simply castles or plays ...h6, and the knight has to go back."
          />
        ),
      },
      {
        name: 'Sound, but not your move',
        note: '4.O-O: fine by the engine, but the line plays 4.c3. No try is used up.',
        render: () => (
          <VerdictNote
            grade={castlesJudged?.grade ?? 'good'}
            ply={6}
            san="O-O"
            costCp={castlesJudged ? Math.round(castlesJudged.cost.cp) : undefined}
            lineMove="4.c3"
          />
        ),
      },
      {
        name: 'A blunder, with the punishment',
        note: 'The Legal Mate: 6...Bxd1?? takes the queen and walks into mate.',
        render: () => (
          <VerdictNote
            grade="blunder"
            ply={bxd1 + 1}
            san="Bxd1"
            because="Takes the queen, but White mates in two."
            refutation={mateRun}
            refutationPly={bxd1 + 2}
          />
        ),
      },
    ],
  },
  {
    id: 'eval-words',
    variants: [
      {
        name: 'From equal to mate',
        note: 'Bands on the winning chance, set in the site config.',
        render: () => (
          <ul className="grid gap-2">
            {[{ cp: 12 }, { cp: 60 }, { cp: -140 }, { cp: 260 }, { cp: -620 }, { mate: 2 }].map((score) => (
              <li key={JSON.stringify(score)}>
                <EvalWords score={score} />
              </li>
            ))}
          </ul>
        ),
      },
      { name: 'With the depth', render: () => <EvalWords score={{ cp: 38 }} depth={18} /> },
      { name: 'Not known yet', render: () => <EvalWords score={null} /> },
    ],
  },
];
