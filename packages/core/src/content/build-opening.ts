import { START_EPD, type Side } from '../chess/epd';
import { numberedMove } from '../chess/notation';
import { replay } from '../chess/play';
import { buildQuestions, type BuiltQuestion } from '../questions/questions';
import type { Note } from './note';
import type { OpeningFile } from './schema';
import { isLearnerMove, type ResolvedLine, type TreeMove } from './theory';

export type BuiltMove = { uci: string; san: string; to: string; mine: boolean; lines: string[]; note?: Note };
export type BuiltRefutation = { uci: string; san: string; note?: Note; then: { uci: string; san: string }[] };
export type BuiltLine = {
  id: string;
  variation: string;
  kind: ResolvedLine['kind'];
  name?: string;
  alternative: boolean;
  moves: string[];
  sans: string[];
};
export type BuiltStep = {
  id: string;
  variation: string;
  line: string;
  /** Plies `from` to `to` of the line, inclusive: the opponent's move that leads in, then about four of yours. */
  from: number;
  to: number;
  title?: string;
  text?: string;
};
export type BuiltOpening = {
  id: string;
  name: string;
  side: Side;
  level: OpeningFile['level'];
  style: string[];
  summary: string;
  about: OpeningFile['about'];
  sources: OpeningFile['sources'];
  ideas: string[];
  startEpd: string;
  startPly: number;
  positions: Record<string, { moves: BuiltMove[]; refutations?: BuiltRefutation[] }>;
  lines: BuiltLine[];
  variations: { id: string; name?: string; intro?: string; plans: string[]; lines: string[] }[];
  steps: BuiltStep[];
  /** Questions in words, from the variations' `questions:`, checked against the matcher when built. */
  questions: BuiltQuestion[];
};

/**
 * An opening built from its file and the resolved lines it lists: the EPD-keyed tree, its lines, variations and steps
 * (docs/v2/schemas/built.md). Throws, naming the problem, when a line does not reach the opening's start or a position
 * where the learner moves has two answers (a second answer must be listed as an alternative).
 */
export function buildOpening(
  id: string,
  file: OpeningFile,
  resolved: ReadonlyMap<string, ResolvedLine>,
  stepMoves: number,
): BuiltOpening {
  const start = replay(
    START_EPD,
    file.start
      .replace(/\d+\.(\.\.)?/g, ' ')
      .trim()
      .split(/\s+/),
  );
  const startEpd = start.at(-1)?.epd ?? START_EPD;
  const startPly = start.length;
  const alternatives = new Set(file.alternatives);
  const positions: BuiltOpening['positions'] = {};
  const answers = new Map<string, { uci: string; line: string }>();
  const lines: BuiltLine[] = [];

  for (const variation of file.variations) {
    for (const lineId of variation.lines) {
      const line = resolved.get(lineId);
      if (!line) throw new Error(`${id}: variation "${variation.id}" lists "${lineId}", which is not a line`);
      if (line.moves[startPly - 1]?.after !== startEpd && startPly > 0) {
        throw new Error(`${id}: "${lineId}" does not reach the opening's start (${file.start})`);
      }
      const alternative = alternatives.has(lineId);
      line.moves.forEach((move, ply) => {
        if (ply < startPly) return;
        const node = (positions[move.before] ??= { moves: [] });
        let edge = node.moves.find((candidate) => candidate.uci === move.uci);
        if (!edge) {
          edge = { uci: move.uci, san: move.san, to: move.after, mine: isLearnerMove(move, file.side), lines: [] };
          node.moves.push(edge);
        }
        if (!edge.lines.includes(lineId)) edge.lines.push(lineId);
        if (move.note && !edge.note) edge.note = move.note;
        if (edge.mine && !alternative) {
          const answer = answers.get(move.before);
          if (answer && answer.uci !== move.uci) {
            throw new Error(
              `${id}: two answers after ${numberedMove(ply - 1, line.moves[ply - 1]!.san)}: ${answer.line} and ${lineId} (list one as an alternative)`,
            );
          }
          answers.set(move.before, { uci: move.uci, line: lineId });
        }
      });
      for (const refutation of line.refutations) {
        const [first, ...rest] = refutation.moves;
        if (!first) continue;
        const node = (positions[refutation.at] ??= { moves: [] });
        const list = (node.refutations ??= []);
        if (!list.some((existing) => existing.uci === first.uci)) {
          list.push({
            uci: first.uci,
            san: first.san,
            ...(first.note ? { note: first.note } : {}),
            then: rest.map((move) => ({ uci: move.uci, san: move.san })),
          });
        }
      }
      lines.push({
        id: lineId,
        variation: variation.id,
        kind: line.kind,
        ...(line.name ? { name: line.name } : {}),
        alternative,
        moves: line.moves.map((move) => move.uci),
        sans: line.moves.map((move) => move.san),
      });
    }
  }

  return {
    id,
    name: file.name,
    side: file.side,
    level: file.level,
    style: file.style,
    summary: file.summary,
    about: file.about,
    sources: file.sources,
    ideas: file.ideas,
    startEpd,
    startPly,
    positions,
    lines,
    variations: file.variations.map((variation) => ({
      id: variation.id,
      ...(variation.name ? { name: variation.name } : {}),
      ...(variation.intro ? { intro: variation.intro } : {}),
      plans: variation.plans,
      lines: variation.lines,
    })),
    steps: cutSteps(file, resolved, startPly, stepMoves),
    questions: buildQuestions(id, file.variations),
  };
}

/**
 * Steps: in teaching order, each line's learner moves not already taught, cut into runs of about `stepMoves`. A short
 * last run (under half a step) joins the one before. A step begins with the opponent's move that leads into it.
 */
export function cutSteps(
  file: OpeningFile,
  resolved: ReadonlyMap<string, ResolvedLine>,
  startPly: number,
  stepMoves: number,
): BuiltStep[] {
  const taught = new Set<string>();
  const alternatives = new Set(file.alternatives);
  const steps: BuiltStep[] = [];
  for (const variation of file.variations) {
    for (const lineId of variation.lines) {
      if (alternatives.has(lineId)) continue;
      const line = resolved.get(lineId)!;
      const fresh: TreeMove[] = line.moves.filter(
        (move) => move.ply >= startPly && isLearnerMove(move, file.side) && !taught.has(`${move.before} ${move.uci}`),
      );
      fresh.forEach((move) => taught.add(`${move.before} ${move.uci}`));
      const runs: TreeMove[][] = [];
      for (let i = 0; i < fresh.length; i += stepMoves) runs.push(fresh.slice(i, i + stepMoves));
      const last = runs.at(-1);
      if (runs.length > 1 && last && last.length * 2 < stepMoves) runs[runs.length - 2]!.push(...runs.pop()!);
      runs.forEach((run, n) => {
        const stepId = `${lineId}:${n + 1}`;
        const override = file.steps[stepId];
        steps.push({
          id: stepId,
          variation: variation.id,
          line: lineId,
          from: Math.max(startPly, run[0]!.ply - 1),
          to: run.at(-1)!.ply,
          ...(override?.title ? { title: override.title } : {}),
          ...(override?.text ? { text: override.text } : {}),
        });
      });
    }
  }
  return steps;
}
