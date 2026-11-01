# Colours

One table of meanings: each colour on the site means one thing, is defined once as a token with a light and a dark
value, and is always paired with a symbol, an icon, a word or a line style, so colour is never the only signal.

## The rule

- **One token per meaning**, defined on `:root` and `.dark` in `index.css` and exposed to Tailwind
  (`bg-verdict-blunder`,
  `text-state-known`). Components use the token, never a hex value, an `rgb()` string or a Tailwind palette class such
  as `emerald-500`. The board, which takes colour strings, reads the same tokens.
- **The four mark colours belong to the author's marks.** Nothing else drawn on the board uses those four hues, so a
  green Idea arrow and "play this" never look alike.
- **Never colour alone**: every row below names its pairing. Red and green pairs (tick and cross, Best and Blunder)
  always differ by shape as well.
- **Contrast**: text tokens at least 4.5:1 against the background in both themes; fills and arrows at least 3:1
  against both board square colours.
- A meaning used on several surfaces (a verdict on the board, in the tries table, on the map) is the same token on all.

## The table

**Author marks** (on the board, `[%cal]` and `[%csl]`; [marks-editor](../components/marks-editor.md),
[mark-key](../components/mark-key.md)). Arrows and rings.

| Token            | Letter | Means                                            | Value (v1)                     | Paired with           |
| ---------------- | ------ | ------------------------------------------------ | ------------------------------ | --------------------- |
| `--mark-idea`    | G      | Idea: the plan, where a piece is going           | green, `rgb(21 128 61 / 0.85)` | the key's word "Idea" |
| `--mark-threat`  | R      | Threat: what the other side threatens, a trap    | red, `rgb(185 28 28 / 0.85)`   | "Threat"              |
| `--mark-target`  | Y      | Target: a weak square or pawn to aim at          | yellow, `rgb(202 138 4 / 0.9)` | "Target"              |
| `--mark-support` | B      | Support: a defender, a battery, a covered square | blue, `rgb(29 78 216 / 0.85)`  | "Support"             |

**System drawing** (put there by the site, not the author). Hues outside the four, and drawn thinner than marks.

| Token              | Means                                                           | Value                    | Paired with                |
| ------------------ | --------------------------------------------------------------- | ------------------------ | -------------------------- |
| `--arrow-play`     | The move to play (Watch), Show me, the right move once answered | violet                   | solid, thinner than a mark |
| `--arrow-hint`     | A hint: the piece to move                                       | violet, a ring and pulse | the Hint button's count    |
| `--arrow-engine`   | The engine's best move and lines                                | slate grey               | the strip says "engine"    |
| `--arrow-preview`  | The move under the pointer elsewhere on the page                | the text colour, faint   | squares tinted the same    |
| `--arrow-wrong`    | The wrong move you played, shown in the tries table             | magenta                  | the cross badge            |
| `--square-preview` | Squares of a hovered move                                       | the text colour at 15%   | the preview arrow          |
| `--feedback-right` | Tick on a right move                                            | green, v1 `#98b84a`      | a tick shape               |
| `--feedback-wrong` | Cross on a wrong move                                           | red, v1 `#c0392b`        | a cross shape              |

The refutation is drawn in `--mark-threat`, as board.md asks: it is the threat, in the one colour that means it.

**Verdicts** ([verdict-badge](../components/verdict-badge.md), [tries-table](../components/tries-table.md),
the symbol on
the target square). The usual colours from Chess.com's Game Review, which beginners already know.

| Token                  | Grade      | Symbol    | Value        |
| ---------------------- | ---------- | --------- | ------------ |
| `--verdict-book`       | Book       | book icon | warm brown   |
| `--verdict-best`       | Best       | star      | bright green |
| `--verdict-excellent`  | Excellent  | `!`       | green        |
| `--verdict-good`       | Good       | tick      | grey-green   |
| `--verdict-inaccuracy` | Inaccuracy | `?!`      | yellow       |
| `--verdict-mistake`    | Mistake    | `?`       | orange       |
| `--verdict-blunder`    | Blunder    | `??`      | red          |
| `--verdict-miss`       | Miss       | `×`       | rose         |

