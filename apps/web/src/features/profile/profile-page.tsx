import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewPage } from '@/features/overview/overview-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { StatsPage } from '@/features/stats/stats-page';
import { navigate } from '@/router/location';

/** You: what is due and how far through your courses you are, how you are doing, and your settings. One page, three tabs. */
export function ProfilePage({ tab }: { tab: 'overview' | 'stats' | 'settings' }) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => navigate(value === 'overview' ? '/profile' : `/profile/${value}`, { replace: true })}
      className="gap-0"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview">
        <OverviewPage />
      </TabsContent>
      <TabsContent value="stats">
        <StatsPage />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsPage />
      </TabsContent>
    </Tabs>
  );
}
