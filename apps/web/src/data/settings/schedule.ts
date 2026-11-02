import type { SiteConfig } from '@knightschool/core';
import { siteConfig } from '../site-config';
import { getSetting } from './use-setting';

/** The site's schedule with the learner's desired retention (`review.retention`, within config's range). */
export function scheduleConfig(): SiteConfig['schedule'] {
  return { ...siteConfig.schedule, retention: getSetting('review.retention') };
}

/** A base delay (config `timing.*`) scaled by the learner's speed of play (`feedback.speed`). */
export function feedbackDelay(ms: number): number {
  return Math.round(ms * siteConfig.settings.feedbackSpeeds[getSetting('feedback.speed')]);
}
