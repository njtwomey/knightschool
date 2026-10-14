import type { LineEdge, Motif } from '../schema/content';

/** One sentence about a move, and where it came from. */
export type Explanation = {
  kind: 'why-good' | 'why-bad' | 'what-it-does';
  text: string;
  motifs: Motif[];
  /** 0 to 1: how sure the source is. Author notes are 1. */
  confidence: number;
  source: 'author' | 'motif' | 'engine' | 'llm';
  /** Shapes that show the claim on the board, in PGN form: arrows 'Rd1h5', circles 'Re4' (colour letter first). */
  shapes?: string[];
};

/** The part of an engine result the explainer needs. Scores are White's point of view, as the engine package gives. */
export type EvalLike = { lines: { cp?: number; mate?: number; pv: string[] }[] };

export type ExplainContext = {
  /** The move as authored, for its annotation. */
  edge?: LineEdge;
  evalBefore?: EvalLike;
  evalAfter?: EvalLike;
};

/** One interface, several providers. A language-model provider can be added later without touching the UI. */
export interface Explainer {
  explain(beforeEpd: string, uci: string, context: ExplainContext): Explanation[];
}
