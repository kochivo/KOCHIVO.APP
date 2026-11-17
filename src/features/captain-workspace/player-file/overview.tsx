import { daysBetween } from '@/lib/dates';
import type { Locale } from '@/core/i18n/locale';
import type { FileSummary, Profile } from './types';
import { TrainingAdherence } from './training-adherence';
import { Measurements } from './measurements';
import type { FileMetric } from './measurements';
import type { FileActivity } from './load-activity';
import { FoodToday } from './food-today';
import { OverviewActivity } from './overview-activity';
import { FileDisclosureEntry } from './file-disclosure-entry';
import { OverviewFacts } from './overview-facts';
import { ProfileSection } from './profile-section';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { ProgressMediaEntry } from './progress-media-entry';
import { LightDayEntry } from '../components/light-day-entry';

export function PlayerOverview({ playerId, profile, summary, locale, activity, today }: {
  playerId: string; profile: Profile; summary: FileSummary; locale: Locale; today: string; activity: FileActivity;
}) {
  const metrics: FileMetric[] = [];
  const t = createT(messages, locale);
  for (const key of ['weight', 'bodyFat'] as const) {
    const points = [
      ...profile.checkIns.map(row => ({ date: row.weekStart, value: key === 'weight' ? row.weightKg : row.bodyFatPct })),
      ...activity.scans.map(row => ({ date: row.scan_date, value: key === 'weight' ? row.weight_kg : row.fat_pct })),
    ];
    const values = points.sort((a, b) => a.date.localeCompare(b.date)).flatMap(row => row.value == null ? [] : [row.value]);
    if (key === 'weight' && profile.intake) values.unshift(profile.intake.weightKg);
    const latest = values.at(-1);
    const first = values[0];
    if (latest !== undefined) metrics.push({ key, value: latest, change: values.length > 1 && first !== undefined ? Math.round((latest - first) * 10) / 10 : null });
  }
  const weights = [...new Map([
    ...profile.checkIns.flatMap(row => row.weightKg == null ? [] : [{ date: row.weekStart, value: row.weightKg }]),
    ...activity.scans.flatMap(row => row.weight_kg == null ? [] : [{ date: row.scan_date, value: row.weight_kg }]),
  ].filter(point => { const age = daysBetween(point.date, today); return age >= 0 && age < 12 * 7; })
    .map(point => [point.date, point])).values()].sort((a, b) => a.date.localeCompare(b.date));
  return <div className="space-y-stack">
    <LightDayEntry playerId={playerId} date={today} />
    <OverviewActivity profile={profile} activity={activity} playerId={playerId} locale={locale} overview={<>
        {weights.length > 1 && <section className="glass space-y-stack rounded-card p-card">
          <h2 className="text-md font-bold">{t('recentWeight')}</h2>
          <ProgressMediaEntry points={weights} title={t('recentWeight')} unit={t('kg')} />
        </section>}
        <Measurements metrics={metrics} locale={locale} />
      </>} training={<>
        <TrainingAdherence completed={summary.completedDays} planned={summary.file.facts.trainingDays?.value.length ?? profile.program?.days ?? 0} rpe={activity.last?.session_rpe ?? null} locale={locale} />
        <FoodToday nutrition={activity.nutrition} locale={locale} />
      </>} />
    <FileDisclosureEntry label={t('facts')}><OverviewFacts profile={profile} summary={summary} locale={locale} /></FileDisclosureEntry>
    <FileDisclosureEntry label={t('history')}><ProfileSection playerId={playerId} profile={profile} today={today} tab="progress" /></FileDisclosureEntry>
  </div>;
}
