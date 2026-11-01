import { SiteConfig } from '@knightschool/core';
import raw from '@content/config.yaml';

/** How the site behaves (content/config.yaml), checked once when the app starts. */
export const siteConfig: SiteConfig = SiteConfig.parse(raw);
