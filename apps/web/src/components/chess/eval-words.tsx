import { evalWords, type Score } from '@knightschool/core';
import { siteConfig } from '@/data/site-config';
import { cn } from '@/lib/utils';

/** Where a position stands, in words and numbers: "White is a little better (+0.6)". */
export function EvalWords({ score, depth, className }: { score: Score | null; depth?: number; className?: string }) {
  if (!score) return <span className={cn('text-muted-foreground', className)}>No evaluation yet</span>;
  const words = evalWords(score, siteConfig.judge.evalWords);
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', className)}>
      <span className="font-medium">{words.words}</span>
      <span className="font-mono text-sm text-muted-foreground tabular-nums">{words.number}</span>
      {depth ? <span className="text-xs text-muted-foreground">depth {depth}</span> : null}
    </span>
  );
}
