import { playUci } from '../chess';
import { explainMotifs } from './motif';
import type { EvalLike, Explainer, Explanation, ExplainContext } from './types';

/** Mate scores count as a huge material swing, nearer mates counting more. */
const scoreOf = (line: { cp?: number; mate?: number }): number =>
  line.mate !== undefined ? (line.mate > 0 ? 10000 - line.mate : -10000 - line.mate) : (line.cp ?? 0);

/** Centipawns the mover loses by playing this move instead of the engine's best, 0 or less when it is as good. */
export const BIG_SWING_CP = 100;

export function swingFor(beforeEpd: string, evalBefore: EvalLike, evalAfter: EvalLike): number | null {
  const best = evalBefore.lines[0];
  const reply = evalAfter.lines[0];
  if (!best || !reply) return null;
  const mover = beforeEpd.split(' ')[1] === 'w' ? 1 : -1;
  return mover * (scoreOf(reply) - scoreOf(best));
}

/** The author's own note on the move, from the PGN comment. Always first and fully trusted. */
export const authorExplainer: Explainer = {
  explain(_beforeEpd, _uci, { edge }) {
    const text = edge?.annotation?.text;
    if (!text) return [];
    const bad = edge?.annotation?.nag.some((nag) => nag === 2 || nag === 4 || nag === 6);
    return [
      {
        kind: bad ? 'why-bad' : 'what-it-does',
        text,
        motifs: edge?.annotation?.motifs ?? [],
        confidence: 1,
        source: 'author',
        shapes: [...(edge?.annotation?.arrows ?? []), ...(edge?.annotation?.circles ?? [])],
      },
    ];
  },
};

/** Tactics found by looking at the board: hanging pieces, forks, pins, skewers, mate threats. */
export const motifExplainer: Explainer = {
  explain: (beforeEpd, uci) => explainMotifs(beforeEpd, uci),
};

/**
 * Turns an engine number into a sentence. It needs the evaluation before the move and after it. When the move costs
 * the mover a lot it names the engine's preferred move, and plays the first two moves of the refutation through the
 * motif detector to say what the punishment is ("After Qg5, the queen on g5 forks...").
 */
export const engineExplainer: Explainer = {
  explain(beforeEpd, uci, { evalBefore, evalAfter }) {
    if (!evalBefore || !evalAfter) return [];
    const swing = swingFor(beforeEpd, evalBefore, evalAfter);
    if (swing === null || swing > -BIG_SWING_CP) return [];

    const parts: string[] = [];
    const costed = swing <= -5000 ? 'a won game' : `about ${(-swing / 100).toFixed(1)} pawns`;
    parts.push(`The engine thinks this gives up ${costed}.`);

    const bestUci = evalBefore.lines[0]?.pv[0];
    if (bestUci && bestUci !== uci) {
      try {
        parts.push(`It prefers ${playUci(beforeEpd, bestUci).san}.`);
      } catch {
        // an engine move that does not fit this position is ignored
      }
    }

    const reply = evalAfter.lines[0];
    const motifs: Explanation['motifs'] = [];
    const shapes: string[] = [];
    try {
      let epd = playUci(beforeEpd, uci).epd;
      for (const next of (reply?.pv ?? []).slice(0, 2)) {
        const [note] = explainMotifs(epd, next).filter((e) => e.kind !== 'why-bad');
        const played = playUci(epd, next);
        if (note) {
          parts.push(`After ${played.san}, ${note.text.charAt(0).toLowerCase()}${note.text.slice(1)}`);
          motifs.push(...note.motifs);
          shapes.push(...(note.shapes ?? []));
          break;
        }
        epd = played.epd;
      }
    } catch {
      // stop at the first reply that cannot be played
    }
    if (reply?.mate !== undefined && swing < 0 && Math.abs(reply.mate) <= 8) {
      const against = (beforeEpd.split(' ')[1] === 'w') === reply.mate < 0;
      if (against) parts.push(`It leads to mate in ${Math.abs(reply.mate)}.`);
    }

    return [{ kind: 'why-bad', text: parts.join(' '), motifs, confidence: 0.75, source: 'engine', shapes }];
  },
};

/** Providers in order of trust: the author, then the board, then the engine. */
export const explainers: readonly Explainer[] = [authorExplainer, motifExplainer, engineExplainer];

/** When the author wrote a note, generated notes must earn their place: only the confident ones are kept. */
export const MIN_CONFIDENCE_WITH_AUTHOR = 0.7;

export function explainMove(beforeEpd: string, uci: string, context: ExplainContext = {}): Explanation[] {
  const all = explainers.flatMap((explainer) => explainer.explain(beforeEpd, uci, context));
  const authored = all.some((note) => note.source === 'author');
  return authored
    ? all.filter((note) => note.source === 'author' || note.confidence >= MIN_CONFIDENCE_WITH_AUTHOR)
    : all;
}
