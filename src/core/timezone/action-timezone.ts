import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { deviceTimezone, profileTimezone } from '@/lib/timezone';

let pinned: string | undefined;
export function setActionTimezone(zone: string | undefined): void { pinned = zone; }

/** Browser actions resolve their day before queuing; sync never changes that stored day. */
export function actionTimezone(): string {
  if (!internationalEnabled()) return DEFAULT_TIMEZONE;
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE;
  return pinned === undefined ? deviceTimezone() : profileTimezone(pinned);
}
