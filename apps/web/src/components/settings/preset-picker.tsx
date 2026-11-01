import { ArrowRight, Check } from 'lucide-react';
import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  PRESETS,
  presetOf,
  resolveSetting,
  SETTINGS,
  valueLabel,
  type LayerValues,
  type SettingValue,
} from './registry';
import { SettingsRow } from './settings-row';

export type PresetPickerProps = {
  /** The learner's preset id. */
  value: string;
  layers: LayerValues;
  /** `cards` on the settings page and in onboarding; `select` for narrow places. */
  variant?: 'cards' | 'select';
  /** No "what changes" list (nothing is set yet). */
  onboarding?: boolean;
  /** Said on the cards when an opening's author asks for something a preset never undoes. */
  materialNote?: string;
  onPick: (id: string) => void;
  /** For the compact rows listing the learner's own changes. */
  onChange: (key: string, value: SettingValue) => void;
  onReset: (key: string) => void;
};

/** What picking another preset would change, old value to new; your own choices stay, so they are left out. */
function changesTo(targetId: string, currentId: string, layers: LayerValues) {
  const target = presetOf(targetId);
  return Object.entries(target.values).flatMap(([key, next]) => {
    const def = SETTINGS[key];
    if (!def || layers.you?.[key] !== undefined) return [];
    const now = resolveSetting(def, layers, currentId, 'you').value;
    return now === next ? [] : [{ key, label: def.label, from: valueLabel(def, now), to: valueLabel(def, next) }];
  });
}

/**
 * The four presets as cards to pick from, the chosen one marked, with "Custom" when the learner has changed things
 * since; hovering another card lists what picking it would change (docs/v2/components/preset-picker.md).
 */
export function PresetPicker({
  value,
  layers,
  variant = 'cards',
  onboarding = false,
  materialNote,
  onPick,
  onChange,
  onReset,
}: PresetPickerProps) {
  const id = useId();
  const [looking, setLooking] = useState<string | null>(null);
  const own = Object.keys(layers.you ?? {}).filter((key) => SETTINGS[key]);
  const current = presetOf(value);
  const customName =
    own.length > 0
      ? `${current.name}, with ${own.length} ${own.length === 1 ? 'change' : 'changes'} of your own`
      : null;

  if (variant === 'select') {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Preset</Label>
        <Select value={value} onValueChange={onPick}>
          <SelectTrigger id={id} className="w-full sm:w-72">
            <SelectValue>{customName ?? current.name}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
                <span className="text-muted-foreground"> · {preset.for}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const preview = !onboarding && looking && looking !== value ? changesTo(looking, value, layers) : null;

  return (
    <div className="grid gap-3">
      <RadioGroup
        value={value}
        onValueChange={onPick}
        aria-label="Preset"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        onMouseLeave={() => setLooking(null)}
      >
        {PRESETS.map((preset) => {
          const chosen = preset.id === value;
          return (
            <Label
              key={preset.id}
              htmlFor={`${id}-${preset.id}`}
              className="block cursor-pointer"
              onMouseEnter={() => setLooking(preset.id)}
              onFocus={() => setLooking(preset.id)}
            >
              <Card
                size="sm"
                className={cn('h-full transition-colors hover:bg-muted/50', chosen && 'ring-2 ring-primary')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RadioGroupItem id={`${id}-${preset.id}`} value={preset.id} />
                    {preset.name}
                  </CardTitle>
                  <CardDescription>{preset.for}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm font-normal">
                  <ul className="grid gap-1 text-muted-foreground">
                    {preset.highlights.map((line) => (
                      <li key={line} className="flex gap-1.5">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {chosen && !onboarding ? (
                    <Badge variant="secondary" className="justify-self-start">
                      {own.length > 0 ? `With ${own.length} of your own` : 'Your preset'}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            </Label>
          );
        })}
      </RadioGroup>

      {materialNote ? <p className="text-sm text-muted-foreground">{materialNote}</p> : null}

      <div aria-live="polite" className="min-h-6 text-sm">
        {preview ? (
          preview.length === 0 ? (
            <p className="text-muted-foreground">
              Picking {presetOf(looking!).name} changes nothing you see: your own choices stay.
            </p>
          ) : (
            <div className="grid gap-1">
              <p className="text-muted-foreground">Picking {presetOf(looking!).name} would change:</p>
              <ul className="grid gap-0.5">
                {preview.map((change) => (
                  <li key={change.key} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{change.label}:</span>
                    <span className="text-muted-foreground">{change.from}</span>
                    <ArrowRight aria-label="to" className="size-3.5 text-muted-foreground" />
                    <span>{change.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : customName && !onboarding ? (
          <Collapsible>
            <p className="flex flex-wrap items-center gap-x-2">
              <span>{customName}.</span>
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0">
                  Show them
                </Button>
              </CollapsibleTrigger>
            </p>
            <CollapsibleContent className="mt-2 grid max-w-xl divide-y rounded-lg border px-3">
              {own.map((key) => (
                <SettingsRow
                  key={key}
                  setting={key}
                  layers={layers}
                  presetId={value}
                  onChange={onChange}
                  onReset={onReset}
                  density="compact"
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
