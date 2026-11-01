import { Check, CircleHelp, X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { forgivingMatch, normalise } from '@/components/finding/text-match';
import { cn } from '@/lib/utils';

export type AnswerVerdict = {
  credit: 'full' | 'half' | 'none';
  /** "Right opening, the variation is the Advance". */
  message: string;
  /** The accepted answers, listed when it was not full credit. */
  accepted?: string[];
};

const CREDIT = {
  full: { icon: Check, tone: 'text-feedback-right', label: 'Full credit' },
  half: { icon: CircleHelp, tone: 'text-foreground', label: 'Half credit' },
  none: { icon: X, tone: 'text-feedback-wrong', label: 'Missed' },
} as const;

export type AnswerInputProps = {
  /** Names to suggest from; none for a free question, where suggesting would give the answer away. */
  suggestions?: readonly string[];
  onAnswer: (text: string) => void;
  /** I don't know: counts as missed and shows the answer. */
  onGiveUp: () => void;
  /** Given by the exercise once answered; the input only collects. */
  verdict?: AnswerVerdict | null;
  /** What was typed, shown read-only once answered. */
  answered?: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

/** A typed answer with forgiving suggestions as you type (docs/v2/components/answer-input.md). */
export function AnswerInput({
  suggestions,
  onAnswer,
  onGiveUp,
  verdict,
  answered,
  placeholder = 'For example: Caro-Kann, Advance',
  autoFocus = true,
  className,
}: AnswerInputProps) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(-1);
  const [hidden, setHidden] = useState(false);
  const listId = useId();
  const done = Boolean(verdict);
  const matches = useMemo(() => {
    if (!suggestions || !text.trim() || done) return [];
    if (suggestions.some((s) => normalise(s) === normalise(text))) return [];
    return suggestions
      .map((name) => ({ name, match: forgivingMatch(text, name) }))
      .filter((s) => s.match)
      .sort((a, b) => b.match!.score - a.match!.score)
      .slice(0, 6)
      .map((s) => s.name);
  }, [suggestions, text, done]);
  const shown = hidden ? [] : matches;
  const fill = (name: string) => {
    setText(name);
    setActive(-1);
  };
  const submit = () => {
    if (text.trim()) onAnswer(text.trim());
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input
          value={done ? (answered ?? text) : text}
          readOnly={done}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Your answer"
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className={cn('min-w-0 flex-1 basis-56', done && 'bg-muted/50')}
          onChange={(event) => {
            setText(event.target.value);
            setActive(-1);
            setHidden(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && shown.length) {
              event.preventDefault();
              setActive((i) => (i + 1) % shown.length);
            } else if (event.key === 'ArrowUp' && shown.length) {
              event.preventDefault();
              setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
            } else if ((event.key === 'Enter' || event.key === 'Tab') && active >= 0 && shown[active]) {
              event.preventDefault();
              fill(shown[active]);
            } else if (event.key === 'Escape') {
              setHidden(true);
              setActive(-1);
            }
            // Typing never reaches the page's own shortcuts.
            event.stopPropagation();
          }}
        />
        {done ? null : (
          <>
            <Button type="submit" disabled={!text.trim()}>
              Answer
            </Button>
            <Button type="button" variant="ghost" onClick={onGiveUp}>
              I don't know
            </Button>
          </>
        )}
      </form>

      {shown.length > 0 ? (
        <ul id={listId} role="listbox" aria-label="Suggestions" className="flex flex-wrap gap-1.5">
          {shown.map((name, i) => (
            <li key={name} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <Button
                type="button"
                variant={i === active ? 'default' : 'outline'}
                size="xs"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => fill(name)}
              >
                {name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {verdict ? (
        <div className="grid gap-1 text-sm" aria-live="polite">
          <p className={cn('flex items-center gap-1.5 font-medium', CREDIT[verdict.credit].tone)}>
            {(() => {
              const Icon = CREDIT[verdict.credit].icon;
              return <Icon className="size-4" aria-hidden />;
            })()}
            {CREDIT[verdict.credit].label}:<span className="font-normal text-foreground">{verdict.message}</span>
          </p>
          {verdict.credit !== 'full' && verdict.accepted?.length ? (
            <p className="text-muted-foreground">Accepted: {verdict.accepted.join(', ')}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
