import type { ProfileTab } from '@/router/hrefs';

/** Profile's tabs: what is due and how far through your courses you are, how you are doing, and your settings. */
export const PROFILE_TABS: { tab: ProfileTab; name: string }[] = [
  { tab: 'overview', name: 'Overview' },
  { tab: 'stats', name: 'Stats' },
  { tab: 'settings', name: 'Settings' },
];
