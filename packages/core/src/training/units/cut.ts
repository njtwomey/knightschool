import { pathFromUcis, pathSteps } from '../../navigation/content-walk';
import type { LineEdge, OpeningContent, Variant } from '../../schema/content';
import { cardDefinitions, type CardDefinition } from '../cards';
import { attachExtras } from './extras';
import { applyOverrides } from './overrides';
import {
  compareKeys,
  drilledVariant,
  KIND_RANK,
  kindOf,
  UNIT_SIZE,
  type CourseUnit,
  type UnitOptions,
  type UnitStretch,
} from './types';

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
  const main = content.opening.variants.find((variant) => variant.kind === 'line' && !variant.alternative);
  if (definitions.size === 0 || !main) return [];

  const tree = learnerTree(content, definitions);
  const branches = findBranches(tree, main);
  const units = unitsOfBranches(tree, branches, size);
  const strict = options.strict ?? false;
  const ordered = applyOverrides(units, content.opening.units, strict);
  attachExtras(content, ordered, content.opening.units?.place, strict);
  return ordered;
}

/** Checks a course's `units:` overrides against the units cut with the default card settings. Throws on a problem. */
export function checkUnitOverrides(content: OpeningContent): void {
  courseUnits(content, { strict: true });
}

/** The course as the learner's tree: what may be played where, and which positions lead on to a card. */
type LearnerTree = {
  content: OpeningContent;
  rootEpd: string;
  definitions: Map<string, CardDefinition>;
  variants: Map<string, Variant>;
  /** Each variant's place in the course. */
  order: Map<string, number>;
  /** For each variant, the move its own main line plays from each position on it. */
  mainNext: Map<string, Map<string, string>>;
  /** At the learner's turn the repertoire move, at the opponent's every move. */
  allowed: (epd: string) => LineEdge[];
  /** Whether a card can be reached from a position. */
  isUseful: (epd: string) => boolean;
  /** How many games reach a position (-1 when unknown). */
  popularity: (epd: string) => number;
};

function learnerTree(content: OpeningContent, definitions: Map<string, CardDefinition>): LearnerTree {
  const { opening, nodes } = content;
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
  const mainNext = new Map<string, Map<string, string>>();
  for (const variant of opening.variants) {
    const next = new Map<string, string>();
    let epd = opening.rootEpd;
    for (const edge of pathFromUcis(content, variant.mainLine)) {
      next.set(epd, edge.uci);
      epd = edge.to;
    }
    mainNext.set(variant.id, next);
  }
  return {
    content,
    rootEpd: opening.rootEpd,
    definitions,
    variants: new Map(opening.variants.map((variant) => [variant.id, variant])),
    order: new Map(opening.variants.map((variant, i) => [variant.id, i])),
    mainNext,
    allowed,
    isUseful,
    popularity: (epd) => nodes[epd]?.popularity ?? -1,
  };
}

type Branch = {
  owner: string;
  /** The moves from the start to where the branch begins. */
  prefix: LineEdge[];
  /** The branch's own moves. */
  edges: LineEdge[];
  /** Indices into `edges` of the learner moves first met on this branch. */
  learner: number[];
};

/** The ground the path has covered so far: the positions reached, how each was first reached, and the cards placed. */
class Ground {
  readonly covered: Set<string>;
  private readonly previous = new Map<string, { from: string; edge: LineEdge }>();
  private readonly assigned = new Set<string>();

  constructor(private readonly tree: LearnerTree) {
    this.covered = new Set([tree.rootEpd]);
  }

  /** Whether the learner's move at a position still needs a unit. */
  pending(epd: string): boolean {
    return this.tree.definitions.has(epd) && !this.assigned.has(epd);
  }

  /** The moves from the start that first reached a covered position. */
  prefixTo(epd: string): LineEdge[] {
    const path: LineEdge[] = [];
    for (let at = epd; at !== this.tree.rootEpd;) {
      const step = this.previous.get(at);
      if (!step) break;
      path.unshift(step.edge);
      at = step.from;
    }
    return path;
  }

  cover(start: string, edges: LineEdge[]) {
    let from = start;
    for (const edge of edges) {
      if (!this.covered.has(edge.to)) {
        this.covered.add(edge.to);
        this.previous.set(edge.to, { from, edge });
      }
      from = edge.to;
    }
  }

  /** The indices of the learner moves first met along `edges`, which are placed from now on. */
  placeLearnerMoves(start: string, edges: LineEdge[]): number[] {
    const found: number[] = [];
    let from = start;
    edges.forEach((edge, i) => {
      if (edge.isRepertoire && this.pending(from)) {
        this.assigned.add(from);
        found.push(i);
      }
      from = edge.to;
    });
    return found;
  }
}

