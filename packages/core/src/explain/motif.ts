import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js';
import { positionFromEpd } from '../chess/chess';
import type { Motif } from '../schema/content';
import type { Explanation } from './types';

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const other = (color: Color): Color => (color === 'w' ? 'b' : 'w');

type Placed = { square: Square; type: PieceSymbol; color: Color };

const pieces = (chess: Chess): Placed[] =>
  chess.board().flatMap((row) => row.flatMap((cell) => (cell ? [cell as Placed] : [])));

const describe = (piece: { type: PieceSymbol }, square: Square) => `${NAME[piece.type]} on ${square}`;

function attackersOf(chess: Chess, square: Square, color: Color): Placed[] {
  return chess.attackers(square, color).map((from) => ({ square: from, ...chess.get(from)! }) as Placed);
}

const cheapest = (list: Placed[]) => Math.min(...list.map((piece) => VALUE[piece.type]));

/** Pieces of `color` that can be won: attacked and either undefended or attacked by something cheaper. */
function exposed(chess: Chess, color: Color): Map<Square, { piece: Placed; loss: number }> {
  const result = new Map<Square, { piece: Placed; loss: number }>();
  for (const piece of pieces(chess)) {
    if (piece.color !== color || piece.type === 'k') continue;
    const attackers = attackersOf(chess, piece.square, other(color));
    if (attackers.length === 0) continue;
    const defended = attackersOf(chess, piece.square, color).length > 0;
    const smallest = cheapest(attackers);
    if (defended && smallest >= VALUE[piece.type]) continue;
    result.set(piece.square, { piece, loss: VALUE[piece.type] - (defended ? smallest : 0) });
  }
  return result;
}

type Context = { before: Chess; after: Chess; move: Move; mover: Color; at: Square };

const arrow = (from: Square, to: Square, colour = 'R') => `${colour}${from}${to}`;

// Each detector returns at most one explanation, or null. They look at the position after the move.

function hanging({ before, after, move, mover }: Context): Explanation | null {
  const gain = move.captured ? VALUE[move.captured] : 0;
  const now = exposed(after, mover);
  const was = exposed(before, mover);
  let worst: { piece: Placed; loss: number } | null = null;
  for (const [square, entry] of now) {
    const movedHere = square === move.to;
    // In check the opponent must answer it, so only the piece giving check can be taken (by capturing it).
    if (after.isCheck() && !movedHere) continue;
    const net = entry.loss - (movedHere ? gain : 0);
    const alreadyLost = !movedHere && (was.get(square)?.loss ?? 0) >= entry.loss;
    if (net > 0 && !alreadyLost && (!worst || net > worst.loss)) worst = { piece: entry.piece, loss: net };
  }
  if (!worst) return null;
  const { piece } = worst;
  const attackers = attackersOf(after, piece.square, other(mover));
  const defended = attackersOf(after, piece.square, mover).length > 0;
  const text = defended
    ? `The ${describe(piece, piece.square)} can be taken by a ${NAME[attackers.sort((a, b) => VALUE[a.type] - VALUE[b.type])[0]!.type]}, which is worth less.`
    : `This leaves the ${describe(piece, piece.square)} hanging: nothing protects it.`;
  return {
    kind: 'why-bad',
    text,
    motifs: ['hanging-piece'],
    confidence: 0.85,
    source: 'motif',
    shapes: attackers.map((attacker) => arrow(attacker.square, piece.square)),
  };
}

function attacksUndefended({ before, after, move, mover }: Context): Explanation | null {
  const foe = other(mover);
  let best: Placed | null = null;
  for (const piece of pieces(after)) {
    if (piece.color !== foe || piece.type === 'k') continue;
    const attackedNow = attackersOf(after, piece.square, mover);
    if (attackedNow.length === 0) continue;
    if (attackersOf(after, piece.square, foe).length > 0) continue; // defended
    const wasAttacked = attackersOf(before, piece.square, mover).length > 0;
    if (wasAttacked) continue;
    if (!attackedNow.some((attacker) => attacker.square === move.to) && move.captured === undefined) continue;
    if (!best || VALUE[piece.type] > VALUE[best.type]) best = piece;
  }
  if (!best) return null;
  return {
    kind: 'what-it-does',
    text: `Attacks the undefended ${describe(best, best.square)}.`,
    motifs: [],
    confidence: 0.6,
    source: 'motif',
    shapes: [arrow(move.to, best.square)],
  };
}

