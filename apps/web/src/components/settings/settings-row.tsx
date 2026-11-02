import { Check, ExternalLink, Eye, EyeOff, KeyRound, MonitorSmartphone, RotateCcw } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { Hint } from '@/components/shared/hint';
import { IconAction } from '@/components/shared/icon-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { to } from '@/router/location';
import {
  canReset,
  resetText,
  resolveBelow,
  resolveSetting,
  SETTINGS,
  sourceText,
  type LayerValues,
  type SettingDef,
  type SettingValue,
  type WritableLayer,
} from './registry';
import { useLiveSettings } from './live';

/** Board colours for the swatch control: each square colour is a token in index.css. */
const SWATCH_COLOURS: Record<string, { light: string; dark: string }> = {
  green: { light: 'var(--board-green-light)', dark: 'var(--board-green-dark)' },
  tan: { light: 'var(--board-tan-light)', dark: 'var(--board-tan-dark)' },
  blue: { light: 'var(--board-blue-light)', dark: 'var(--board-blue-dark)' },
  slate: { light: 'var(--board-slate-light)', dark: 'var(--board-slate-dark)' },
  purple: { light: 'var(--board-purple-light)', dark: 'var(--board-purple-dark)' },
};

/** An option's value as the controls carry it (text), and back to the setting's own value. */
const optionKey = (value: unknown) => JSON.stringify(value);
const optionValue = (options: readonly { value: SettingValue }[], key: string): SettingValue | undefined =>
  options.find((option) => optionKey(option.value) === key)?.value;

export type SettingsRowProps = {
  /** The registry key; everything else comes from the entry. */
  setting: string;
  /** The values set in each layer; by default the learner's stored settings (`use-setting`). */
  layers?: LayerValues;
  /** The learner's preset, for the preset layer; by default the stored one. */
  presetId?: string;
  /** Which layer this row writes: the settings page (`you`), an opening's page, or the practice card. */
  layer?: WritableLayer;
  /** The opening whose layer this row shows and writes (with `layer="opening"`). */
  opening?: string;
  /** The opening's name, for the source line ("Set for the Italian Game"). */
  openingName?: string;
  /** Writes at once (a slider when it is let go); the session layer edits the practice card's copy. By default it
   * saves to the stored settings, undoable. */
  onChange?: (key: string, value: SettingValue) => void;
  /** Takes the written layer's value away, so the layer below shows through. */
  onReset?: (key: string) => void;
  /** Disables the control with this reason on hover (engine depth with the engine off). */
  unavailable?: string;
  /** `full` on the settings page; `compact` in the board's gear, the practice card and inline. */
  density?: 'full' | 'compact';
  /** Search words to mark in the label and hint. */
  highlight?: string;
  /** No label of its own (setting-inline, where the prompt is the label). */
  hideLabel?: boolean;
  /** Paused while another tab has the database: the control is disabled with the reason on hover. */
  disabledReason?: string;
};

