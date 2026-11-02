import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  resolveSetting,
  SETTINGS,
  valueLabel,
  type LayerValues,
  type SettingValue,
  type WritableLayer,
} from './registry';
import { useLiveSettings } from './live';
import { SettingsRow } from './settings-row';

export type SettingInlineProps = {
  setting: string;
  /** The line's words, written for the moment: "Too fast? Slow the feedback down". */
  prompt: string;
  /** By default the learner's stored settings, and changes save there, undoable. */
  layers?: LayerValues;
  presetId?: string;
  layer?: WritableLayer;
  /** The opening whose layer it writes (with `layer="opening"`). */
  opening?: string;
  onChange?: (key: string, value: SettingValue) => void;
  onReset?: (key: string) => void;
  /** Hides it for this session (three of these for one setting stop it for good: the page counts). */
  onNotNow: () => void;
  /** The group on the settings page, `/settings#group=feedback`. */
  moreHref: string;
  /** Set by the page once a change has saved; the line then says so until the next action. */
  saved?: boolean;
  /** The words once saved; by default "Saved. Speed of play is now slow everywhere." */
  savedText?: (value: string) => string;
  className?: string;
};

/**
 * A setting offered where it bites, one short line with the control right there. The page decides when to show it
 * (never during a test, at most once per session); this only draws it (docs/v2/components/setting-inline.md).
 */
export function SettingInline({
  setting,
  prompt,
  layers: givenLayers,
  presetId: givenPreset,
  layer = 'you',
  opening,
  onChange,
  onReset,
  onNotNow,
  moreHref,
  saved = false,
  savedText,
  className,
}: SettingInlineProps) {
  const def = SETTINGS[setting];
  const live = useLiveSettings({ layer, opening });
  if (!def) return null;
  const layers = givenLayers ?? live.layers;
  const presetId = givenPreset ?? live.presetId;
  const now = valueLabel(def, resolveSetting(def, layers, presetId, layer).value);
  const where = layer === 'opening' ? 'for this opening' : 'everywhere';
  return (
    <div
      className={cn('grid gap-1 rounded-lg border border-dashed px-3 py-2', className)}
      role="group"
      aria-label={prompt}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm text-muted-foreground">{prompt}</p>
        <SettingsRow
          setting={setting}
          layers={givenLayers}
          presetId={presetId}
          layer={layer}
          opening={opening}
          onChange={onChange}
          onReset={onReset}
          density="compact"
          hideLabel
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {saved ? (
          <p role="status" className="flex items-center gap-1.5">
            <CircleCheck aria-hidden className="size-3.5 text-muted-foreground" />
            {savedText ? savedText(now) : `Saved. ${def.label} is now ${now} ${where}.`}
          </p>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="xs" onClick={onNotNow}>
            Not now
          </Button>
          <Button asChild variant="link" size="xs">
            <a href={moreHref}>More settings</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
