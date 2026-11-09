'use client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Image from 'next/image';
import { Camera } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { LoadingState } from '@/ui/loading-state';
import { useInboxMedia } from '../hooks/use-inbox-media';
import type { InboxItem } from '../types';
import { dailyAverages, previousCheckins } from '../triage';
import type { CheckinHistory, DailyCheck } from '../triage';
import { intlLocale } from '@/core/i18n/locale';

export function CheckinDetail({ item, history = [], dailyChecks = [], now }: {
  item: Extract<InboxItem, { kind: 'checkin' }>; history?: CheckinHistory[]; dailyChecks?: DailyCheck[]; now?: Date;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const media = useInboxMedia(item);
  const previous = previousCheckins(item, history)[0];
  const averages = now ? dailyAverages(item.player_id, dailyChecks, now) : null;
  function delta(key: 'body_weight_kg' | 'waist_cm') {
    if (item[key] === null || previous?.[key] == null) return null;
    const value = new Intl.NumberFormat(intlLocale(locale), { numberingSystem: 'latn', signDisplay: 'always', maximumFractionDigits: 1 })
      .format(Math.round((item[key] - previous[key]) * 10) / 10);
    return <p className="text-sm text-muted">{t(key === 'body_weight_kg' ? 'weightDelta' : 'waistDelta', {
      value, date: formatDateAr(previous.week_start, { day: 'numeric', month: 'short' }, locale),
    })}</p>;
  }
  return <div className="space-y-4">
    <h3 className="text-xl font-bold">{t('week', { date: formatDateAr(item.week_start, { day: 'numeric', month: 'long' }, locale) })}</h3>
    <dl className="glass-strong grid grid-cols-2 gap-4 rounded-card p-4">
      <div><dt className="text-muted">{t('weight')}</dt><dd className="text-2xl font-bold">{item.body_weight_kg === null ? t('dash') : formatNumber(item.body_weight_kg, locale)} {t('kg')}</dd><dd>{delta('body_weight_kg')}</dd></div>
      <div><dt className="text-muted">{t('waist')}</dt><dd className="text-2xl font-bold">{item.waist_cm === null ? t('dash') : formatNumber(item.waist_cm, locale)} {t('cm')}</dd><dd>{delta('waist_cm')}</dd></div>
      {averages?.sleep != null && <div><dt className="text-muted">{t('sleepAverage')}</dt><dd>{t('hoursUnit', { value: formatNumber(Math.round(averages.sleep * 10) / 10, locale) })}</dd></div>}
      {averages?.soreness != null && <div><dt className="text-muted">{t('sorenessAverage')}</dt><dd>{t('sorenessUnit', { value: formatNumber(Math.round(averages.soreness * 10) / 10, locale) })}</dd></div>}
    </dl>
    <p className="whitespace-pre-wrap text-muted">{item.notes || t('noNotes')}</p>
    {media.loading ? <LoadingState variant="cards" aria-label={t('loadingPhotos')} /> : media.error ?
      <div role="alert"><p>{t('photosFailed')}</p><button className="min-h-12 px-4" onClick={media.retry}>{t('retry')}</button></div> :
      media.urls.length ? <div className="grid gap-3 sm:grid-cols-3">{media.urls.slice(0, 3).map((url, index) =>
        <Image key={url} src={url} alt={t('photo', { n: formatNumber(index + 1, locale) })} width={480} height={640} unoptimized onError={media.failed} className="h-auto w-full rounded-control object-contain" />)}</div> :
          <EmptyState icon={Camera} title={t('noPhotos')} body={t('photoHint')} action={{ label: t('openPlayer'), href: `/captain/players/${item.player_id}?tab=checkins` }} />}
  </div>;
}
