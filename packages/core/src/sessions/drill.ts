import { sideToMove } from '../chess/epd';
import type { BuiltOpening } from '../content/build-opening';
import { pickWeighted, type Exercise } from '../exercise/exercise';
import { lineEarnsCards, moveCardId, moveCards } from '../training/cards';

/**
 * What a drill of an opening (or one of its variations) holds: the learner's answer in each position (`book`) and the
 * opponent's replies in scope (`replies`), both by EPD. Only lines that earn cards are walked, so a drill never asks a
 * move a step would not make a card of; a line stops at the first learner move that is not a card.
 */
export type DrillScope = { book: Record<string, string>; replies: Record<string, string[]> };

/** `ends`: only these lines, each up to this ply (what the learner has ticked, `chosenScope`). */
export type DrillScopeOptions = { includeRare?: boolean; ends?: ReadonlyMap<string, number> };

export function drillScope(opening: BuiltOpening, variation?: string, options: DrillScopeOptions = {}): DrillScope {
  const cards = new Set(moveCards(opening, options).map((card) => card.id));
  const book: Record<string, string> = {};
  const replies: Record<string, string[]> = {};
  const lines = opening.lines.filter(
    (line) =>
      (!variation || line.variation === variation) &&
      lineEarnsCards(line, options.includeRare) &&
      (!options.ends || options.ends.has(line.id)),
  );
  for (const line of lines) {
    let epd = opening.startEpd;
    const end = Math.min(line.moves.length - 1, options.ends?.get(line.id) ?? Infinity);
    for (let ply = opening.startPly; ply <= end; ply++) {
      const uci = line.moves[ply]!;
      const move = opening.positions[epd]?.moves.find((candidate) => candidate.uci === uci);
      if (!move) break;
      if (sideToMove(epd) === opening.side) {
        if (!cards.has(moveCardId(epd, uci))) break;
        book[epd] ??= uci;
        if (book[epd] !== uci) break;
      } else {
        const list = (replies[epd] ??= []);
        if (!list.includes(uci)) list.push(uci);
      }
      epd = move.to;
    }
  }
  return { book, replies };
}

/** The learner positions of a scope, in a stable order: each card a drill or a checkpoint can ask. */
export const scopePositions = (scope: DrillScope) => Object.entries(scope.book).map(([epd, uci]) => ({ epd, uci }));

/**
 * A drill session: `runs` branches, each from the opening's start, the computer replying as players at the band do
 * among the replies in scope and the learner answering with the opening's move, until the book ends.
 */
export function drillExercises(opening: BuiltOpening, scope: DrillScope, runs: number, name = 'all'): Exercise[] {
  return Array.from({ length: runs }, (_, run) => ({
    id: `drill:${opening.id}:${name}:${run + 1}`,
    mode: 'drill' as const,
    start: opening.startEpd,
    startPly: opening.startPly,
    side: opening.side,
    grader: { kind: 'exact' as const, book: scope.book },
    responder: { kind: 'popular' as const, replies: scope.replies },
  }));
}

/**
 * One branch of a drill: the moves from the opening's start to where the book ends in scope (always ending on a
 * learner move), the line it follows, and its weight: the share of the band's games that take it, the product of
 * each opponent reply's share among the replies in scope (every reply alike where there are no counts).
 */
export type DrillBranch = { moves: string[]; line?: string; weight: number; cards: string[] };

/**
 * Every branch of a scope, in the order the lines are written: at each learner position the opening's move, at each
 * opponent position one branch per reply in scope. A run that ends on an opponent reply the opening does not answer
 * is cut back to the learner's last move; branches that end up the same are kept once.
 */
