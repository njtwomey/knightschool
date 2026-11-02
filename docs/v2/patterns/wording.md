# Wording

How the site writes: plain British English, no exclamation marks, one word for each thing, and move numbers written one
way everywhere.

## The rule

- **Plain English**, short sentences, written for someone who knows the moves and little else. A chess term the
  learner may not know links to its [idea](../pages/idea.md) page the first time it appears on a page.
- **No exclamation marks** in the interface, not even for good news ("Step known. 4 moves join your reviews."). No
  "Oops", "Great job", "Awesome". The `!` of a move symbol is chess notation, not tone.
- **British spelling**: colour, practise (verb) and practice (noun), centre, defence, behaviour, analyse.
- **Sentence case** for headings, buttons and menu items ("Show me", "Use it in this tab"); buttons are verbs.
- **Names of openings, variations and lines.** The name shown is the author's `name` when one is written, else
  Lichess's name for the position where the variation or line starts. Lichess names keep Lichess's spelling as proper
  names ("Two Knights Defense", "Caro-Kann Defense"); everything we write around them is British ("the defence").
- **You** is the learner; **White** and **Black** are capitalised; "the computer" plays the other side.
- **Errors say what to do**, never blame: "Could not reach Lichess. Trying again in a minute."

**Move numbers**, from `packages/core/src/chess/notation.ts`; never formatted by hand:

| Case             | Written           | Helper                            |
| ---------------- | ----------------- | --------------------------------- |
| One White move   | `1.e4`            | `numberedMove`, `moveNumberLabel` |
| One Black move   | `1...e5`          | `numberedMove`                    |
| A run            | `1. e4 e5 2. Nf3` | `numberedLine`                    |
| A run from Black | `3... Nf6 4. Ng5` | `numberedLine`, `runMove`         |

**The vocabulary**:

| Say                    | Means                                                     | Never say                     |
| ---------------------- | --------------------------------------------------------- | ----------------------------- |
| Repertoire             | the openings you have chosen, one per slot                | courses I am learning         |
| Opening                | one opening for one side ("Italian Game, as White")       | course                        |
| Variation              | a named branch of an opening, with Lichess's name         | chapter, section              |
| Line                   | one exact sequence of moves                               | chapter, variation (for this) |
| Step                   | about four of your moves, learned and tested at once      | lesson, unit                  |
| Idea                   | a named piece of understanding: a tactic, plan, structure | motif                         |
| Position               | a board state                                             | node, FEN (in the interface)  |
| Read, Watch, Try, Done | the four stages of a step                                 | Learn and Drill (for stages)  |
| Review                 | the spaced-repetition session                             | Quiz (for this)               |
| Locked, Open, Learning | the states before a move, step or variation is known      | ready, unlocked, new          |
| Known, Mastered        | a move right twice running; asked a week or more apart    | passed, graduated             |
| Cleared                | a checkpoint or final test done to its mark               | passed                        |

**Grades** ([verdict-note](../components/verdict-note.md)), always the word with its symbol, then why:

| Grade      | Symbol | Sentence shape                                        |
| ---------- | ------ | ----------------------------------------------------- |
| Book       |        | "Book: the opening's move."                           |
| Best       |        | "Best: the engine's first choice."                    |
| Excellent  | `!`    | "Excellent: as good as the opening's move."           |
| Good       |        | "Good: a little less than the best, still fine."      |
| Inaccuracy | `?!`   | "An inaccuracy: Black gets an easy game after ...d5." |
| Mistake    | `?`    | "A mistake: after ...Nxg5 the knight is lost."        |
| Blunder    | `??`   | "A blunder: ...Qh4 is mate."                          |
| Miss       |        | "A miss: 7.Qh5 wins a piece here."                    |

A move that is not the line's but is as good keeps its grade (Good or Excellent) and adds the flag **not your repertoire
move**: "Excellent, but not your repertoire move: this opening plays 4.c3. Play it." Never "wrong", never a mistake
(capabilities.md section 2).

**Numbers**: evaluations in pawns with a sign and one decimal, after words ("White is a little better (+0.6)"); costs
as "costs 1.2 pawns" in sentences and centipawns only in the tries table's column; shares as "in 12% of games at your
level".

## Where it applies

Every string in the interface, every authored comment and step text (the add-course skill holds the content side), and
the settings registry's labels, hints and `explain` lines.

## From v1

- `packages/core/src/chess/notation.ts`: the move-number helpers, kept.
- `CLAUDE.md` Conventions: "UI copy: plain English, no exclamation marks."
- `apps/web/src/components/tags/hints.ts` (`KIND_LABEL`, `kindLabel`): one name per kind; `features/path/unit-state.ts`
  (unit state names and blurbs, renamed in v2); `packages/core/src/training/regret.ts` (memory slip, inaccuracy,
  mistake), replaced by the grades above.
