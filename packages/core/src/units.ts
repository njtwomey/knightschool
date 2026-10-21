import type { LineEdge, LineKind, OpeningContent, TrapKind, Variant } from './schema/content';
import type { Card, Review } from './schema/user';
import { cardDefinitions, type CardDefinition, type CardOptions } from './training';

/** About this many of the learner's own moves make one unit: one sitting. */
export const UNIT_SIZE = 4;
/** A unit is graduated when every card's interval has reached this many days. */
export const GRADUATED_DAYS = 7;

/** What a unit is about: the kind of the line it belongs to. */
export type UnitKind = LineKind | TrapKind;

/**
 * A run of moves to play: `moves` (UCI) from the start position, of which the first `from` lead to where it begins and
 * are played for you. `plies` are the indices in `moves` of the learner's own moves that are the unit's cards.
 */
export type UnitStretch = { moves: string[]; from: number; plies: number[] };

/**
 * One step of a course's study path: about four of the learner's own moves, in one stretch of a line, or (`side`) in
 * a few short stretches where the opponent leaves the same unit in different ways.
 *
 * The learner's moves (`cards`) are the core of the unit: they are its review cards. Quizzes and traps are attached to
 * it as supplementary material, shown while studying but never required.
 */
export type CourseUnit = {
  /** `<line>:<n>`: stable while the course's lines stay as they are. */
  id: string;
  /** The line (variant id) the unit belongs to. A branch inside a line's file belongs to that line. */
  line: string;
  /** 1 for the line's first unit, 2 for its next, and so on, across all the line's branches. */
  n: number;
  /** Place in the path, from 0. */
  index: number;
  kind: UnitKind;
  /** True for the first unit of a branch: it starts where it leaves the units before it. */
  branch: boolean;
  /** True for a group of short branches (other replies) leaving the same unit. */
  side: boolean;
  /** One stretch, or one per short branch of a side unit. */
  stretches: UnitStretch[];
  /** The learner's core moves, stretch by stretch in the order played: one card each. */
  cards: CardDefinition[];
  /** Units to pass first. */
  prerequisites: string[];
  /** Supplementary: quiz ids about positions in the stretch. */
  quizzes: string[];
  /** Supplementary: traps (variant ids) that leave the tree from the stretch. */
  traps: string[];
};

export type UnitOptions = CardOptions & { size?: number };

const KIND_RANK: Record<UnitKind, number> = {
  main: 0,
  gambit: 0,
  sideline: 1,
  'against-us': 1,
  rare: 2,
  'for-us': 3,
};

/** Is a variant's own line something the learner drills (rather than only sees)? */
const drilledVariant = (variant: Variant | undefined) =>
  !!variant && !variant.alternative && (variant.kind === 'line' || variant.whose === 'against-us');

const kindOf = (variant: Variant | undefined): UnitKind => variant?.weight ?? variant?.whose ?? 'rare';

type Branch = {
  owner: string;
  /** The moves from the start to where the branch begins. */
  prefix: LineEdge[];
  /** The branch's own moves. */
  edges: LineEdge[];
  /** Indices into `edges` of the learner moves first met on this branch. */
  learner: number[];
};

/**
 * Cuts a course into units, in the order to study them.
 *
 * - The tree is the learner's: at their turn only the repertoire move, at the opponent's every move that leads on to a
 *   position with a card (`cardDefinitions` decides which positions are core, so the learner's settings apply).
 * - The main line comes first. Then branches, one at a time: of every move leaving the ground already covered, the one
 *   whose line matters most (main and gambit, then sideline and traps to avoid, then rare), then the one more games
 *   reach (the popularity of the position it leads to), then the shallower. A branch follows its line's own main line
 *   where it can, else the most popular way on, to the end or until it rejoins covered ground.
 * - Each branch's new learner moves are cut into units of about `size` (default 4), preferring cuts where another
 *   branch leaves, so a unit ends where something leaves it.
 * - A branch's first unit depends on the unit holding the last learner move before it leaves; a line's later units
 *   depend on the one before.
 */
