import { DEFAULT_TIMEZONE } from './dates';
import { internationalEnabled } from './international-enabled';

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

export function deviceTimezone(read = () => Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  try { const zone = read(); return isValidTimezone(zone) ? zone : DEFAULT_TIMEZONE; }
  catch { return DEFAULT_TIMEZONE; }
}

export function profileTimezone(zone: unknown): string {
  return internationalEnabled() && isValidTimezone(zone) ? zone : DEFAULT_TIMEZONE;
}

export function timezoneSyncTarget(auto: boolean, current: string, device: string): string | null {
  return internationalEnabled() && auto && isValidTimezone(device) && current !== device ? device : null;
}

/** Resolve a calendar boundary using the zone's offset, including fractional hours and DST. */
export function timezoneMidnight(date: string, zone: string): number {
  const timeZone = isValidTimezone(zone) ? zone : DEFAULT_TIMEZONE;
  const utc = Date.parse(`${date}T00:00:00Z`);
  let candidate = utc;
  for (let index = 0; index < 3; index++) {
    const parts = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' }).formatToParts(candidate);
    const offset = parts.find(part => part.type === 'timeZoneName')?.value.match(/GMT([+-])(\d+):(\d+)/);
    const minutes = offset ? (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === '+' ? 1 : -1) : 0;
    const next = utc - minutes * 60_000;
    if (candidate === next) break;
    candidate = next;
  }
  return candidate;
}
