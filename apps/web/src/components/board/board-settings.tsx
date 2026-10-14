import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { PIECE_SETS, useBoardPrefs, type PieceSetId } from './prefs';
import { BOARD_THEMES, type BoardThemeId } from './themes';

/** The board choices, shared by the Settings page and the quick popover next to every board. */
export function BoardSettingsForm() {
  const prefs = useBoardPrefs();
  return (
    <div className="grid gap-5">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Board colours</legend>
        <RadioGroup
          value={prefs.theme}
          onValueChange={(theme) => prefs.set({ theme: theme as BoardThemeId })}
          className="grid grid-cols-5 gap-2"
        >
          {BOARD_THEMES.map((theme) => (
            <Label
              key={theme.id}
              htmlFor={`theme-${theme.id}`}
              className="grid cursor-pointer justify-items-center gap-1 rounded-md border p-1.5 text-xs has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-primary/40"
            >
              <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} className="sr-only" />
              <span className="grid size-10 grid-cols-2 overflow-hidden rounded-sm" aria-hidden>
                <span style={{ background: theme.light }} />
                <span style={{ background: theme.dark }} />
                <span style={{ background: theme.dark }} />
                <span style={{ background: theme.light }} />
              </span>
              {theme.name}
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Pieces</legend>
        <RadioGroup value={prefs.pieces} onValueChange={(pieces) => prefs.set({ pieces: pieces as PieceSetId })}>
          {PIECE_SETS.map((set) => (
            <div key={set.id} className="flex items-start gap-2">
              <RadioGroupItem value={set.id} id={`pieces-${set.id}`} className="mt-0.5" />
              <Label htmlFor={`pieces-${set.id}`} className="grid gap-0.5 font-normal">
                <span className="font-medium">{set.name}</span>
                <span className="text-xs text-muted-foreground">{set.note}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="grid gap-3">
        {(
          [
            ['legalMoves', 'Show where a piece can go'],
            ['hover', 'Show corner brackets on the square under the pointer'],
            ['coordinates', 'Show a–h and 1–8'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <Label htmlFor={`pref-${key}`} className="font-normal">
              {label}
            </Label>
            <Switch
              id={`pref-${key}`}
              checked={prefs[key]}
              onCheckedChange={(checked) => prefs.set({ [key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A gear beside the board that opens the same choices without leaving the page. */
export function BoardSettingsButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Board settings">
          <Settings2 aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <BoardSettingsForm />
      </PopoverContent>
    </Popover>
  );
}
