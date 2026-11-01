import { Check, RotateCcw, Settings } from 'lucide-react';
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

/*
 * The board's device settings (docs/v2/settings.md, the board and engine rows). A small store of its own until the
 * settings registry and `use-setting` exist; the key and format of v1's `knightschool.board` are kept so a saved
 * choice still reads, and the new settings sit beside them.
 */

/** Board themes: each square colour is a token in index.css (`--board-<theme>-light`, `-dark`). */
export const BOARD_THEMES = [
  { id: 'green', name: 'Green', light: 'var(--board-green-light)', dark: 'var(--board-green-dark)' },
  { id: 'tan', name: 'Tan', light: 'var(--board-tan-light)', dark: 'var(--board-tan-dark)' },
  { id: 'blue', name: 'Blue', light: 'var(--board-blue-light)', dark: 'var(--board-blue-dark)' },
  { id: 'slate', name: 'Slate', light: 'var(--board-slate-light)', dark: 'var(--board-slate-dark)' },
  { id: 'purple', name: 'Purple', light: 'var(--board-purple-light)', dark: 'var(--board-purple-dark)' },
] as const;

export const PIECE_SETS = [
  { id: 'classic', name: 'Classic' },
  { id: 'bold', name: 'Bold outline' },
  { id: 'soft', name: 'Soft shadow' },
] as const;

export type BoardSettings = {
  theme: (typeof BOARD_THEMES)[number]['id'];
  pieces: (typeof PIECE_SETS)[number]['id'];
  coordinates: boolean;
  legalMoves: boolean;
  /** Stored as `hover` in v1's format. */
  hover: boolean;
  lastMove: boolean;
  marksWhileStudying: boolean;
  notation: 'letters' | 'figurines';
  animation: boolean;
  engineOn: boolean;
  engineLines: number;
};

export const BOARD_DEFAULTS: BoardSettings = {
  theme: 'green',
  pieces: 'classic',
  coordinates: true,
  legalMoves: true,
  hover: false,
  lastMove: true,
  marksWhileStudying: true,
  notation: 'letters',
  animation: true,
  engineOn: true,
  engineLines: 1,
};

const KEY = 'knightschool.board';

function read(): BoardSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
    const out = { ...BOARD_DEFAULTS };
    for (const key of Object.keys(BOARD_DEFAULTS) as (keyof BoardSettings)[]) {
      // Keep only values of the right type, so an old or damaged value cannot break the board.
      if (typeof raw[key] === typeof BOARD_DEFAULTS[key]) (out as Record<string, unknown>)[key] = raw[key];
    }
    if (!BOARD_THEMES.some((theme) => theme.id === out.theme)) out.theme = BOARD_DEFAULTS.theme;
    if (!PIECE_SETS.some((set) => set.id === out.pieces)) out.pieces = BOARD_DEFAULTS.pieces;
    return out;
  } catch {
    return { ...BOARD_DEFAULTS };
  }
}

let current: BoardSettings | null = null;
const listeners = new Set<() => void>();

function snapshot() {
  current ??= read();
  return current;
}

/** Change a board setting: applies at once to every board on the page and is saved as it is made. */
export function setBoardSetting<K extends keyof BoardSettings>(key: K, value: BoardSettings[K]) {
  current = { ...snapshot(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Private windows and full storage: the change still applies for this visit.
  }
  for (const listener of listeners) listener();
}

/** The board's device settings, shared by every board on the page. */
export function useBoardSettings(): BoardSettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    snapshot,
  );
}

export type SettingsGroup = 'look' | 'display' | 'engine';

