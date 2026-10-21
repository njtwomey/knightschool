import { TrailCrumbs } from '@/components/breadcrumbs/trail-crumbs';
import { OverviewPage } from '@/features/profile/overview/overview-page';
import { SettingsPage } from '@/features/profile/settings/settings-page';
import { StatsPage } from '@/features/profile/stats/stats-page';
import { PROFILE_TABS, profileHref, type ProfileTab } from '@/router/hrefs';

/**
 * You: what is due and how far through your courses you are, how you are doing, and your settings. One page, three
 * tabs, chosen at the end of the breadcrumbs as on a course or a line.
 */
export function ProfilePage({ tab }: { tab: ProfileTab }) {
  return (
    <>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <TrailCrumbs
          root={{ label: 'Profile', href: profileHref() }}
          tabs={{ tabs: PROFILE_TABS, value: tab, href: profileHref, label: 'Parts of your profile', replace: true }}
        />
      </div>
      {tab === 'overview' && <OverviewPage />}
      {tab === 'stats' && <StatsPage />}
      {tab === 'settings' && <SettingsPage />}
    </>
  );
}