export function courseUnits(content: OpeningContent, options: UnitOptions = {}): CourseUnit[] {
  const { size = UNIT_SIZE, ...cardOptions } = options;
  const definitions = new Map(cardDefinitions(content, cardOptions).map((definition) => [definition.epd, definition]));
  const { opening, nodes } = content;
  const variants = new Map(opening.variants.map((variant) => [variant.id, variant]));
  const order = new Map(opening.variants.map((variant, i) => [variant.id, i]));
  const main = opening.variants.find((variant) => variant.kind === 'line' && !variant.alternative);
  if (definitions.size === 0 || !main) return [];

  const allowed = (epd: string): LineEdge[] => {
    const node = nodes[epd];
    if (!node) return [];
    return node.isOurTurn ? node.moves.filter((edge) => edge.isRepertoire) : node.moves;
  };
  const useful = new Map<string, boolean>();
  const isUseful = (epd: string): boolean => {
    const known = useful.get(epd);
    if (known !== undefined) return known;
    useful.set(epd, false); // a repetition cannot make a position useful
    const result = definitions.has(epd) || allowed(epd).some((edge) => isUseful(edge.to));
    useful.set(epd, result);
    return result;
  };
  // For each variant, the move its own main line plays from each position on it.
  const mainNext = new Map<string, Map<string, string>>();
  for (const variant of opening.variants) {
    const next = new Map<string, string>();
    let epd = opening.rootEpd;
    for (const uci of variant.mainLine) {
      next.set(epd, uci);
      const edge = nodes[epd]?.moves.find((candidate) => candidate.uci === uci);
      if (!edge) break;
      epd = edge.to;
    }
    mainNext.set(variant.id, next);
  }
  const popularity = (epd: string) => nodes[epd]?.popularity ?? -1;

  const covered = new Set<string>([opening.rootEpd]);
  const previous = new Map<string, { from: string; edge: LineEdge }>();
  const assigned = new Set<string>();

  /** Follows a variant's own main line, or failing that the best way on, from where a branch begins. */
  function walk(start: string, first: LineEdge, owner: string): LineEdge[] {
    const follow = [owner, ...first.variants].find(
      (id) => mainNext.get(id)?.get(start) === first.uci && (id === owner || drilledVariant(variants.get(id))),
    );
    const edges = [first];
    const seen = new Set([start, first.to]);
    let at = first.to;
    while (!covered.has(at)) {
      const node = nodes[at];
      if (!node) break;
      let next: LineEdge | undefined;
      if (follow) {
        const uci = mainNext.get(follow)!.get(at);
        next = uci ? node.moves.find((edge) => edge.uci === uci) : undefined;
        if (next && node.isOurTurn && !next.isRepertoire) next = undefined; // a trap's mistake is not ours to learn
      } else {
        const score = (edge: LineEdge) =>
          (isUseful(edge.to) ? 2 : 0) + (edge.variants.includes(owner) ? 1 : 0) + popularity(edge.to) / 10;
        next = allowed(at)
          .filter((edge) => isUseful(edge.to) || edge.variants.includes(owner) || definitions.has(at))
          .sort((a, b) => score(b) - score(a))[0];
      }
      if (!next || seen.has(next.to)) break;
      edges.push(next);
      seen.add(next.to);
      at = next.to;
    }
    return edges;
  }

  function prefixTo(epd: string): LineEdge[] {
    const path: LineEdge[] = [];
    for (let at = epd; at !== opening.rootEpd;) {
      const step = previous.get(at);
      if (!step) break;
      path.unshift(step.edge);
      at = step.from;
    }
    return path;
  }

  function cover(start: string, edges: LineEdge[]) {
    let from = start;
    for (const edge of edges) {
      if (!covered.has(edge.to)) {
        covered.add(edge.to);
        previous.set(edge.to, { from, edge });
      }
      from = edge.to;
    }
  }

  function learnerMoves(start: string, edges: LineEdge[]): number[] {
    const found: number[] = [];
    let from = start;
    edges.forEach((edge, i) => {
      if (definitions.has(from) && edge.isRepertoire && !assigned.has(from)) {
        assigned.add(from);
        found.push(i);
      }
      from = edge.to;
    });
    return found;
  }

  // The main line, then branch after branch.
  const branches: Branch[] = [];
  const mainEdges: LineEdge[] = [];
  {
    let epd = opening.rootEpd;
    for (const uci of main.mainLine) {
      const node = nodes[epd];
      const edge = node?.moves.find((candidate) => candidate.uci === uci);
      if (!node || !edge || (node.isOurTurn && !edge.isRepertoire)) break;
      mainEdges.push(edge);
      epd = edge.to;
    }
    branches.push({ owner: main.id, prefix: [], edges: mainEdges, learner: learnerMoves(opening.rootEpd, mainEdges) });
    cover(opening.rootEpd, mainEdges);
  }

  const ownerOf = (edge: LineEdge) => edge.variants.find((id) => drilledVariant(variants.get(id))) ?? edge.variants[0]!;
  for (;;) {
    let best: { from: string; edge: LineEdge; owner: string; key: number[] } | undefined;
    for (const from of covered) {
      const node = nodes[from];
      if (!node) continue;
      for (const edge of allowed(from)) {
        if (covered.has(edge.to)) continue;
        const pending = node.isOurTurn && definitions.has(from) && !assigned.has(from);
        if (!pending && !isUseful(edge.to)) continue;
        const owner = ownerOf(edge);
        const key = [
          KIND_RANK[kindOf(variants.get(owner))],
          -popularity(edge.to),
          node.ply,
          order.get(owner) ?? 0,
          node.moves.indexOf(edge),
        ];
        if (!best || compareKeys(key, best.key) < 0) best = { from, edge, owner, key };
      }
    }
    if (!best) break;
    const edges = walk(best.from, best.edge, best.owner);
    const prefix = prefixTo(best.from);
    branches.push({ owner: best.owner, prefix, edges, learner: learnerMoves(best.from, edges) });
    cover(best.from, edges);
  }

  // Where branches leave: a cut there ends a unit where something else begins.
  const branchStarts = new Set(branches.slice(1).map((branch) => branch.prefix.at(-1)?.to ?? opening.rootEpd));

  const units: CourseUnit[] = [];
  const unitOf = new Map<string, CourseUnit>(); // learner position -> its unit
  const perLine = new Map<string, number>();
  /** Side units still open to more short branches, by the unit they leave and how much they matter. */
  const openSide = new Map<string, CourseUnit>();
  const short = Math.max(1, Math.floor(size / 2));

  const newUnit = (line: string, fields: Pick<CourseUnit, 'branch' | 'side'>): CourseUnit => {
    const n = (perLine.get(line) ?? 0) + 1;
    perLine.set(line, n);
    const unit: CourseUnit = {
      id: `${line}:${n}`,
      line,
      n,
      index: units.length,
      kind: kindOf(variants.get(line)),
      ...fields,
      stretches: [],
      cards: [],
      prerequisites: [],
      quizzes: [],
      traps: [],
    };
    units.push(unit);
    return unit;
  };
  /** Adds a stretch and its cards to a unit, with what it needs: units holding moves it shares (a transposition). */
  const fill = (unit: CourseUnit, stretch: UnitStretch, positions: string[], needs: CourseUnit[]) => {
    unit.stretches.push(stretch);
    const cards = stretch.plies.map((ply) => definitions.get(positions[ply]!)!);
    unit.cards.push(...cards);
    for (const card of cards) unitOf.set(card.epd, unit);
    const shared = positions.slice(stretch.from, stretch.moves.length).flatMap((epd) => unitOf.get(epd) ?? []);
    for (const other of [...needs, ...shared])
      if (other !== unit && other.index < unit.index && !unit.prerequisites.includes(other.id))
        unit.prerequisites.push(other.id);
  };

  for (const [b, branch] of branches.entries()) {
    if (branch.learner.length === 0) continue;
    const positions = [opening.rootEpd, ...[...branch.prefix, ...branch.edges].map((edge) => edge.to)];
    const offset = branch.prefix.length;
    const leavesBetween = (a: number, z: number) => {
      // Positions after learner move a, up to the one where learner move z is asked.
      for (let i = branch.learner[a]! + 1; i <= branch.learner[z]!; i++)
        if (branchStarts.has(positions[offset + i]!)) return true;
      return false;
    };
    const chunks = cutIntoUnits(branch.learner.length, size, (k) => leavesBetween(k - 1, k));
    const allMoves = positions.length > 1 ? [...branch.prefix, ...branch.edges].map((edge) => edge.uci) : [];
    // The unit holding the last learner move before the branch leaves; failing that, the path's first unit.
    let parent: CourseUnit | undefined;
    for (let i = offset - 1; i >= 0 && !parent; i--)
      if (branch.prefix[i]!.isRepertoire) parent = unitOf.get(positions[i]!);
    parent ??= b > 0 ? units[0] : undefined;

    // A short branch joins the other short branches of the same importance leaving the same unit, up to a unit's worth
    // of moves.
    if (b > 0 && chunks.length === 1 && branch.learner.length <= short && parent) {
      const key = `${parent.id} ${KIND_RANK[kindOf(variants.get(branch.owner))]}`;
      const open = openSide.get(key);
      const unit =
        open && open.cards.length + branch.learner.length <= size
          ? open
          : newUnit(branch.owner, { branch: true, side: true });
      openSide.set(key, unit);
      const stretch = { moves: allMoves, from: offset, plies: branch.learner.map((i) => offset + i) };
      fill(unit, stretch, positions, [parent]);
      continue;
    }

    let previousUnit: CourseUnit | undefined;
    chunks.forEach(([a, z], c) => {
      const last = c === chunks.length - 1;
      const from = offset + (c === 0 ? 0 : branch.learner[a - 1]! + 1);
      const end = offset + (last ? branch.edges.length : branch.learner[z]! + 1);
      const unit = newUnit(branch.owner, { branch: c === 0 && b > 0, side: false });
      const stretch = {
        moves: allMoves.slice(0, end),
        from,
        plies: branch.learner.slice(a, z + 1).map((i) => offset + i),
      };
      // A branch's first unit waits for its parent; a line's later units wait for the one before.
      fill(unit, stretch, positions, previousUnit ? [previousUnit] : parent ? [parent] : []);
      previousUnit = unit;
    });
  }
  // A side unit of one branch is just a short unit.
  for (const unit of units) if (unit.side && unit.stretches.length === 1) unit.side = false;

  attachSupplementary(content, units);
  return units;
}

