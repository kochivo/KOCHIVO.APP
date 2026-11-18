import { useLocale, useT } from '@/core/i18n/client';
import type { InboxItem, TriageInputs } from '@/features/inbox';
import { previousCheckins } from '@/features/inbox';
import { DEFAULT_TIMEZONE, daysBetween, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { StatStrip } from '@/ui/stat-strip';
import type { StatStripItem } from '@/ui/stat-strip';
import { taskMessages } from './messages';
import { phoneTaskMessages } from './phone/messages';

export function PhoneTaskFacts({ item, triage, now }: {
  item: Extract<InboxItem, { kind: 'checkin' }>; triage: TriageInputs; now: Date;
}) {
  const t = useT(phoneTaskMessages), task = useT(taskMessages), locale = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  const previous = previousCheckins(item, triage.history)[0];
  const today = localDate(now, item.timezone ?? DEFAULT_TIMEZONE);
  const sleep = triage.dailyChecks.flatMap(row => {
    const age = daysBetween(row.log_date, today);
    return row.player_id === item.player_id && !row.deleted_at && row.sleep_hours !== null && age >= 0 && age < 7
      ? [row.sleep_hours] : [];
  });
  const facts: StatStripItem[] = [];
  if (item.body_weight_kg !== null) {
    const change = previous?.body_weight_kg == null ? undefined : Number((item.body_weight_kg - previous.body_weight_kg).toFixed(1));
    facts.push({ label: task('weight'), value: task('kg', { value: number(item.body_weight_kg) }),
      note: change === undefined ? undefined : <bdi dir="ltr">{change > 0 ? '+' : ''}{number(change)}</bdi> });
  }
  if (item.waist_cm !== null) facts.push({ label: t('waist'), value: number(item.waist_cm) });
  if (sleep.length >= 3) {
    const average = sleep.reduce((sum, hours) => sum + hours, 0) / sleep.length;
    facts.push({ label: t('sleep'), value: t('hours', { value: number(Number(average.toFixed(1))) }) });
  }
  return <StatStrip items={facts} className={cn('recessed [&>div]:px-stack [&_p>span:first-child]:text-title',
    facts.length === 3 && 'max-sm:grid-cols-3!')} />;
}