/** The main line, then branch after branch until every useful move leaving covered ground is walked. */
function findBranches(tree: LearnerTree, main: Variant): Branch[] {
  const ground = new Ground(tree);
  const mainEdges = mainLineEdges(tree, main);
  const branches: Branch[] = [
    { owner: main.id, prefix: [], edges: mainEdges, learner: ground.placeLearnerMoves(tree.rootEpd, mainEdges) },
  ];
  ground.cover(tree.rootEpd, mainEdges);
  for (;;) {
    const best = nextBranchStart(tree, ground);
    if (!best) break;
    const edges = walkBranch(tree, ground, best.from, best.edge, best.owner);
    const prefix = ground.prefixTo(best.from);
    branches.push({ owner: best.owner, prefix, edges, learner: ground.placeLearnerMoves(best.from, edges) });
    ground.cover(best.from, edges);
  }
  return branches;
}

/** The main line's moves from the start, up to a learner move that is not the repertoire's. */
function mainLineEdges(tree: LearnerTree, main: Variant): LineEdge[] {
  const steps = pathSteps(tree.content, main.mainLine);
  const stop = steps.findIndex((step) => step.ours && !step.edge.isRepertoire);
  return steps.slice(0, stop < 0 ? steps.length : stop).map((step) => step.edge);
}

/**
 * Of every move leaving covered ground, the next branch to walk: the one whose line matters most, then the most
 * popular, then the shallowest (then course order and move order, so the choice is stable).
 */
function nextBranchStart(tree: LearnerTree, ground: Ground) {
  const ownerOf = (edge: LineEdge) =>
    edge.variants.find((id) => drilledVariant(tree.variants.get(id))) ?? edge.variants[0]!;
  let best: { from: string; edge: LineEdge; owner: string; key: number[] } | undefined;
  for (const from of ground.covered) {
    const node = tree.content.nodes[from];
    if (!node) continue;
    for (const edge of tree.allowed(from)) {
      const pending = node.isOurTurn && ground.pending(from);
      // A card where a walk stopped, whose move leads into covered ground (a transposition), is a branch of one move:
      // nothing else would ever give it a unit.
      if (ground.covered.has(edge.to) && !pending) continue;
      if (!pending && !tree.isUseful(edge.to)) continue;
      const owner = ownerOf(edge);
      const key = [
        KIND_RANK[kindOf(tree.variants.get(owner))],
        -tree.popularity(edge.to),
        node.ply,
        tree.order.get(owner) ?? 0,
        node.moves.indexOf(edge),
      ];
      if (!best || compareKeys(key, best.key) < 0) best = { from, edge, owner, key };
    }
  }
  return best;
}

/** Follows a variant's own main line, or failing that the best way on, from where a branch begins. */
function walkBranch(tree: LearnerTree, ground: Ground, start: string, first: LineEdge, owner: string): LineEdge[] {
  const follow = [owner, ...first.variants].find(
    (id) => tree.mainNext.get(id)?.get(start) === first.uci && (id === owner || drilledVariant(tree.variants.get(id))),
  );
  const edges = [first];
  const seen = new Set([start, first.to]);
  let at = first.to;
  while (!ground.covered.has(at)) {
    const node = tree.content.nodes[at];
    if (!node) break;
    let next: LineEdge | undefined;
    if (follow) {
      const uci = tree.mainNext.get(follow)!.get(at);
      next = uci ? node.moves.find((edge) => edge.uci === uci) : undefined;
      if (next && node.isOurTurn && !next.isRepertoire) next = undefined; // a trap's mistake is not ours to learn
    } else {
      const score = (edge: LineEdge) =>
        (tree.isUseful(edge.to) ? 2 : 0) + (edge.variants.includes(owner) ? 1 : 0) + tree.popularity(edge.to) / 10;
      next = tree
        .allowed(at)
        .filter((edge) => tree.isUseful(edge.to) || edge.variants.includes(owner) || tree.definitions.has(at))
        .sort((a, b) => score(b) - score(a))[0];
    }
    if (!next || seen.has(next.to)) break;
    edges.push(next);
    seen.add(next.to);
    at = next.to;
  }
  return edges;
}

/** Makes the units, numbering each line's units and recording which unit holds each learner position. */
class UnitMaker {
  readonly units: CourseUnit[] = [];
  /** Learner position -> its unit. */
  private readonly unitOf = new Map<string, CourseUnit>();
  private readonly perLine = new Map<string, number>();

  constructor(private readonly tree: LearnerTree) {}

  holding(epd: string): CourseUnit | undefined {
    return this.unitOf.get(epd);
  }

  create(line: string, fields: Pick<CourseUnit, 'branch' | 'side'>): CourseUnit {
    const n = (this.perLine.get(line) ?? 0) + 1;
    this.perLine.set(line, n);
    const unit: CourseUnit = {
      id: `${line}:${n}`,
      line,
      n,
      index: this.units.length,
      kind: kindOf(this.tree.variants.get(line)),
      ...fields,
      stretches: [],
      cards: [],
      prerequisites: [],
      quizzes: [],
      traps: [],
    };
    this.units.push(unit);
    return unit;
  }