/** Lexicographic comparison of two sort keys. */
function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/**
 * Splits `count` learner moves into runs of about `size`, as [first, last] index pairs. A run's cost is its distance
 * from `size`, squared; a cut costs 3 unless something leaves the line there (`atBranch(k)`: between moves k - 1 and
 * k), where it earns half a point instead. The cheapest split wins.
 */
export function cutIntoUnits(count: number, size: number, atBranch: (k: number) => boolean): [number, number][] {
  const best: { cost: number; cut: number }[] = [{ cost: 0, cut: 0 }];
  for (let k = 1; k <= count; k++) {
    let choice = { cost: Infinity, cut: 0 };
    for (let run = 1; run <= Math.min(k, size * 2); run++) {
      const start = k - run;
      const cutCost = start === 0 ? 0 : atBranch(start) ? -0.5 : 3;
      const cost = best[start]!.cost + (run - size) ** 2 + cutCost;
      if (cost < choice.cost) choice = { cost, cut: start };
    }
    best.push(choice);
  }
  const runs: [number, number][] = [];
  for (let k = count; k > 0; k = best[k]!.cut) runs.unshift([best[k]!.cut, k - 1]);
  return runs;
}

/** The positions a stretch passes through: where it starts, and after each of its moves. */
export function stretchPositions(content: OpeningContent, stretch: Pick<UnitStretch, 'moves' | 'from'>): string[] {
  const positions = [content.opening.rootEpd];
  for (const uci of stretch.moves) {
    const edge = content.nodes[positions.at(-1)!]?.moves.find((candidate) => candidate.uci === uci);
    if (!edge) break;
    positions.push(edge.to);
  }
  return positions.slice(stretch.from);
}

