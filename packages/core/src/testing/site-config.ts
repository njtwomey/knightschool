import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { SiteConfig } from '../config/site-config';

/** The real content/config.yaml, parsed, for tests: they run against the numbers the site ships with. */
export const siteConfig: SiteConfig = SiteConfig.parse(
  parse(readFileSync(fileURLToPath(new URL('../../../../content/config.yaml', import.meta.url)), 'utf8')),
);
