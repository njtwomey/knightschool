import { z } from 'zod';
import { QuestionEntry } from '../questions/questions';

const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lower-case words joined by hyphens');

export const LINE_KINDS = ['main', 'sideline', 'rare', 'gambit', 'trap', 'danger'] as const;
export type LineKind = (typeof LINE_KINDS)[number];
export const LineHeadersSchema = z.object({
  for: z.enum(['white', 'black'], { message: '[For] must be "white" or "black"' }),
  kind: z.enum(LINE_KINDS, { message: `[Kind] must be one of ${LINE_KINDS.join(', ')}` }),
  start: z.string().optional(),
  name: z.string().optional(),
});

/** An opening for one side: content/openings/<id>.yaml (docs/v2/schemas/content.md). */
export const OpeningFile = z.object({
  name: z.string().min(1),
  side: z.enum(['white', 'black']),
  start: z.string().min(1),
  level: z.enum(['first', 'next', 'further']),
  style: z.array(z.string()).default([]),
  summary: z.string().min(1),
  about: z.object({
    idea: z.string().min(1),
    risks: z.string().min(1),
    suits: z.string().min(1),
    origin: z.string().optional(),
  }),
  sources: z.array(z.object({ title: z.string(), url: z.string().url(), author: z.string().optional() })).default([]),
  ideas: z.array(Slug).default([]),
  variations: z
    .array(
      z.object({
        id: Slug,
        name: z.string().optional(),
        intro: z.string().optional(),
        lines: z.array(Slug).min(1),
        plans: z.array(z.string()).default([]),
        /** Questions in words about this variation's positions (docs/v2/schemas/content.md). */
        questions: z.array(QuestionEntry).default([]),
      }),
    )
    .min(1),
  steps: z.record(z.string(), z.object({ title: z.string().optional(), text: z.string().optional() })).default({}),
  /** The setup step: how the opening comes about, from the first move to its start (steps.md, "The setup"). */
  setup: z.object({ title: z.string().optional(), text: z.string().optional() }).optional(),
  alternatives: z.array(Slug).default([]),
});
export type OpeningFile = z.infer<typeof OpeningFile>;

export const IdeasFile = z.array(
  z.object({
    id: Slug,
    name: z.string().min(1),
    kind: z.enum(['tactic', 'plan', 'structure', 'principle']),
    summary: z.string().min(1),
    themes: z.array(z.string()).default([]),
  }),
);
export type IdeasFile = z.infer<typeof IdeasFile>;

export const TracksFile = z.array(z.object({ id: Slug, name: z.string().min(1), openings: z.array(Slug).min(1) }));
export type TracksFile = z.infer<typeof TracksFile>;