/** Quizzes and traps go to the first unit whose stretches reach their position (for a trap, where it leaves). */
function attachSupplementary(content: OpeningContent, units: CourseUnit[]) {
  const reached = (from?: number) =>
    units.map(
      (unit) =>
        new Set(
          unit.stretches.flatMap((stretch) =>
            stretchPositions(content, { moves: stretch.moves, from: from ?? stretch.from }),
          ),
        ),
    );
  const stretches = reached();
  const wholePaths = reached(0);
  // Each trap's positions, with the unit it leaves from.
  const traps: { positions: Set<string>; unit: number }[] = [];
  for (const trap of content.opening.variants.filter((variant) => variant.kind === 'refutation')) {
    const positions = stretchPositions(content, { moves: trap.mainLine, from: 0 });
    for (let p = positions.length - 1; p >= 0; p--) {
      const i = stretches.findIndex((set) => set.has(positions[p]!));
      if (i >= 0) {
        units[i]!.traps.push(trap.id);
        traps.push({ positions: new Set(positions), unit: i });
        break;
      }
    }
  }
  // A quiz goes with the unit that reaches its position, else with the trap it is about, else with a unit on the way.
  for (const quiz of content.quizzes) {
    let at = stretches.findIndex((set) => set.has(quiz.epd));
    if (at < 0) at = traps.find((trap) => trap.positions.has(quiz.epd))?.unit ?? -1;
    if (at < 0) at = wholePaths.findIndex((set) => set.has(quiz.epd));
    if (at >= 0) units[at]!.quizzes.push(quiz.id);
  }
}