function fork({ after, move, mover }: Context): Explanation | null {
  const foe = other(mover);
  const forker = after.get(move.to);
  if (!forker || forker.type === 'k') return null;
  // The forking piece must not simply be taken for free.
  const threats = attackersOf(after, move.to, foe);
  if (threats.length > 0) {
    const defended = attackersOf(after, move.to, mover).length > 0;
    if (!defended || cheapest(threats) < VALUE[forker.type]) return null;
  }
  const targets = pieces(after).filter((piece) => {
    if (piece.color !== foe || !attackersOf(after, piece.square, mover).some((a) => a.square === move.to)) return false;
    const undefended = attackersOf(after, piece.square, foe).length === 0;
    return VALUE[piece.type] > VALUE[forker.type] || undefended;
  });
  // Two loose pawns are not a fork worth naming; at least one target must be a piece.
  if (targets.length < 2 || targets.every((target) => target.type === 'p')) return null;
  targets.sort((a, b) => VALUE[b.type] - VALUE[a.type]);
  const [first, second] = targets as [Placed, Placed];
  return {
    kind: 'what-it-does',
    text: `The ${describe(forker, move.to)} forks the ${describe(first, first.square)} and the ${describe(second, second.square)}: it attacks both, and only one can be saved.`,
    motifs: ['fork'],
    confidence: 0.8,
    source: 'motif',
    shapes: targets.map((target) => arrow(move.to, target.square)),
  };
}

const DIRECTIONS: Record<'b' | 'r' | 'q', [number, number][]> = {
  b: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  r: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  q: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
};

const FILES = 'abcdefgh';
const squareAt = (file: number, rank: number): Square | null =>
  file < 0 || file > 7 || rank < 0 || rank > 7 ? null : (`${FILES[file]}${rank + 1}` as Square);

type Line = { slider: Placed; front: Placed; back: Placed };

/** Every slider of `color` that attacks an enemy piece with another enemy piece directly behind it on the same line. */
function lines(chess: Chess, color: Color): Line[] {
  const found: Line[] = [];
  for (const slider of pieces(chess)) {
    if (slider.color !== color || (slider.type !== 'b' && slider.type !== 'r' && slider.type !== 'q')) continue;
    const file0 = FILES.indexOf(slider.square[0]!);
    const rank0 = Number(slider.square[1]) - 1;
    for (const [df, dr] of DIRECTIONS[slider.type]) {
      const seen: Placed[] = [];
      for (let step = 1; seen.length < 2; step++) {
        const square = squareAt(file0 + df * step, rank0 + dr * step);
        if (!square) break;
        const piece = chess.get(square);
        if (!piece) continue;
        seen.push({ square, ...piece });
        if (piece.color === color) break;
      }
      const [front, back] = seen;
      if (front && back && front.color !== color && back.color !== color) found.push({ slider, front, back });
    }
  }
  return found;
}

const sameLine = (a: Line, b: Line) =>
  a.slider.square === b.slider.square && a.front.square === b.front.square && a.back.square === b.back.square;