export function drillBranches(
  opening: BuiltOpening,
  scope: DrillScope,
  counts: Record<string, { moves: { uci: string; games: number }[] }> = {},
): DrillBranch[] {
  const out = new Map<string, DrillBranch>();
  const walk = (epd: string, moves: string[], weight: number, seen: Set<string>) => {
    const leaf = () => {
      let end = moves.length;
      // Cut back to the learner's last move: a branch ends on something the learner played.
      let at = opening.startEpd;
      let lastMine = 0;
      for (let i = 0; i < end; i++) {
        const next = opening.positions[at]?.moves.find((move) => move.uci === moves[i]);
        if (sideToMove(at) === opening.side) lastMine = i + 1;
        if (!next) break;
        at = next.to;
      }
      end = lastMine;
      if (!end) return;
      const kept = moves.slice(0, end);
      const key = kept.join(' ');
      if (out.has(key)) return;
      const cards: string[] = [];
      at = opening.startEpd;
      for (const uci of kept) {
        if (sideToMove(at) === opening.side) cards.push(moveCardId(at, uci));
        at = opening.positions[at]!.moves.find((move) => move.uci === uci)!.to;
      }
      const prefix = [...opening.lines].find((line) =>
        kept.every((uci, i) => line.moves[opening.startPly + i] === uci),
      );
      out.set(key, { moves: kept, ...(prefix ? { line: prefix.id } : {}), weight, cards });
    };
    if (seen.has(epd)) return leaf();
    const here = new Set(seen).add(epd);
    if (sideToMove(epd) === opening.side) {
      const uci = scope.book[epd];
      const next = uci ? opening.positions[epd]?.moves.find((move) => move.uci === uci) : undefined;
      if (!uci || !next) return leaf();
      return walk(next.to, [...moves, uci], weight, here);
    }
    const replies = scope.replies[epd] ?? [];
    if (!replies.length) return leaf();
    const games = replies.map((uci) => counts[epd]?.moves.find((move) => move.uci === uci)?.games ?? 0);
    const total = games.reduce((sum, n) => sum + n, 0);
    replies.forEach((uci, i) => {
      const next = opening.positions[epd]?.moves.find((move) => move.uci === uci);
      if (!next) return;
      const share = total > 0 ? games[i]! / total : 1 / replies.length;
      walk(next.to, [...moves, uci], weight * share, here);
    });
  };
  walk(opening.startEpd, [], 1, new Set());
  return [...out.values()];
}

/**
 * How the computer picks the next branch (docs/v2/pages/drill.md, setting `computer.plays`): `written`, the lines'
 * replies each as likely as the next; `level`, weighted by how often the band's players reach each branch; `least-known`,
 * the branches holding the learner's weakest moves first (`weakness`, higher first; ties by popularity). Every branch
 * comes once.
 */
export function orderBranches(
  branches: readonly DrillBranch[],
  how: 'written' | 'level' | 'least-known',
  random: () => number,
  weakness: (branch: DrillBranch) => number = () => 0,
): DrillBranch[] {
  if (how === 'least-known') return [...branches].sort((a, b) => weakness(b) - weakness(a) || b.weight - a.weight);
  const left = branches.map((branch) => ({ branch, weight: how === 'level' ? branch.weight : 1 }));
  const out: DrillBranch[] = [];
  while (left.length) {
    const pick = pickWeighted(left, random())!;
    out.push(pick.branch);
    left.splice(left.indexOf(pick), 1);
  }
  return out;
}

/**
 * A branch as an exercise: from the opening's start (or from part-way along it, `from` moves in, when a drill resumes
 * from its address), the computer playing the branch's replies and the learner the opening's moves.
 */
export function branchExercise(
  opening: BuiltOpening,
  scope: DrillScope,
  branch: DrillBranch,
  options: { id: string; from?: number; tries?: number; help?: boolean } = { id: '' },
): Exercise {
  const from = Math.min(options.from ?? 0, branch.moves.length);
  let start = opening.startEpd;
  for (const uci of branch.moves.slice(0, from))
    start = opening.positions[start]!.moves.find((move) => move.uci === uci)!.to;
  return {
    id: options.id,
    mode: 'drill',
    start,
    startPly: opening.startPly + from,
    side: opening.side,
    grader: { kind: 'exact', book: scope.book },
    responder: { kind: 'scripted', script: branch.moves.slice(from) },
    ...(options.tries !== undefined ? { tries: options.tries } : {}),
    ...(options.help !== undefined ? { help: options.help } : {}),
  };
}

/**
 * Where an address's moves (UCI from the start of the game) stand in a drill: the branch they lie on and how far
 * along it, or null when they leave every branch (or have not reached the opening's start).
 */
export function resumeBranch(
  opening: BuiltOpening,
  branches: readonly DrillBranch[],
  moves: readonly string[],
): { branch: DrillBranch; from: number } | null {
  if (moves.length < opening.startPly) return null;
  const line = opening.lines.find((candidate) =>
    moves.slice(0, opening.startPly).every((uci, i) => candidate.moves[i] === uci),
  );
  if (!line) return null;
  const rest = moves.slice(opening.startPly);
  const branch = branches.find((one) => rest.length < one.moves.length && rest.every((uci, i) => one.moves[i] === uci));
  return branch ? { branch, from: rest.length } : null;
}