export type UnitState = 'locked' | 'unlocked' | 'learning' | 'passed' | 'graduated';

export type UnitProgress = {
  state: UnitState;
  /** Core moves in the unit. */
  total: number;
  /** Of those, how many have a card in storage. */
  introduced: number;
  /** How many were right (good or easy) in each of their last two answers. */
  passed: number;
  /** How many are in FSRS review with an interval of `GRADUATED_DAYS` or more. */
  graduated: number;
  /** Locked units: the prerequisites not yet passed. */
  waitingFor: string[];
  /** Each core move, in the order of `unit.cards`. */
  moves: MoveProgress[];
};

/** One core move of a unit: does its card exist, is it passed (last two answers right), is it graduated. */
export type MoveProgress = { introduced: boolean; passed: boolean; graduated: boolean };

const done = (state: UnitState) => state === 'passed' || state === 'graduated';

/**
 * Each unit's state, derived from the course's cards and review log (nothing is stored):
 *
 * - graduated: every core card is in FSRS `review` with an interval of `GRADUATED_DAYS` or more;
 * - passed: every core move's last two answers were good or easy (or the move is graduated on its own);
 * - learning: some of its cards exist;
 * - unlocked: none of its cards exist yet, and every prerequisite is passed (or graduated);
 * - locked: none of its cards exist yet, and a prerequisite is not passed.
 *
 * A unit with progress shows it even when a prerequisite is not passed, so what was learned before the path existed
 * still counts.
 */
