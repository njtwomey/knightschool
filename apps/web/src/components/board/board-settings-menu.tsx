import { resolveSetting, type SettingKey, type SettingValues } from '@knightschool/core';
import { Settings } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { SettingsRow } from '@/components/settings/settings-row';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { registry, setSetting, settingLayers, useSettingsSnapshot, type SettingsSnapshot } from '@/data/settings';
import { useIsMobile } from '@/hooks/use-mobile';
import { to } from '@/router/location';

/*
 * The board's device settings (docs/v2/components/board-settings-menu.md), read and written through the settings
 * registry (`use-setting`): every board on the page follows a change at once. v1's `knightschool.board` is carried
 * over once by the settings store. `useBoardSettings` and `setBoardSetting` keep the board's own short names.
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

/** The board's short names for its settings, and the registry key each one reads. */
const BOARD_KEYS = {
  theme: 'board.theme',
  pieces: 'board.pieces',
  coordinates: 'board.coordinates',
  legalMoves: 'board.legalMoves',
  hover: 'board.hoverSquare',
  lastMove: 'board.lastMove',
  marksWhileStudying: 'board.marksWhileStudying',
  notation: 'board.notation',
  animation: 'board.animation',
  engineOn: 'engine.on',
  engineLines: 'engine.lines',
  engineDepth: 'engine.depth',
  sizeCap: 'board.sizeCap',
} as const satisfies Record<string, SettingKey>;

export type BoardSettings = { [K in keyof typeof BOARD_KEYS]: SettingValues[(typeof BOARD_KEYS)[K]] };

/** Each board setting's registry default. */
export const BOARD_DEFAULTS = Object.fromEntries(
  Object.entries(BOARD_KEYS).map(([name, key]) => [name, registry.byKey[key].default]),
) as BoardSettings;

/** Change a board setting: applies at once to every board on the page and is saved as it is made (undoable). */
export function setBoardSetting<K extends keyof BoardSettings>(name: K, value: BoardSettings[K]) {
  setSetting(BOARD_KEYS[name], value as never);
}

const readBoard = (snapshot: SettingsSnapshot): BoardSettings => {
  const layers = settingLayers(snapshot);
  return Object.fromEntries(
    Object.entries(BOARD_KEYS).map(([name, key]) => [name, resolveSetting(registry.byKey[key], layers).value]),
  ) as BoardSettings;
};

/** The board's device settings, shared by every board on the page. */
export function useBoardSettings(): BoardSettings {
  const snapshot = useSettingsSnapshot();
  return useMemo(() => readBoard(snapshot), [snapshot]);
}

export type SettingsGroup = 'look' | 'display' | 'engine';

const GROUP_KEYS: Record<SettingsGroup, { title: string; keys: SettingKey[] }> = {
  look: { title: 'Look', keys: ['board.theme', 'board.pieces', 'board.coordinates'] },
  display: {
    title: 'Display',
    keys: [
      'board.legalMoves',
      'board.hoverSquare',
      'board.lastMove',
      'board.marksWhileStudying',
      'board.notation',
      'board.animation',
    ],
  },
  engine: { title: 'Engine', keys: ['engine.on', 'engine.lines'] },
};

function GroupTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</h3>;
}

/** The menu's content: the groups asked for, each a few compact settings rows, then the link to every setting. */
export function BoardSettingsForm({
  groups = ['look', 'display'],
  settingsHref = to('/settings/board'),
}: {
  groups?: SettingsGroup[];
  settingsHref?: string;
}) {
  const engineOn = useBoardSettings().engineOn;
  const sections = groups.map((group) => (
    <section key={group} className="grid" aria-label={GROUP_KEYS[group].title}>
      <GroupTitle>{GROUP_KEYS[group].title}</GroupTitle>
      {GROUP_KEYS[group].keys.map((key) => (
        <SettingsRow
          key={key}
          setting={key}
          density="compact"
          unavailable={key === 'engine.lines' && !engineOn ? 'The engine is off.' : undefined}
        />
      ))}
    </section>
  ));
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
