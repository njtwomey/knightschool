import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewPage } from '@/features/profile/overview/overview-page';
import { SettingsPage } from '@/features/profile/settings/settings-page';
import { StatsPage } from '@/features/profile/stats/stats-page';
import { profileHref, type ProfileTab } from '@/router/hrefs';
import { navigate } from '@/router/location';
import { PROFILE_TABS } from './tabs';

/** You: what is due and how far through your courses you are, how you are doing, and your settings. One page, three tabs. */
export function ProfilePage({ tab }: { tab: ProfileTab }) {
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => navigate(profileHref(value as ProfileTab), { replace: true })}
      className="gap-0"
    >
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <TabsList>
          {PROFILE_TABS.map((item) => (
            <TabsTrigger key={item.tab} value={item.tab}>
              {item.name}
            </TabsTrigger>
          ))}
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