export function unitProgress(
  units: CourseUnit[],
  cards: Pick<Card, 'id' | 'state' | 'scheduledDays'>[],
  reviews: Pick<Review, 'cardId' | 'at' | 'rating'>[],
): Map<string, UnitProgress> {
  const byId = new Map(cards.map((card) => [card.id, card]));
  const lastTwo = new Map<string, Pick<Review, 'at' | 'rating'>[]>();
  for (const review of [...reviews].sort((a, b) => a.at.localeCompare(b.at))) {
    const list = lastTwo.get(review.cardId) ?? [];
    list.push(review);
    if (list.length > 2) list.shift();
    lastTwo.set(review.cardId, list);
  }
  const good = (rating: Review['rating']) => rating === 'good' || rating === 'easy';
  const progress = new Map<string, UnitProgress>();
  for (const unit of units) {
    const ids = unit.cards.map((card) => card.id);
    const moves = ids.map((id): MoveProgress => {
      const card = byId.get(id);
      const last = lastTwo.get(id) ?? [];
      return {
        introduced: !!card,
        passed: last.length === 2 && last.every((review) => good(review.rating)),
        graduated: card?.state === 'review' && card.scheduledDays >= GRADUATED_DAYS,
      };
    });
    const introduced = moves.filter((move) => move.introduced).length;
    const passed = moves.filter((move) => move.passed).length;
    const graduated = moves.filter((move) => move.graduated).length;
    const waitingFor = unit.prerequisites.filter((id) => !done(progress.get(id)?.state ?? 'locked'));
    const total = ids.length;
    let state: UnitState;
    if (total > 0 && graduated === total) state = 'graduated';
    else if (total > 0 && moves.every((move) => move.passed || move.graduated)) state = 'passed';
    else if (introduced > 0) state = 'learning';
    else state = waitingFor.length > 0 ? 'locked' : 'unlocked';
    progress.set(unit.id, {
      state,
      total,
      introduced,
      passed,
      graduated,
      waitingFor: state === 'locked' ? waitingFor : [],
      moves,
    });
  }
  return progress;
}

/**
 * The cards to introduce next for a course, in path order: those of unlocked units and units being learned, leaving
 * out cards that already exist. Locked units wait; quizzes and traps are never introduced this way.
 */
export function pathIntroductionOrder(
  units: CourseUnit[],
  progress: Map<string, UnitProgress>,
  existing: ReadonlySet<string>,
): CardDefinition[] {
  return units
    .filter((unit) => {
      const state = progress.get(unit.id)?.state;
      return state === 'unlocked' || state === 'learning';
    })
    .flatMap((unit) => unit.cards.filter((card) => !existing.has(card.id)));
}

/**
 * Part of a unit to play, as stretches: its learner moves `first` to `last` (1-based, across the unit), or all of them.
 * Each stretch starts just before its first asked move (so the opponent's move before it is seen) and ends just after
 * its last, or at the stretch's own end when that is the unit's last move there.
 */
export function unitStretches(unit: CourseUnit, first?: number, last?: number): UnitStretch[] {
  const count = unit.cards.length;
  const a = Math.min(Math.max(1, first ?? 1), count) - 1;
  const b = Math.min(Math.max(a + 1, last ?? count), count) - 1;
  const parts: UnitStretch[] = [];
  let seen = 0;
  for (const stretch of unit.stretches) {
    const length = stretch.plies.length;
    const lo = Math.max(a - seen, 0);
    const hi = Math.min(b - seen, length - 1);
    seen += length;
    if (lo > hi) continue;
    const from = lo === 0 ? stretch.from : Math.max(stretch.from, stretch.plies[lo - 1]! + 1);
    const to = hi === length - 1 ? stretch.moves.length : stretch.plies[hi]! + 1;
    parts.push({ moves: stretch.moves.slice(0, to), from, plies: stretch.plies.slice(lo, hi + 1) });
  }
  return parts;
}
