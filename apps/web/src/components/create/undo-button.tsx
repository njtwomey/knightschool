import { Undo2 } from 'lucide-react';
import { useEffect } from 'react';
import { Hint } from '@/components/shared/hint';
import { Button } from '@/components/ui/button';

/** Labels longer than this are cut, with the whole name on the hint. */
const MAX_LABEL = 40;

export type UndoButtonProps = {
  /** The last action's name ("delete line 2...Bc5"), or null when there is nothing to take back. */
  label: string | null;
  onUndo: () => void;
  /** `default` in a page's header, `sm` inside a notice. */
  size?: 'default' | 'sm';
  /** Ctrl+Z / Cmd+Z takes it back too, when focus is not in a text field. Only one button per page sets this. */
  shortcut?: boolean;
};

const inTextField = (target: EventTarget | null) =>
  target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"]');

/**
 * Takes back the last change and says which: the one way to take something back in Create and in Settings, where
 * everything saves as you go (docs/v2/components/undo-button.md). One click, one action, however many rows it changed.
 */
export function UndoButton({ label, onUndo, size = 'default', shortcut = false }: UndoButtonProps) {
  useEffect(() => {
    if (!shortcut || !label) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'z' || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey)
        return;
      if (inTextField(event.target)) return;
      event.preventDefault();
      onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcut, label, onUndo]);

  const variant = size === 'sm' ? 'ghost' : 'outline';
  const buttonSize = size === 'sm' ? 'xs' : 'sm';

  if (!label) {
    return (
      <Hint text="Nothing to undo">
        <span tabIndex={0} className="inline-flex rounded-md" aria-label="Undo, nothing to undo">
          <Button variant={variant} size={buttonSize} disabled tabIndex={-1} aria-hidden>
            <Undo2 aria-hidden /> Undo
          </Button>
        </span>
      </Hint>
    );
  }

  const full = `Undo: ${label}`;
  const cut = full.length > MAX_LABEL ? `${full.slice(0, MAX_LABEL - 1).trimEnd()}…` : full;
  const button = (
    <Button variant={variant} size={buttonSize} onClick={onUndo} aria-label={full}>
      <Undo2 aria-hidden /> {cut}
    </Button>
  );
  return cut === full ? button : <Hint text={full}>{button}</Hint>;
}
