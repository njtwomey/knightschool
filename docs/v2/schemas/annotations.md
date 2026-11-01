# Annotations: what a move can carry

Everything said about a move is written in the line's PGN, next to the move, in standard PGN where a standard exists.
One move, one note, across all lines (as in v1).

## Written

```
7. Bb3 $1 { Back to the diagonal that aims at f7. [%cal Ge4e5,Gb3f7] [%csl Yf7] [%tag tip] [%idea f7-weakness] }
```

| Part   | Written as                        | Standard           | Meaning                                                          |
| ------ | --------------------------------- | ------------------ | ---------------------------------------------------------------- |
| Text   | the comment's words               | PGN comment        | what the move does and why; plain, neutral, one or two sentences |
| Symbol | `!` `?` `!?` `?!` or `$1` `$2`... | PGN NAG            | the author's grade; wins over the engine's                       |
| Arrows | `[%cal Gc4f7,Rd8h4]`              | Lichess, ChessBase | colour letter, from, to                                          |
| Rings  | `[%csl Yd5]`                      | Lichess, ChessBase | colour letter, square                                            |
| Tags   | `[%tag tip]`, `[%tag trap]`       | ours (v1)          | a kind of note: tip, trap, common mistake, or any word           |
| Ideas  | `[%idea fork]`                    | ours (new)         | ids from `ideas.yaml` that this move shows                       |

**Colours** mean one thing everywhere: G Idea, R Threat, Y Target, B Support (v1 `MARK_MEANINGS`). Any other letter
fails the build. One to three marks per move.

**Refutations.** A bracketed variation whose first move has `?` or `??` is a wrong move with its reason, not a line:

```
6. cxd4 Bb4+ ( 6... Bb6? { Gives up the centre without a fight. } 7. d5 { Gains space with tempo. } ) 7. Bd2
```

It is shown when someone plays that move (yours, or the opponent's in a drill), never drilled, never part of the tree.
A variation without `?` on its first move is a side line, as in v1.

## Built

The build turns each note into one small object on the move:

```json
{
  "text": "Back to the diagonal that aims at f7.",
  "nag": [1],
  "arrows": ["Ge4e5", "Gb3f7"],
  "circles": ["Yf7"],
  "tags": ["tip"],
  "ideas": ["f7-weakness"]
}
```

and each refutation into an entry on the position it starts from:

```json
{ "uci": "f8b6", "nag": [2], "text": "Gives up the centre without a fight.", "then": ["d4d5"] }
```

Everything is optional; an empty note is left out. This is v1's `Annotation` with `motifs` renamed `ideas` and the
refutations added.

## Not written: what is worked out

The engine's grade, the cost of a move, how often it is played, the position's name, its threats and weak squares are
**facts about positions**, worked out by the build and the app ([built.md](built.md)), never written into a note. An
author writes only what a person must say.
