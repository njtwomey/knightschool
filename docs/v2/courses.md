# Making openings

Few openings, each deliberate. v1 grew to 22 courses written quickly; v2 starts with a small catalogue of openings in
which every opening meets the bar below, and grows only as fast as that bar allows.

## The first catalogue

A first repertoire for each side, chosen for beginners (simple plans, few forced lines, many chances for the opponent
to go wrong), plus traps:

| Track                            | Openings                                                                    | v1 starting point                                                                        |
| -------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| First repertoire with 1.e4       | Italian Game (White); against the Sicilian, French, Caro-Kann, Scandinavian | `vs-e5-italian`, `vs-c5-alapin`, `vs-e6-french`, `vs-c6-caro-kann`, `vs-d5-scandinavian` |
| First repertoire with 1.d4       | London System (White)                                                       | `london`                                                                                 |
| Black against 1.e4               | Caro-Kann Defence; 1...e5 (open games), with the Two Knights                | `caro-kann`, `e5-open-games`, `two-knights`                                              |
| Black against 1.d4               | Queen's Gambit Declined, against the London and other systems               | `qgd`, `vs-london`, `vs-d4-systems`                                                      |
| Traps every beginner should know | the traps both sides fall for in these openings                             | traps spread over the v1 courses                                                         |

v1's other courses (the Ruy Lopez, the Queen's Gambit, the gambits, flank openings) stay,
marked as further study, until each is brought up to the bar as a v2 opening.

## The bar

An opening is ready when:

1. **Coverage.** Every reply played in at least 5% of games at the 1000 to 1600 band is answered, to about move 10,
   and the opening's coverage at that band is shown. (`make gaps`; `popularity.json`.)
2. **Their mistakes.** Every reply played in at least 10% of games that loses 1.5 pawns or more is punished, in a
   follow-up of the step whose stretch it falls in, not only a quiz. (The common-mistake finder, `make punish`.)
3. **Your mistakes.** The tempting wrong moves at each of your moves (the explorer's popular moves that are not the
   opening's) have a verdict, and the worst have a refutation written in words.
4. **Engine-checked.** No move of yours loses more than an inaccuracy; every line ends in a position that is fine for
   you, and the opening says how fine. (`pnpm course:eval`, `pnpm analyse`.)
5. **Shaped.** Five to eight variations of three to six steps; each step about four of your moves, with a title, text
   and one to three ideas.
6. **Explained.** An introduction (idea, risks, suits, origin), variation introductions, one comment per move where
   there is something to say, marks on the key moves.
7. **Beyond the moves.** Ten to twenty puzzles from its positions and structures; two or three Play on positions with
   their plans.
8. **Credited.** Every source named.

## The pipeline

Each stage has a tool, most of them already in the repo; the add-course skill (`.claude/skills/add-course`) is the
guide and gains the new stages.

1. **Scope from data.** Walk the explorer tree at the band from the trigger and list the replies to answer, by share of
   games, to the coverage target. (`make popularity`, `make gaps`.)
2. **Write the lines** in the theory tree, reusing what is there (`make doctor` reports overlaps).
3. **Check with the engine.** (`pnpm course:eval`, `pnpm analyse`, one engine at a time.)
4. **Find the mistakes.** Theirs (popular and losing) and yours (popular and not the opening's move); write refutations
   for the worst. (`make punish`, `pnpm analyse --replies`.)
5. **Shape and write.** Variations, steps, texts, ideas, marks.
6. **Add the rest.** Puzzles (`make puzzles`), Play on positions with aims, quizzes where words are the right test.
7. **Review against the bar**, as a checklist the build can partly check (coverage, mistakes punished, step sizes,
   missing texts) and partly a person signs off.

## From a video, a book or an article

As in v1's skill: take the ideas, write them in our own words, check every claim with the engine, credit the source,
and keep one comment per move (merge a new point into the existing comment; the engine settles disagreements).
