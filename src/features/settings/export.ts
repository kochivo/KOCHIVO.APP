import { actionTimezone } from '@/core/timezone/action-timezone';
import { localDate } from '@/lib/dates';

export function buildExport<P, R extends Record<string, unknown[]>>(
  { profile, rows }: { profile: P; rows: R }, now: Date,
) {
  return { ...rows, exported_at: now.toISOString(), profile };
}

export function exportFileName(now: Date): string {
  return `kochivo-data-${localDate(now, actionTimezone())}.json`;
}
