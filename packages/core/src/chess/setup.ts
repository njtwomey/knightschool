import { Chess } from 'chess.js';
import { checkFen } from './load';

/** Pieces by square: `e4: 'wP'`. */
export type Placement = Record<string, string>;
export type Turn = 'w' | 'b';
/** A position being set up by hand. `castling` holds the rights asked for; those the pieces allow are used. */
export type Setup = { placement: Placement; turn: Turn; castling: string };

const FILES = 'abcdefgh';

/** The pieces of a FEN's first field. */
export function placementOf(fen: string): Placement {
  const out: Placement = {};
  fen
    .split(' ')[0]!
    .split('/')
    .forEach((row, r) => {
      let file = 0;
      for (const char of row) {
        if (/\d/.test(char)) file += Number(char);
        else {
          const colour = char === char.toUpperCase() ? 'w' : 'b';
          out[`${FILES[file]}${8 - r}`] = `${colour}${char.toUpperCase()}`;
          file += 1;
        }
      }
    });
  return out;
}

/** The first field of a FEN for these pieces. */
export function placementFen(placement: Placement): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const file of FILES) {
      const piece = placement[`${file}${rank}`];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) row += empty;
      empty = 0;
      row += piece[0] === 'w' ? piece[1]! : piece[1]!.toLowerCase();
    }
    rows.push(empty ? `${row}${empty}` : row);
  }
  return rows.join('/');
}

/** The castling rights these pieces allow: a king and rook still on their home squares. */
export function possibleCastling(placement: Placement): string {
  const can = (king: string, rook: string, piece: string, right: string) =>
    placement[king] === `${piece}K` && placement[rook] === `${piece}R` ? right : '';
  return can('e1', 'h1', 'w', 'K') + can('e1', 'a1', 'w', 'Q') + can('e8', 'h8', 'b', 'k') + can('e8', 'a8', 'b', 'q');
}

/** The setup as a playable FEN: only the rights the pieces allow. */
export function setupFen(setup: Setup): string {
  const possible = possibleCastling(setup.placement);
  const rights = [...possible].filter((right) => setup.castling.includes(right)).join('');
  return `${placementFen(setup.placement)} ${setup.turn} ${rights || '-'} - 0 1`;
}

/** A setup from a FEN, for starting from the position on the board. */
export function setupFromFen(fen: string): Setup {
  const [, turn, castling] = fen.split(' ');
  return {
    placement: placementOf(fen),
    turn: turn === 'b' ? 'b' : 'w',
    castling: castling && castling !== '-' ? castling : '',
  };
}

const kingsOf = (placement: Placement, colour: Turn) =>
  Object.values(placement).filter((piece) => piece === `${colour}K`).length;

const oneKingEach = (placement: Placement) => kingsOf(placement, 'w') === 1 && kingsOf(placement, 'b') === 1;

const inCheck = (placement: Placement, turn: Turn) =>
  new Chess(`${placementFen(placement)} ${turn} - - 0 1`, { skipValidation: true }).isCheck();

/**
 * Who must be to move: the side to move, unless the other side's king is in check and this side's is not, which can
 * only mean it is the other side's turn. So setting up a check needs no thought.
 */
export function fittingTurn(setup: Setup): Turn {
  if (!oneKingEach(setup.placement)) return setup.turn;
  const other: Turn = setup.turn === 'w' ? 'b' : 'w';
  return inCheck(setup.placement, other) && !inCheck(setup.placement, setup.turn) ? other : setup.turn;
}

/** Why a setup cannot be played, in words, or null when it can. */
export function setupProblem(setup: Setup): string | null {
  const { placement, turn } = setup;
  for (const [colour, name] of [
    ['w', 'White'],
    ['b', 'Black'],
  ] as const) {
    const kings = kingsOf(placement, colour);
    if (kings !== 1) return `${name} needs exactly one king.`;
  }
  const backRank = Object.entries(placement).some(([square, piece]) => piece[1] === 'P' && /[18]$/.test(square));
  if (backRank) return 'A pawn cannot stand on the first or last rank.';
  const other: Turn = turn === 'w' ? 'b' : 'w';
  if (inCheck(placement, turn) && inCheck(placement, other)) return 'Both kings cannot be in check at once.';
  if (inCheck(placement, other)) {
    return `${other === 'w' ? 'White' : 'Black'} is in check, so it cannot be ${turn === 'w' ? 'White' : 'Black'}'s move.`;
  }
  const checked = checkFen(setupFen(setup));
  return checked.ok ? null : checked.problem;
}