function pinOrSkewer({ before, after, mover }: Context, which: 'pin' | 'skewer'): Explanation | null {
  const old = lines(before, mover);
  const fresh = lines(after, mover).filter((line) => !old.some((o) => sameLine(o, line)));
  const wanted = fresh.filter(
    (line) =>
      line.front.type !== 'p' && // pinning or skewering a pawn is rarely worth a sentence
      (which === 'pin'
        ? VALUE[line.back.type] > VALUE[line.front.type]
        : VALUE[line.front.type] > VALUE[line.back.type]),
  );
  if (wanted.length === 0) return null;
  wanted.sort((a, b) => VALUE[b.back.type] + VALUE[b.front.type] - VALUE[a.back.type] - VALUE[a.front.type]);
  const { slider, front, back } = wanted[0]!;
  const text =
    which === 'pin'
      ? back.type === 'k'
        ? `Pins the ${describe(front, front.square)} to the king: it cannot move without exposing the king.`
        : `Pins the ${describe(front, front.square)} to the ${describe(back, back.square)}: if it moves, the more valuable piece is lost.`
      : front.type === 'k'
        ? `Skewers the king: it must move, and then the ${describe(back, back.square)} behind it is attacked.`
        : `Skewers the ${describe(front, front.square)}: when it moves, the ${describe(back, back.square)} behind it is attacked.`;
  return {
    kind: 'what-it-does',
    text,
    motifs: [which],
    confidence: 0.8,
    source: 'motif',
    shapes: [arrow(slider.square, front.square), arrow(front.square, back.square, 'Y')],
  };
}

/** If it were this side's turn again, could it mate in one? Skipped when the opponent is in check. */
function mateThreat({ after, mover }: Context): Explanation | null {
  if (after.isCheck()) return null;
  const parts = after.fen().split(' ');
  parts[1] = mover;
  parts[3] = '-';
  let again: Chess;
  try {
    again = new Chess(parts.join(' '));
  } catch {
    return null;
  }
  const mate = again.moves({ verbose: true }).find((candidate) => candidate.san.endsWith('#'));
  if (!mate) return null;
  return {
    kind: 'what-it-does',
    text: `Threatens mate in one with ${mate.san}.`,
    motifs: ['mate-threat'],
    confidence: 0.9,
    source: 'motif',
    shapes: [arrow(mate.from, mate.to)],
  };
}

function capture({ after, move, mover }: Context): Explanation | null {
  if (!move.captured || after.isCheck()) return null;
  const mine = after.get(move.to)!;
  const recapture = attackersOf(after, move.to, other(mover));
  if (recapture.length === 0) {
    return {
      kind: 'what-it-does',
      text: `Wins a free ${NAME[move.captured]}.`,
      motifs: [],
      confidence: 0.8,
      source: 'motif',
    };
  }
  const gain = VALUE[move.captured] - VALUE[mine.type];
  if (gain > 0 && VALUE[move.captured] - VALUE[mine.type] > 0) {
    return {
      kind: 'what-it-does',
      text: `Wins a ${NAME[move.captured]} for a ${NAME[mine.type]}.`,
      motifs: [],
      confidence: 0.7,
      source: 'motif',
    };
  }
  return null;
}

function castlingLost({ before, after, move, mover }: Context): Explanation | null {
  if (move.isKingsideCastle() || move.isQueensideCastle()) return null;
  const old = before.getCastlingRights(mover);
  const now = after.getCastlingRights(mover);
  const lostKing = old.k && !now.k;
  const lostQueen = old.q && !now.q;
  if (!lostKing && !lostQueen) return null;
  const side = lostKing && lostQueen ? 'on either side' : lostKing ? 'on the kingside' : 'on the queenside';
  return {
    kind: 'why-bad',
    text: `Gives up the right to castle ${side}.`,
    motifs: ['castling-lost' satisfies Motif],
    confidence: 0.5,
    source: 'motif',
  };
}

/**
 * Tactics a move creates or allows, from the position before it and the move (UCI). Pure chess.js: no engine.
 * Plans such as "this prepares d4" are not found here; they stay in the author's notes.
 * Most confident first. Returns [] for an illegal move.
 */
export function explainMotifs(beforeEpd: string, uci: string): Explanation[] {
  const before = positionFromEpd(beforeEpd);
  const after = positionFromEpd(beforeEpd);
  let move: Move;
  try {
    move = after.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
  } catch {
    return [];
  }
  const context: Context = { before, after, move, mover: move.color, at: move.to };
  return [
    mateThreat(context),
    hanging(context),
    fork(context),
    pinOrSkewer(context, 'pin'),
    pinOrSkewer(context, 'skewer'),
    capture(context),
    attacksUndefended(context),
    castlingLost(context),
  ]
    .filter((explanation): explanation is Explanation => explanation !== null)
    .sort((a, b) => b.confidence - a.confidence);
}
