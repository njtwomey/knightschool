# Making openings

What an opening has to be before it ships, and how much to write. The mental model is in `CLAUDE.md`, the steps are in
the `add-content` skill (`.claude/skills/add-content`), the formats in [schemas/content.md](schemas/content.md) and the
numbers in `content/config.yaml`. The catalogue itself is `content/tracks.yaml`; work in progress is in
`docs/progress-v2/`.

## Breadth first

The learner is building general knowledge of the top openings from zero, so the catalogue grows across before it grows
down: the main lines of many openings before the depths of one. An opening ships at the **first pass** and rises towards
the **full bar** when it earns the work. v1 grew to 22 courses written quickly; what we keep from that is the warning.
Each opening is deliberate, however small.

## First pass: what ships

**Size.** 10 to 20 lines, counting short links. A smaller opening takes fewer (the rare replies, an answer to a flank
opening). A flagship may take about 30. Prefer the line most games at the band reach over the one that is theoretically
richest.

**System.** One plan, chosen with the numbers. Where the opening has a choice of system (White's third move against the
French), set out each candidate's share, score at the band and evaluation. Moves within about 0.2 on the engine are
equals, so the score and the simplicity of the plan decide. Say when a good score may come from who plays the move and
not from the move.

**Coverage.** Most common replies first, until the size runs out. A reply left out is a gap to list, not a failure. Move
ten is the full bar's target, not the first pass's.

**Link lines.** A reply that walks into a position already taught needs a short link line only if it is played at least
`coverage.minShare` of the time. Below that it is a gap: the learner already knows the position. Links count towards
the size.

An opening ships when:

1. **Engine-checked.** Analysed at `engine.bakedDepth`, and `content:check` says the authors and the engine agree. It
   may list positions that are already mate; nothing else stays open.
2. **Mistakes punished.** The band's common mistakes that `content:check` names have a refutation with a note saying
   what is won, or plainly that the gain is positional.
3. **Explained.** A setup, an introduction, a plan in one sentence, an introduction for each variation, a title and text
   for each step, a note on every move with something to say. Claims of advantage match the evaluation.
4. **Shaped.** About five to eight variations of three to six steps; a small opening has fewer.
5. **Checked.** `make doctor` and `make check` pass and `make puzzles` has run.
6. **Reported.** What was chosen and why, what the data changed, the gaps left, and what to look at in the browser.

Nothing unfinished is committed: a commit on `v2` reaches the site with the next push.

## The full bar

An opening has reached the bar when, beyond the first pass:

1. **Coverage.** Every reply played at least `coverage.minShare` of the time at the band is answered, to about move 10,
   and the opening's coverage is shown.
2. **Their mistakes.** Every reply played at least `coverage.punishShare` of the time that loses `coverage.punishLossCp`
   or more is punished, in a follow-up of the step whose stretch it falls in, not only a question.
3. **Your mistakes.** The tempting wrong moves at each of your moves have a verdict, and the worst have a refutation
   written in words.
4. **Fine at the end.** Every line ends in a position that is fine for you, and the opening says how fine.
5. **Marked.** Marks on the key moves, and one to three ideas on each step.
6. **Beyond the moves.** Puzzles from its positions and structures, and two or three Play on positions with their plans.
7. **Credited.** Every source named.

No opening has reached it yet. Nothing here is checked by a tool except what `content:check` reports.

## From a video, a book or an article

Take the ideas, write them in our own words, check every claim with the engine, credit the source, and keep one comment
per move (merge a new point into the existing comment; the engine settles disagreements).
