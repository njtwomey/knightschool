import { ChevronDown, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  canReset,
  groupOf,
  matchesSetting,
  presetOf,
  resolveSetting,
  settingsOf,
  type LayerValues,
  type SettingGroupId,
  type SettingValue,
  type WritableLayer,
} from './registry';
import { SettingsRow } from './settings-row';

const STORE_LINE = {
  device: 'Saved on this device.',
  secret: 'Kept in this browser only and never exported.',
} as const;

export type SettingsGroupProps = {
  group: SettingGroupId;
  layers: LayerValues;
  presetId: string;
  /** Passed to every row. */
  layer?: WritableLayer;
  /** From the page's Basic / Advanced switch. */
  level?: 'basic' | 'all';
  /** Search words: rows that do not match hide, and a group with no match hides. */
  query?: string;
  /** Folds on a phone; open when the address names it. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  onChange: (key: string, value: SettingValue) => void;
  onReset: (key: string) => void;
  /** Resets every row that differs, as one undoable change. */
  onResetGroup: (keys: string[]) => void;
  disabledReason?: string;
};

/**
 * A titled group of settings rows, drawn from the registry: heading, what it is for, where it is kept, basic rows
 * first, then the advanced ones in place (docs/v2/components/settings-group.md). Returns nothing when a search hides
 * every row, so the page can say no setting matches.
 */
export function SettingsGroup({
  group,
  layers,
  presetId,
  layer = 'you',
  level = 'basic',
  query = '',
  collapsible = false,
  defaultOpen = true,
  onChange,
  onReset,
  onResetGroup,
  disabledReason,
}: SettingsGroupProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const info = groupOf(group);
  const all = settingsOf(group).filter((def) => matchesSetting(def, query));
  if (all.length === 0) return null;

  const basic = all.filter((def) => def.level === 'basic');
  const advanced = all.filter((def) => def.level === 'advanced');
  const advancedShown = level === 'all' || showAdvanced;
  const rows = advancedShown ? [...basic, ...advanced] : basic;
  const stores = new Set(settingsOf(group).map((def) => def.store));
  const store = stores.size === 1 ? [...stores][0]! : 'learner';
  const resettable = all.filter((def) => canReset(def, layers, presetId, layer)).map((def) => def.key);
  const fromAbove = all
    .map((def) => resolveSetting(def, layers, presetId, layer).source)
    .filter((source) => source === 'preset' || source === 'material' || source === 'opening');
  const fromLine = fromAbove.includes('material')
    ? 'Some values here come from the opening’s author.'
    : fromAbove.includes('preset')
      ? `Some values here come from the ${presetOf(presetId).name} preset.`
      : null;

  const body = (
    <CardContent className="grid">
      {rows.map((def, i) => (
        <div key={def.key}>
          {i > 0 ? <Separator /> : null}
          <SettingsRow
            setting={def.key}
            layers={layers}
            presetId={presetId}
            layer={layer}
            onChange={onChange}
            onReset={onReset}
            highlight={query}
            disabledReason={disabledReason}
          />
        </div>
      ))}
      {!advancedShown && advanced.length > 0 ? (
        <Button
          variant="link"
          size="sm"
          className="justify-self-start px-0 text-muted-foreground"
          onClick={() => setShowAdvanced(true)}
        >
          {advanced.length} advanced {advanced.length === 1 ? 'setting' : 'settings'}
        </Button>
      ) : null}
    </CardContent>
  );

  const header = (
    <CardHeader>
      <CardTitle>
        <h2 className="text-base font-semibold">{info.title}</h2>
      </CardTitle>
      <CardDescription className="grid gap-0.5">
        <span>{info.description}</span>
        {store !== 'learner' ? <span>{STORE_LINE[store]}</span> : null}
        {fromLine ? <span>{fromLine}</span> : null}
      </CardDescription>
      <CardAction className="flex items-center gap-1">
        {resettable.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => onResetGroup(resettable)} disabled={!!disabledReason}>
            <RotateCcw aria-hidden /> Reset {resettable.length} {info.title.toLowerCase()}{' '}
            {resettable.length === 1 ? 'setting' : 'settings'}
          </Button>
        ) : null}
        {collapsible ? (
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={open ? `Fold ${info.title}` : `Open ${info.title}`}>
              <ChevronDown aria-hidden className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </Button>
          </CollapsibleTrigger>
        ) : null}
      </CardAction>
    </CardHeader>
  );

  if (!collapsible) {
    return (
      <Card id={`group-${group}`} className="scroll-mt-20">
        {header}
        {body}
      </Card>
    );
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <Card id={`group-${group}`} className="scroll-mt-20">
        {header}
        <CollapsibleContent>{body}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
