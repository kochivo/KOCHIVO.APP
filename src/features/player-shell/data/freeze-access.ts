import { daysBetween, localDate } from '@/lib/dates';
import { isValidTimezone } from '@/lib/timezone';

export function freezeAccess(row: { frozen_at: string | null; frozen_until: string | null; access_until: string },
  now: Date, zone?: string | null) {
  const timezone = isValidTimezone(zone) ? zone : undefined;
  const today = localDate(now, timezone);
  if (!row.frozen_at || !row.frozen_until || row.frozen_until > today)
    return { frozenAt: row.frozen_at, accessUntil: row.access_until };
  // Match the extension the release job will persist.
  const days = Math.max(0, daysBetween(localDate(new Date(row.frozen_at), timezone), today));
  const end = new Date(`${row.access_until}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  return { frozenAt: null, accessUntil: localDate(end, 'UTC') };
}
