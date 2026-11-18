import { daysBetween } from '@/lib/dates';
import type { Locale } from '@/core/i18n/locale';
import type { FileSummary, Profile } from './types';
import { TrainingAdherence } from './training-adherence';
import { Measurements } from './measurements';
import { overviewMetrics } from './overview-metrics';
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
  const metrics = overviewMetrics(profile, activity);
  const t = createT(messages, locale);
  const weights = [...new Map([
    ...profile.checkIns.flatMap(row => row.weightKg == null ? [] : [{ date: row.weekStart, value: row.weightKg }]),
    ...activity.scans.flatMap(row => row.weight_kg == null ? [] : [{ date: row.scan_date, value: row.weight_kg }]),
  ].filter(point => { const age = daysBetween(point.date, today); return age >= 0 && age < 12 * 7; })
    .map(point => [point.date, point])).values()].sort((a, b) => a.date.localeCompare(b.date));
  const calmCharts = process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1';
  return <div className="space-y-stack">
    <LightDayEntry playerId={playerId} date={today} />
    <OverviewActivity phone={calmCharts} programId={summary.programId} profile={profile} activity={activity} playerId={playerId} locale={locale} overview={<>
        {calmCharts && weights.length > 0 && <ProgressMediaEntry points={weights} title={t('weight')} unit={t('kg')}
          compactOnPhone today={today} target={summary.file.facts.targetWeight?.value} />}
        {!calmCharts && weights.length > 1 && <section className="glass space-y-stack rounded-card p-card">
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
