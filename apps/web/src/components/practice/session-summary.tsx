import { numberedMove, type Score } from '@knightschool/core';
import { Check, ChevronDown, CircleHelp, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { EvalWords } from '@/components/chess/eval-words';
import { TriesTable, type Try } from '@/components/chess/tries-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { MODE_INFO, type PracticeConfig, type PracticeMode, type PracticeSource } from './practice-config';
import { PracticeSetup, type SetupField } from './practice-setup';

/** A large figure in the mode's terms: "15 right first time", "1.8 s a move". */
export type SummaryFigure = { value: string; label: string };

/** One position of a Name it session: what was typed, the right name, the credit. */
export type NamedAnswer = { ply: number; san: string; typed: string; right: string; credit: 'full' | 'half' | 'none' };

export type SessionSummaryProps = {
  mode: PracticeMode | 'step';
  /** "Review done: 20 moves." */
  headline: string;
  /** "15 right first time, 3 with help, 2 to see again soon." */
  sentence?: string;
  figures?: SummaryFigure[];
  /** Every try of the session, for the modes that ask moves. */
  tries?: Try[];
  onSelectTry?: (index: number) => void;
  /** Name it keeps its own list instead of the tries table. */
  named?: NamedAnswer[];
  /** `feedback.triesTable`: with off, the table here is folded behind "See every try". */
  triesTable?: 'live' | 'end' | 'off';
  /** The ideas the session touched. */
  ideas?: string[];
  /** Where the line leaves you, for a step's Done stage. */
  evalAfter?: Score | null;
  /** The next action for the same scope. */
  next?: ReactNode;
  /** The set-up card labelled Again; left out for a step's Done stage. */
  again?: {
    config: PracticeConfig;
    sources: readonly PracticeSource[];
    due?: number;
    only?: readonly SetupField[];
    onStart: (config: PracticeConfig) => void;
  };
  /** Free practice: nothing here changes the schedule. */
  free?: boolean;
  /** An empty session: no figures or table, the reason and the ways on. */
  empty?: { reason: string; ways: ReactNode };
  className?: string;
};

const CREDIT_ICON = { full: Check, half: CircleHelp, none: X } as const;
const CREDIT_TEXT = { full: 'Full', half: 'Half', none: 'None' } as const;
const CREDIT_TONE = { full: 'text-feedback-right', half: 'text-foreground', none: 'text-feedback-wrong' } as const;

function NamedTable({ named }: { named: NamedAnswer[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>After</TableHead>
            <TableHead>You typed</TableHead>
            <TableHead>The name</TableHead>
            <TableHead>Credit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {named.map((answer, i) => {
            const Icon = CREDIT_ICON[answer.credit];
            return (
              <TableRow key={i}>
                <TableCell className="font-mono text-sm">{numberedMove(answer.ply, answer.san)}</TableCell>
                <TableCell className={cn(!answer.typed && 'text-muted-foreground')}>
                  {answer.typed || 'I don’t know'}
                </TableCell>
                <TableCell>{answer.right}</TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center gap-1', CREDIT_TONE[answer.credit])}>
                    <Icon className="size-4" aria-hidden />
                    {CREDIT_TEXT[answer.credit]}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The end of any practice session: how it went in the mode's terms, every try with its cost, and what to do next
 * (docs/v2/components/session-summary.md).
 */
export function SessionSummary({
  mode,
  headline,
  sentence,
  figures = [],
  tries,
  onSelectTry,
  named,
  triesTable = 'end',
  ideas = [],
  evalAfter,
  next,
  again,
  free,
  empty,
  className,
}: SessionSummaryProps) {
  const tone = mode === 'step' ? 'text-mode-learn' : MODE_INFO[mode].text;
  const Icon = mode === 'step' ? Check : MODE_INFO[mode].icon;

  if (empty) {
    return (
      <div className={cn('grid gap-4', className)}>
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle className="flex items-center gap-2">
              <Icon className={cn('size-4', tone)} aria-hidden />
              {headline}
            </EmptyTitle>
            <EmptyDescription>{empty.reason}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex-row flex-wrap justify-center">{empty.ways}</EmptyContent>
        </Empty>
      </div>
    );
  }

  const table = tries ? <TriesTable tries={tries} onSelect={onSelectTry} /> : null;
  return (
    <div className={cn('grid gap-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className={cn('size-5', tone)} aria-hidden />
            {headline}
          </CardTitle>
          {sentence || free ? (
            <CardDescription>
              {sentence}
              {sentence && free ? ' ' : null}
              {free ? 'Nothing here changes your schedule.' : null}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-5">
          {figures.length > 0 ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {figures.map((figure) => (
                <div key={figure.label} className="grid gap-0.5">
                  <dd className="text-3xl font-semibold tabular-nums">{figure.value}</dd>
                  <dt className="order-last text-sm text-muted-foreground">{figure.label}</dt>
                </div>
              ))}
            </dl>
          ) : null}

          {table ? (
            triesTable === 'off' ? (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="group">
                    See every try
                    <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">{table}</CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="grid gap-2">
                <h3 className="text-sm font-medium">Every try</h3>
                {table}
                {onSelectTry ? (
                  <p className="text-xs text-muted-foreground">Pick a row to see it on the board.</p>
                ) : null}
              </div>
            )
          ) : null}

          {named ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">Every position</h3>
              <NamedTable named={named} />
            </div>
          ) : null}

          {ideas.length > 0 || evalAfter !== undefined ? (
            <div className="grid gap-2">
              {ideas.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">Ideas you met:</span>
                  {ideas.map((idea) => (
                    <Badge key={idea} variant="secondary">
                      {idea}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {evalAfter !== undefined ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Where the line leaves you: </span>
                  <EvalWords score={evalAfter} />
                </p>
              ) : null}
            </div>
          ) : null}

          {next ? <div className="flex flex-wrap gap-2">{next}</div> : null}
        </CardContent>
      </Card>
      {again && mode !== 'step' ? (
        <PracticeSetup
          mode={mode}
          initial={again.config}
          sources={again.sources}
          due={again.due}
          only={again.only}
          startLabel="Again"
          title="Another session"
          onStart={again.onStart}
        />
      ) : null}
    </div>
  );
}