**States** of a step and a move ([state-badge](../components/state-badge.md), [step-row](../components/step-row.md),
the map).

| Token              | State    | Icon (v1)        | Value                         |
| ------------------ | -------- | ---------------- | ----------------------------- |
| `--state-locked`   | Locked   | lock             | muted grey                    |
| `--state-open`     | Open     | empty circle     | the text colour, outline only |
| `--state-learning` | Learning | circle with dot  | amber                         |
| `--state-known`    | Known    | circle with tick | the primary teal              |
| `--state-mastered` | Mastered | graduation cap   | deep teal, filled             |

**Modes** ([mode-counts](../components/mode-counts.md), the practice hub). Only the three counted modes have a colour;
the rest are neutral with an icon.

| Token           | Mode    | Value  |
| --------------- | ------- | ------ |
| `--mode-learn`  | Learn   | sky    |
| `--mode-review` | Review  | indigo |
| `--mode-puzzle` | Puzzles | orange |

**Line kinds** ([kind-badge](../components/kind-badge.md), [line-row](../components/line-row.md)).

| Token                    | Kind           | Value             | Paired with            |
| ------------------------ | -------------- | ----------------- | ---------------------- |
| `--kind-main`            | Main           | the text colour   | the word               |
| `--kind-sideline`        | Sideline       | muted text        | the word               |
| `--kind-rare`            | Rare           | muted, dotted     | the word               |
| `--kind-gambit`          | Gambit         | pink              | the word               |
| `--kind-trap-spring`     | Trap to spring | amber             | "trap", a flag icon    |
| `--kind-trap-avoid`      | Trap to avoid  | red               | "trap", a warning icon |
| `--risk-low/medium/high` | Risk           | green, amber, red | "low risk" ...         |

**Other**

| Token                           | Means                                                     | Value                         |
| ------------------------------- | --------------------------------------------------------- | ----------------------------- |
| `--line-0` to `--line-9`        | A line's lane on the map: identity only, no meaning       | v1's ten hues, light and dark |
| `--gap`                         | A reply your repertoire does not answer, as a dashed stub | muted text, dashed            |
| `--eval-white`, `--eval-black`  | The two halves of the eval bar                            | near white, near black        |
| `--board-light`, `--board-dark` | The squares, per board theme                              | v1 themes                     |

Where you stand in words ("White is a little better") has no colour: green for one side would mean red for the other.

## Where it applies

Every component and page; the board's layers ([board-surface](../components/board-surface.md)); the map
([map-tree](../components/map-tree.md), [map-legend](../components/map-legend.md)). High contrast
([accessibility](accessibility.md)) swaps in stronger values for the same tokens.

## From v1

- `packages/core/src/content/marks.ts` (`MARK_COLOURS`, `MARK_MEANINGS`) and `apps/web/src/components/board/shapes.ts`
  (`MARK_RGB`): the four marks, kept. Same file, `TONES`: the Learn arrow (`answer`) is the same green as Idea, the
  clash v2 removes; `played` is red, like Threat.
- `components/board/app-board.tsx`: tick and cross as hard-coded hex (`#98b84a`, `#c0392b`); become tokens.
- `components/tags/tag-specs.ts` (`TONE_CLASS`): kinds, risk and character as Tailwind palette classes; become tokens.
- `index.css`: `--line-0` to `--line-9` and `--board-light` / `--board-dark` with light and dark values, the pattern
  to follow. `features/tree/colours.ts` (`laneColour`).
- `features/path/unit-state.ts`: state icons and names; `features/quiz/miss-list.tsx`: regret verdicts as badge
  variants, the only verdict colours in v1.

## Open questions

- Indigo for Review and violet for the play arrow are near neighbours; check the pair (and orange for Puzzles beside
  orange for Mistake) with a colour-blindness simulator before settling.
- Should system arrows also differ in style (dashed, or a hollow head), if the board library allows it?
