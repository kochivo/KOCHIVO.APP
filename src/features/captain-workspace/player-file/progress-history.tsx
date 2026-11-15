import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { photoPose, progressMessages } from '@/features/progress';
import { formatNumber } from '@/lib/format';
import { progressDetails } from './model';
import { FileReminder } from './reminder';
import { DeferredSectionEntry } from './deferred-section-entry';
import { ProgressMediaEntry } from './progress-media-entry';
import type { Profile } from './types';

export function ProgressHistory({ playerId, profile, locale, today }: { playerId: string; profile: Profile; locale: Locale; today: string }) {
  const t = createT(messages, locale), p = createT(progressMessages, locale);
  const { points, summary } = progressDetails(profile.checkIns, profile.intake?.targetWeightKg ?? null);
  const bodyFat = profile.checkIns.flatMap(row => row.bodyFatPct == null ? [] : [{ date: row.weekStart, value: row.bodyFatPct }]);
  const weeks = profile.checkIns.map(row => ({ date: row.weekStart, weight: row.weightKg,
    photos: row.photos.map((url, index) => ({ url, pose: photoPose(row.photoPoses?.[index]) })) }));
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatNumber(value, locale)} ${t('kg')}`;
  return <div className="space-y-card-gap">
    <DeferredSectionEntry kind="scans" playerId={playerId} today={today} />
    {summary ? <section className="glass space-y-card-gap rounded-card border border-line-soft p-card">
      <h2 className="font-display text-title font-semibold">{t('weightTrend')}</h2>
      <dl className="grid grid-cols-3 gap-stack">
        {([
          ['latest', `${formatNumber(summary.latest, locale)} ${t('kg')}`],
          ['change', signed(summary.change)], ['toTarget', summary.toTarget === null ? t('dash') : signed(summary.toTarget)],
        ] as const).map(([label, value]) => <div key={label} className="glass-strong min-w-0 rounded-card p-stack">
          <dt className="text-xs text-muted">{t(label)}</dt><dd className="mt-inline break-words font-display text-xl font-extrabold tabular-nums"><bdi dir="ltr">{value}</bdi></dd>
        </div>)}
      </dl>
      <ProgressMediaEntry points={points} bodyFat={bodyFat} title={t('weightTrend')} unit={t('kg')} />
    </section> : <>
      <FileReminder playerId={playerId} locale={locale} title={t('noWeightsTitle')} body={t('noWeightsBody')} />
      {bodyFat.length > 0 && <section className="glass space-y-card-gap rounded-card border border-line-soft p-card">
        <h2 className="font-display text-title font-semibold">{t('weightTrend')}</h2>
        <ProgressMediaEntry points={points} bodyFat={bodyFat} title={t('weightTrend')} unit={t('kg')} />
      </section>}
    </>}
    {profile.checkIns.some(row => row.photoError) && <p role="alert" className="text-danger">{p('couldntLoadPhotos')}</p>}
    {weeks.some(week => week.photos.length) ? <ProgressMediaEntry weeks={weeks} title={t('weightTrend')} unit={t('kg')} /> :
      <FileReminder playerId={playerId} locale={locale} title={t('noPhotos')} body={t('noCheckinsBody')} />}
  </div>;
}
