import { useEffect, useState } from 'react';
import { UndoButton } from '@/components/create/undo-button';
import { FilterToggle } from '@/components/finding/filter-toggle';
import { SearchBox } from '@/components/finding/search-box';
import { useLiveSettings } from '@/components/settings/live';
import { PresetPicker } from '@/components/settings/preset-picker';
import {
  matchesSetting,
  presetOf,
  SETTING_GROUPS,
  SETTINGS,
  settingsOf,
  valueLabel,
  type SettingGroupId,
  type SettingValue,
} from '@/components/settings/registry';
import { SettingsGroup } from '@/components/settings/settings-group';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { EmptyState } from '@/components/shared/empty-state';
import { Notice } from '@/components/shared/notice';
import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loadCatalog } from '@/data/content';
import { undoSettingChange, useLastSettingChange, useSettingsSnapshot } from '@/data/settings';
import { useLoad } from '@/hooks/use-load';
import { cn } from '@/lib/utils';
import { to } from '@/router/location';

const LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'all', label: 'Advanced', hint: 'Every setting, the advanced ones too' },
] as const;

/** The hash: `#q=<text>`, `#key=<setting key>`, `&advanced=1` (docs/v2/pages/settings.md, "Address"). */
function readHash(): { q: string; key: string; advanced: boolean } {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return { q: params.get('q') ?? '', key: params.get('key') ?? '', advanced: params.get('advanced') === '1' };
}

function writeHash(q: string, advanced: boolean) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (advanced) params.set('advanced', '1');
  const hash = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${hash ? `#${hash}` : ''}`);
}

const isGroup = (id: string | undefined): id is SettingGroupId => SETTING_GROUPS.some((group) => group.id === id);

/**
 * Every setting, drawn from one registry: a preset at the top, groups down the side, a search box, and each row saying
 * what the value means and where it came from (docs/v2/pages/settings.md). Changes save as they are made, with Undo.
 */
export function SettingsPage({ group: groupParam }: { group?: string }) {
  const [initial] = useState(readHash);
  const keyGroup = initial.key ? SETTINGS[initial.key]?.group : undefined;
  const group: SettingGroupId = isGroup(groupParam) ? groupParam : isGroup(keyGroup) ? keyGroup : 'level';
  const [query, setQuery] = useState(initial.q);
  const [level, setLevel] = useState<'basic' | 'all'>(
    initial.advanced || (initial.key && SETTINGS[initial.key]?.level === 'advanced') ? 'all' : 'basic',
  );
  const live = useLiveSettings();
  const snapshot = useSettingsSnapshot();
  const last = useLastSettingChange();
  const [notice, setNotice] = useState<{ id: number; text: string; undoable: boolean; clear?: number } | null>(null);
  const [lastSeen, setLastSeen] = useState(last?.id ?? 0);

  // A new change shows its saved notice, with Undo (and, after a preset pick, an offer to clear your own changes).
  if (last && last.id !== lastSeen) {
    setLastSeen(last.id);
    const pickedPreset = last.label.startsWith('preset ');
    setNotice({
      id: last.id,
      text: pickedPreset ? `Preset set to ${presetOf(live.presetId).name}.` : `Saved: ${last.label}.`,
      undoable: true,
      clear: pickedPreset && live.custom.length > 0 ? live.custom.length : undefined,
    });
  }

  const undo = () => {
    const label = undoSettingChange();
    if (label) setNotice({ id: -Date.now(), text: `Took back: ${label}.`, undoable: false });
  };

  useEffect(() => writeHash(query, level === 'all'), [query, level]);

  // `#key=` scrolls to one row and marks it for a moment.
  useEffect(() => {
    if (!initial.key) return;
    const id = window.setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-setting="${CSS.escape(initial.key)}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'center' });
      row.classList.add('ring-2', 'ring-ring', 'rounded-md');
      window.setTimeout(() => row.classList.remove('ring-2', 'ring-ring', 'rounded-md'), 2500);
    }, 100);
    return () => window.clearTimeout(id);
  }, [initial.key]);

  const searching = query.trim() !== '';
  const groupsShown = searching ? SETTING_GROUPS.map((g) => g.id) : [group];
  const anyMatch = groupsShown.some((id) =>
    settingsOf(id).some((def) => matchesSetting(def, query) && (level === 'all' || searching || def.level === 'basic')),
  );

  const catalog = useLoad(loadCatalog, []);
  const openingName = (id: string) => catalog.data?.openings.find((opening) => opening.id === id)?.name ?? id;
  const openingValues = Object.entries(snapshot.openings).flatMap(([opening, values]) =>
    Object.entries(values).flatMap(([key, value]) => {
      const def = SETTINGS[key];
      return def ? [{ opening, key, label: def.label, value: valueLabel(def, value as SettingValue) }] : [];
    }),
  );

  return (
    <PageShell
      title="Settings"
      trail={<Breadcrumbs root={{ label: 'You', href: to('/settings') }} crumbs={[{ label: 'Settings' }]} />}
      notices={
        notice ? (
          <Notice
            kind="saved"
            text={notice.text}
            action={
              <>
                {notice.clear ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      live.clearCustom();
                    }}
                  >
                    Clear my {notice.clear} {notice.clear === 1 ? 'change' : 'changes'} too
                  </Button>
                ) : null}
                {notice.undoable && last ? <UndoButton size="sm" label={last.label} onUndo={undo} /> : null}
              </>
            }
            onDismiss={() => setNotice(null)}
            onExpire={() => setNotice(null)}
          />
        ) : null
      }
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <UndoButton label={last?.label ?? null} onUndo={undo} shortcut />
        </div>

        <section aria-label="Preset" className="grid gap-2">
          <PresetPicker />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <SearchBox
            form="filter"
            items={[]}
            query={query}
            onQuery={setQuery}
            placeholder="Search settings: delay, puzzle, rare"
            className="w-full max-w-sm"
          />
          <FilterToggle label="Show" showLabel={false} size="sm" value={level} options={LEVELS} onChange={setLevel} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
          <nav aria-label="Setting groups" className="flex flex-wrap gap-1 lg:flex-col lg:flex-nowrap">
            {SETTING_GROUPS.map((g) => (
              <Button
                key={g.id}
                asChild
                variant={!searching && g.id === group ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
              >
                <a
                  href={to(`/settings/${g.id}`)}
                  aria-current={!searching && g.id === group ? 'page' : undefined}
                  onClick={() => setQuery('')}
                >
                  {g.title}
                </a>
              </Button>
            ))}
          </nav>

          <div className="grid content-start gap-4">
            {groupsShown.map((id) => (
              <SettingsGroup key={id} group={id} level={searching ? 'all' : level} query={query} />
            ))}
            {!anyMatch ? (
              <EmptyState
                kind="no-match"
                text={`No setting matches “${query}”. Try another word, or show Advanced.`}
                action={{ label: 'Clear the search', onClick: () => setQuery('') }}
              />
            ) : null}

            {openingValues.length > 0 && !searching ? (
              <Card size="sm">
                <CardHeader>
                  <CardTitle>
                    <h2 className="text-base font-semibold">Set for one opening</h2>
                  </CardTitle>
                  <CardDescription>These are changed on the opening’s page.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-1 text-sm">
                    {openingValues.map((row) => (
                      <li key={`${row.opening}:${row.key}`} className={cn('flex flex-wrap gap-x-2')}>
                        <a className="underline-offset-4 hover:underline" href={to(`/openings/${row.opening}`)}>
                          {openingName(row.opening)}
                        </a>
                        <span className="text-muted-foreground">
                          {row.label}: {row.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