  /** Adds a stretch and its cards to a unit, with what it needs: units holding moves it shares (a transposition). */
  fill(unit: CourseUnit, stretch: UnitStretch, positions: string[], needs: CourseUnit[]) {
    unit.stretches.push(stretch);
    const cards = stretch.plies.map((ply) => this.tree.definitions.get(positions[ply]!)!);
    unit.cards.push(...cards);
    for (const card of cards) this.unitOf.set(card.epd, unit);
    const shared = positions.slice(stretch.from, stretch.moves.length).flatMap((epd) => this.unitOf.get(epd) ?? []);
    for (const other of [...needs, ...shared])
      if (other !== unit && other.index < unit.index && !unit.prerequisites.includes(other.id))
        unit.prerequisites.push(other.id);
  }
}

/** A branch laid out from the start: the positions it passes, where its own moves begin, and every move as UCI. */
type LaidOut = { branch: Branch; positions: string[]; offset: number; moves: string[] };

function layOut(tree: LearnerTree, branch: Branch): LaidOut {
  const edges = [...branch.prefix, ...branch.edges];
  const positions = [tree.rootEpd, ...edges.map((edge) => edge.to)];
  return {
    branch,
    positions,
    offset: branch.prefix.length,
    moves: positions.length > 1 ? edges.map((edge) => edge.uci) : [],
  };
}

/**
 * Each branch's new learner moves cut into units. A short branch joins the other short branches of the same importance
 * leaving the same unit (a side unit), up to a unit's worth of moves; a side unit of one branch is just a short unit.
 */
function unitsOfBranches(tree: LearnerTree, branches: Branch[], size: number): CourseUnit[] {
  // Where branches leave: a cut there ends a unit where something else begins.
  const branchStarts = new Set(branches.slice(1).map((branch) => branch.prefix.at(-1)?.to ?? tree.rootEpd));
  const maker = new UnitMaker(tree);
  /** Side units still open to more short branches, by the unit they leave and how much they matter. */
  const openSide = new Map<string, CourseUnit>();
  const short = Math.max(1, Math.floor(size / 2));

  for (const [b, branch] of branches.entries()) {
    if (branch.learner.length === 0) continue;
    const laid = layOut(tree, branch);
    const chunks = cutIntoUnits(branch.learner.length, size, (k) => leavesBefore(laid, branchStarts, k));
    const parent = parentUnit(maker, laid) ?? (b > 0 ? maker.units[0] : undefined);
    if (b > 0 && chunks.length === 1 && branch.learner.length <= short && parent) {
      const key = `${parent.id} ${KIND_RANK[kindOf(tree.variants.get(branch.owner))]}`;
      const open = openSide.get(key);
      const unit =
        open && open.cards.length + branch.learner.length <= size
          ? open
          : maker.create(branch.owner, { branch: true, side: true });
      openSide.set(key, unit);
      const stretch = { moves: laid.moves, from: laid.offset, plies: branch.learner.map((i) => laid.offset + i) };
      maker.fill(unit, stretch, laid.positions, [parent]);
      continue;
    }
    addBranchUnits(maker, laid, chunks, b > 0, parent);
  }
  for (const unit of maker.units) if (unit.side && unit.stretches.length === 1) unit.side = false;
  return maker.units;
}

/** Whether another branch leaves between learner move k - 1 and learner move k (where k is asked). */
function leavesBefore({ branch, positions, offset }: LaidOut, branchStarts: Set<string>, k: number): boolean {
  for (let i = branch.learner[k - 1]! + 1; i <= branch.learner[k]!; i++)
    if (branchStarts.has(positions[offset + i]!)) return true;
  return false;
}

/** The unit holding the last learner move before the branch leaves. */
function parentUnit(maker: UnitMaker, { branch, positions, offset }: LaidOut): CourseUnit | undefined {
  for (let i = offset - 1; i >= 0; i--) {
    if (!branch.prefix[i]!.isRepertoire) continue;
    const unit = maker.holding(positions[i]!);
    if (unit) return unit;
  }
  return undefined;
}

/** One unit per chunk: a branch's first unit waits for its parent, a line's later units for the one before. */
function addBranchUnits(
  maker: UnitMaker,
  { branch, positions, offset, moves }: LaidOut,
  chunks: [number, number][],
  isBranch: boolean,
  parent: CourseUnit | undefined,
) {
  let previousUnit: CourseUnit | undefined;
  chunks.forEach(([a, z], c) => {
    const last = c === chunks.length - 1;
    const from = offset + (c === 0 ? 0 : branch.learner[a - 1]! + 1);
    const end = offset + (last ? branch.edges.length : branch.learner[z]! + 1);
    const unit = maker.create(branch.owner, { branch: c === 0 && isBranch, side: false });
    const stretch = {
      moves: moves.slice(0, end),
      from,
      plies: branch.learner.slice(a, z + 1).map((i) => offset + i),
    };
    maker.fill(unit, stretch, positions, previousUnit ? [previousUnit] : parent ? [parent] : []);
    previousUnit = unit;
  });
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