/** Marks the searched words in a text. */
function Marked({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-primary/15 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const STORE_HINT = {
  device: { icon: <MonitorSmartphone aria-hidden />, text: 'This device only' },
  secret: { icon: <KeyRound aria-hidden />, text: 'This browser only, never exported' },
} as const;

function StoreIcon({ def }: { def: SettingDef }) {
  if (def.store === 'learner') return null;
  const { icon, text } = STORE_HINT[def.store];
  return (
    <Hint text={text}>
      <span
        tabIndex={0}
        aria-label={text}
        className="inline-flex text-muted-foreground [&_svg]:size-3.5"
        data-store={def.store}
      >
        {icon}
      </span>
    </Hint>
  );
}

/** The slider shows its value as it moves and writes only when let go. */
function SliderControl({
  def,
  value,
  id,
  onCommit,
  disabled,
  onDrag,
}: {
  def: SettingDef & { control: { kind: 'slider'; unit?: string } };
  value: number;
  id: string;
  onCommit: (value: number) => void;
  disabled?: boolean;
  onDrag: (value: number | null) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const shown = dragging ?? value;
  const { min, max, step, marks = [] } = def.control;
  return (
    <div className="grid w-full gap-1 sm:w-64">
      <div className="flex items-center gap-3">
        <Slider
          id={id}
          min={min}
          max={max}
          step={step}
          value={[shown]}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          onValueChange={([next]) => {
            setDragging(next ?? null);
            onDrag(next ?? null);
          }}
          onValueCommit={([next]) => {
            setDragging(null);
            onDrag(null);
            if (next !== undefined && next !== value) onCommit(next);
          }}
        />
        <span className="w-12 text-right font-mono text-sm whitespace-nowrap tabular-nums">
          {def.control.unit === '%' ? `${Math.round(shown * 100)}%` : shown}
        </span>
      </div>
      {marks.length > 0 ? (
        <div className="relative mr-11 h-3 text-[0.65rem] text-muted-foreground" aria-hidden>
          {marks.map((mark) => (
            <span
              key={mark}
              className="absolute -translate-x-1/2"
              style={{ left: `${((mark - min) / (max - min)) * 100}%` }}
            >
              {mark}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NumberControl({
  def,
  value,
  id,
  onCommit,
  disabled,
}: {
  def: SettingDef & { control: { kind: 'number' } };
  value: number;
  id: string;
  onCommit: (value: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const { min, max } = def.control;
  const parsed = Number(text);
  const bad = text.trim() === '' || !Number.isInteger(parsed) || parsed < min || parsed > max;
  return (
    <div className="grid justify-items-end gap-1">
      <Input
        id={id}
        aria-labelledby={`${id}-label`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        disabled={disabled}
        aria-invalid={bad || undefined}
        aria-describedby={bad ? `${id}-range` : undefined}
        className="w-20 text-right"
        onChange={(event) => {
          setText(event.target.value);
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= min && next <= max && next !== value) onCommit(next);
        }}
        onBlur={() => {
          if (bad) setText(String(value));
        }}
      />
      {bad ? (
        <p id={`${id}-range`} className="text-xs text-destructive">
          Between {min} and {max}. Still {value}.
        </p>
      ) : null}
    </div>
  );
}

/** Two thumbs for a range value; writes when let go. */
function RangeControl({
  def,
  value,
  id,
  onCommit,
  disabled,
}: {
  def: SettingDef & { control: { kind: 'range' } };
  value: [number, number];
  id: string;
  onCommit: (value: [number, number]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState<[number, number] | null>(null);
  const shown = dragging ?? value;
  const { min, max, step } = def.control;
  return (
    <div className="flex w-full items-center gap-3 sm:w-64">
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={shown}
        disabled={disabled}
        aria-labelledby={`${id}-label`}
        onValueChange={(next) => setDragging([next[0] ?? min, next[1] ?? max])}
        onValueCommit={(next) => {
          setDragging(null);
          const low = next[0] ?? min;
          const high = next[1] ?? max;
          if (low !== value[0] || high !== value[1]) onCommit([low, high]);
        }}
      />
      <span className="font-mono text-sm whitespace-nowrap tabular-nums">
        {shown[0]}–{shown[1]}
      </span>
    </div>
  );
}

function TextControl({
  def,
  value,
  id,
  onCommit,
  disabled,
}: {
  def: SettingDef & { control: { kind: 'text' | 'secret' } };
  value: string;
  id: string;
  onCommit: (value: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(false);
  const secret = def.control.kind === 'secret';
  return (
    <div className="flex w-full items-center gap-1 sm:w-64">
      <Input
        id={id}
        aria-labelledby={`${id}-label`}
        type={secret && !shown ? 'password' : 'text'}
        autoComplete="off"
        spellCheck={false}
        placeholder={def.control.placeholder}
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          if (text.trim() !== value) onCommit(text.trim());
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {secret ? (
        <IconAction label={shown ? 'Hide the token' : 'Show the token'} onClick={() => setShown(!shown)}>
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </IconAction>
      ) : null}
    </div>
  );
}

function Control({
  def,
  value,
  id,
  onChange,
  onDrag,
  disabled,
}: {
  def: SettingDef;
  value: SettingValue;
  id: string;
  onChange: (value: SettingValue) => void;
  onDrag: (value: number | null) => void;
  disabled?: boolean;
}): ReactNode {
  const { control } = def;
  switch (control.kind) {
    case 'switch':
      return (
        <Switch
          id={id}
          aria-labelledby={`${id}-label`}
          checked={value === true}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked)}
        />
      );
    case 'slider':
      return (
        <SliderControl
          def={def as SettingDef & { control: typeof control }}
          value={Number(value)}
          id={id}
          onCommit={onChange}
          onDrag={onDrag}
          disabled={disabled}
        />
      );
    case 'select':
      return (
        <Select
          value={optionKey(value)}
          onValueChange={(key) => {
            const next = optionValue(control.options, key);
            if (next !== undefined) onChange(next);
          }}
          disabled={disabled}
        >
          <SelectTrigger id={id} aria-labelledby={`${id}-label`} className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {control.options.map((option) => (
              <SelectItem key={optionKey(option.value)} value={optionKey(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'toggle':
      return (
        <FilterToggle
          id={id}
          label={def.label}
          showLabel={false}
          size="sm"
          value={optionKey(value)}
          disabled={disabled}
          options={control.options.map((option) => ({ ...option, value: optionKey(option.value) }))}
          onChange={(key) => {
            const next = optionValue(control.options, key);
            if (next !== undefined) onChange(next);
          }}
        />
      );
    case 'swatch':
      return (
        <ToggleGroup
          id={id}
          type="single"
          value={String(value)}
          onValueChange={(next) => next && onChange(next)}
          spacing={1}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
        >
          {control.options.map((option) => {
            const colours = SWATCH_COLOURS[String(option.value)];
            return (
              <Tooltip key={String(option.value)}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value={String(option.value)}
                    aria-label={option.label}
                    className="size-9 p-0.5 aria-checked:ring-2 aria-checked:ring-ring data-[state=on]:bg-transparent"
                  >
                    <span className="relative grid size-full grid-cols-2 overflow-hidden rounded-md" aria-hidden>
                      <span style={{ background: colours?.light }} />
                      <span style={{ background: colours?.dark }} />
                      <span style={{ background: colours?.dark }} />
                      <span style={{ background: colours?.light }} />
                      {value === option.value ? (
                        <Check className="absolute inset-0 m-auto size-4 text-foreground drop-shadow" />
                      ) : null}
                    </span>
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{option.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
      );
    case 'multi': {
      const chosen = Array.isArray(value) ? value.map(String) : [];
      return (
        <ToggleGroup
          id={id}
          type="multiple"
          variant="outline"
          size="sm"
          spacing={0}
          value={chosen}
          disabled={disabled}
          aria-labelledby={`${id}-label`}
          onValueChange={(next) =>
            onChange(control.options.map((option) => option.value).filter((v) => next.includes(v)))
          }
        >
          {control.options.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className="aria-pressed:bg-primary! aria-pressed:text-primary-foreground!"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }
    case 'range':
      return (
        <RangeControl
          def={def as SettingDef & { control: typeof control }}
          value={value as [number, number]}
          id={id}
          onCommit={onChange}
          disabled={disabled}
        />
      );
    case 'elsewhere':
      return (
        <Button asChild variant="outline" size="sm">
          <a href={to(control.href)} id={id} aria-labelledby={`${id}-label`}>
            {control.text}
            <ExternalLink aria-hidden />
          </a>
        </Button>
      );
    case 'number':
      return (
        <NumberControl
          key={String(value)}
          def={def as SettingDef & { control: typeof control }}
          value={Number(value)}
          id={id}
          onCommit={onChange}
          disabled={disabled}
        />
      );
    case 'text':
    case 'secret':
      return (
        <TextControl
          key={String(value)}
          def={def as SettingDef & { control: typeof control }}
          value={String(value)}
          id={id}
          onCommit={onChange}
          disabled={disabled}
        />
      );
  }
}

/**
 * One setting drawn from the registry: its label, its control, a line of hint, what the value means in practice, where
 * the value comes from, and a reset when it differs from the layer below (docs/v2/components/settings-row.md).
 */
export function SettingsRow({
  setting,
  layers: givenLayers,
  presetId: givenPreset,
  layer = 'you',
  opening,
  openingName,
  onChange: givenChange,
  onReset: givenReset,
  density = 'full',
  highlight = '',
  hideLabel = false,
  disabledReason: givenDisabled,
  unavailable,
}: SettingsRowProps) {
  const id = useId();
  const def = SETTINGS[setting];
  const live = useLiveSettings({ layer, opening });
  const [dragging, setDragging] = useState<number | null>(null);
  if (!def) return null;
  const layers = givenLayers ?? live.layers;
  const presetId = givenPreset ?? live.presetId;
  const onChange = givenChange ?? live.onChange;
  const onReset = givenReset ?? live.onReset;
  const disabledReason = givenDisabled ?? unavailable;
  // Learner rows wait for the database before they can be changed (device rows work at once).
  const waiting = !givenLayers && !live.ready && def.store === 'learner';
  const resolved = resolveSetting(def, layers, presetId, layer);
  const shownValue = dragging ?? resolved.value;
  const words = highlight.toLowerCase().split(/\s+/).filter(Boolean);
  const compact = density === 'compact';
  const reset = canReset(def, layers, presetId, layer) ? (
    <IconAction
      label={resetText(resolveBelow(def, layers, presetId, layer), def, presetId)}
      onClick={() => onReset(def.key)}
      disabled={!!disabledReason}
    >
      <RotateCcw aria-hidden />
    </IconAction>
  ) : null;
  const control = waiting ? (
    <Skeleton className="h-8 w-32" aria-label="Loading your settings" />
  ) : (
    <Control
      def={def}
      value={resolved.value}
      id={id}
      onChange={(value) => onChange(def.key, value)}
      onDrag={setDragging}
      disabled={!!disabledReason}
    />
  );

  const label = hideLabel ? null : (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {compact ? (
        <Hint text={def.hint}>
          <Label
            id={`${id}-label`}
            htmlFor={id}
            className="cursor-help underline decoration-muted-foreground/50 decoration-dotted underline-offset-4"
          >
            {def.label}
          </Label>
        </Hint>
      ) : (
        <Label id={`${id}-label`} htmlFor={id}>
          <Marked text={def.label} words={words} />
        </Label>
      )}
      {def.level === 'advanced' && !compact ? (
        <Badge variant="outline" className="text-[0.65rem] font-normal text-muted-foreground">
          Advanced
        </Badge>
      ) : null}
      {compact ? null : <StoreIcon def={def} />}
    </div>
  );

  const source = (
    <p className="text-xs text-muted-foreground" data-source={resolved.source}>
      {sourceText(resolved.source, presetId, openingName)}
    </p>
  );

  if (compact) {
    return (
      <div className="grid gap-1 py-1.5" data-setting={def.key}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          {label}
          {hideLabel ? (
            <span id={`${id}-label`} className="sr-only">
              {def.label}
            </span>
          ) : null}
          <div className="flex items-center gap-1">
            {disabledReason ? (
              <Hint text={disabledReason}>
                <span tabIndex={0}>{control}</span>
              </Hint>
            ) : (
              control
            )}
            {reset}
          </div>
        </div>
        {resolved.source !== 'default' && resolved.source !== layer ? source : null}
      </div>
    );
  }

  return (
    <div className="grid gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" data-setting={def.key}>
      <div className="grid gap-1">
        {label}
        <p className="text-sm text-muted-foreground">
          <Marked text={def.hint} words={words} />
        </p>
        {def.explain ? <p className="text-sm">{def.explain(shownValue as never)}</p> : null}
        {source}
      </div>
      <div className={cn('flex items-start gap-1 sm:justify-end')}>
        {disabledReason ? (
          <Hint text={disabledReason}>
            <span tabIndex={0}>{control}</span>
          </Hint>
        ) : (
          control
        )}
        <div className="w-7 shrink-0 pointer-coarse:w-10">{reset}</div>
      </div>
    </div>
  );
}