/** One compact settings row: label, control, the hint on hover, and a reset when it differs from the preset. */
function Row<K extends keyof BoardSettings>({
  setting,
  label,
  hint,
  children,
  stacked,
}: {
  setting: K;
  label: string;
  hint: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  const values = useBoardSettings();
  const changed = values[setting] !== BOARD_DEFAULTS[setting];
  return (
    <div className={cn('flex gap-2', stacked ? 'flex-col items-start' : 'min-h-8 items-center justify-between')}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Label htmlFor={`board-setting-${setting}`} className="cursor-default text-sm font-normal">
              {label}
            </Label>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-56">
            {hint}
          </TooltipContent>
        </Tooltip>
        {changed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Reset ${label.toLowerCase()}`}
                onClick={() => setBoardSetting(setting, BOARD_DEFAULTS[setting])}
              >
                <RotateCcw aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to the default</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function SwitchRow({ setting, label, hint }: { setting: keyof BoardSettings; label: string; hint: string }) {
  const values = useBoardSettings();
  return (
    <Row setting={setting} label={label} hint={hint}>
      <Switch
        id={`board-setting-${setting}`}
        checked={Boolean(values[setting])}
        onCheckedChange={(checked) => setBoardSetting(setting, checked as never)}
      />
    </Row>
  );
}

function GroupTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h3>;
}

/** The menu's content: the groups asked for, then the link to every setting. */
export function BoardSettingsForm({
  groups = ['look', 'display'],
  settingsHref = '/settings#board',
}: {
  groups?: SettingsGroup[];
  settingsHref?: string;
}) {
  const values = useBoardSettings();
  const sections: ReactNode[] = [];
  if (groups.includes('look')) {
    sections.push(
      <section key="look" className="grid gap-2" aria-label="Look">
        <GroupTitle>Look</GroupTitle>
        <Row setting="theme" label="Board colours" hint="The colours of the squares on every board." stacked>
          <ToggleGroup
            id="board-setting-theme"
            type="single"
            value={values.theme}
            onValueChange={(value) => value && setBoardSetting('theme', value as BoardSettings['theme'])}
            spacing={1}
            aria-label="Board colours"
          >
            {BOARD_THEMES.map((theme) => (
              <Tooltip key={theme.id}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={theme.id}
                    aria-label={theme.name}
                    className="size-9 p-0.5 aria-checked:ring-2 aria-checked:ring-ring data-[state=on]:bg-transparent"
                  >
                    <span className="relative grid size-full grid-cols-2 overflow-hidden rounded-md" aria-hidden>
                      <span style={{ background: theme.light }} />
                      <span style={{ background: theme.dark }} />
                      <span style={{ background: theme.dark }} />
                      <span style={{ background: theme.light }} />
                      {values.theme === theme.id ? (
                        <Check className="absolute inset-0 m-auto size-4 text-foreground drop-shadow" />
                      ) : null}
                    </span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{theme.name}</TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>
        </Row>
        <Row setting="pieces" label="Pieces" hint="How the pieces are drawn.">
          <Select
            value={values.pieces}
            onValueChange={(value) => setBoardSetting('pieces', value as BoardSettings['pieces'])}
          >
            <SelectTrigger id="board-setting-pieces" size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIECE_SETS.map((set) => (
                <SelectItem key={set.id} value={set.id}>
                  {set.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <SwitchRow setting="coordinates" label="Coordinates" hint="The letters and numbers round the board." />
      </section>,
    );
  }
  if (groups.includes('display')) {
    sections.push(
      <section key="display" className="grid gap-1" aria-label="Display">
        <GroupTitle>Display</GroupTitle>
        <SwitchRow setting="legalMoves" label="Legal moves" hint="Dots on the squares a picked-up piece can go to." />
        <SwitchRow setting="hover" label="Square under the pointer" hint="Tint the square the pointer is over." />
        <SwitchRow setting="lastMove" label="Last move" hint="Highlight the two squares of the last move." />
        <SwitchRow
          setting="marksWhileStudying"
          label="Marks while studying"
          hint="The author's arrows and rings. Turn off for a clean board; they never show while you are tested."
        />
        <Row setting="notation" label="Notation" hint="How moves are written: Nf3 or with a small knight.">
          <ToggleGroup
            id="board-setting-notation"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={values.notation}
            onValueChange={(value) => value && setBoardSetting('notation', value as BoardSettings['notation'])}
          >
            <ToggleGroupItem value="letters">Nf3</ToggleGroupItem>
            <ToggleGroupItem value="figurines" aria-label="Figurines">
              ♘f3
            </ToggleGroupItem>
          </ToggleGroup>
        </Row>
        <SwitchRow setting="animation" label="Animation" hint="Pieces slide to their squares." />
      </section>,
    );
  }
  if (groups.includes('engine')) {
    sections.push(
      <section key="engine" className="grid gap-1" aria-label="Engine">
        <GroupTitle>Engine</GroupTitle>
        <SwitchRow
          setting="engineOn"
          label="Engine"
          hint="Stockfish's evaluation beside the board, in your browser. Never while you are tested."
        />
        <Row setting="engineLines" label="Lines" hint="How many of the engine's best lines to show.">
          <ToggleGroup
            id="board-setting-engineLines"
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            disabled={!values.engineOn}
            value={String(values.engineLines)}
            onValueChange={(value) => value && setBoardSetting('engineLines', Number(value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="tabular-nums">
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Row>
      </section>,
    );
  }
  return (
    <div className="grid gap-3">
      {sections.flatMap((section, i) => (i === 0 ? [section] : [<Separator key={`sep-${i}`} />, section]))}
      <Separator />
      <Button variant="link" size="sm" className="justify-self-start px-0" asChild>
        <a href={settingsHref}>All settings</a>
      </Button>
    </div>
  );
}

/**
 * The gear beside every board and its menu: how the board looks and what it shows, changed on the spot
 * (docs/v2/components/board-settings-menu.md). A popover, or a bottom sheet on a phone.
 */
export function BoardSettingsMenu({
  groups,
  layout,
  defaultOpen,
}: {
  /** Which groups to show: a board without an eval part leaves Engine out. */
  groups?: SettingsGroup[];
  /** Forced popover or sheet; by default a sheet on a phone. */
  layout?: 'popover' | 'sheet';
  defaultOpen?: boolean;
}) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const sheet = (layout ?? (mobile ? 'sheet' : 'popover')) === 'sheet';
  const gear = (
    <Button variant="ghost" size="icon" className="size-11 sm:size-8" aria-label="Board settings">
      <Settings aria-hidden />
    </Button>
  );
  const trigger = (Trigger: typeof PopoverTrigger | typeof SheetTrigger) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Trigger asChild>{gear}</Trigger>
      </TooltipTrigger>
      <TooltipContent>Board settings</TooltipContent>
    </Tooltip>
  );
  if (sheet) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {trigger(SheetTrigger)}
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Board settings</SheetTitle>
            <SheetDescription>Changes apply at once and are saved on this device.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <BoardSettingsForm groups={groups} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger(PopoverTrigger)}
      <PopoverContent align="start" className="w-80">
        <BoardSettingsForm groups={groups} />
      </PopoverContent>
    </Popover>
  );
}
