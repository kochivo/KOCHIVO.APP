'use client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Image from 'next/image';
import { useInboxMedia } from '../hooks/use-inbox-media';
import type { InboxItem } from '../types';

export function CheckinDetail({ item }: { item: Extract<InboxItem, { kind: 'checkin' }> }) {
  const t = useT(messages);
  const locale = useLocale();
  const media = useInboxMedia(item);
  return <div className="space-y-4">
    <h3 className="text-xl font-bold">{t('week', { date: formatDateAr(item.week_start, { day: 'numeric', month: 'long' }, locale) })}</h3>
    <dl className="glass-strong grid grid-cols-2 gap-4 rounded-card p-4">
      <div><dt className="text-muted">{t('weight')}</dt><dd className="text-2xl font-bold">{item.body_weight_kg === null ? t('dash') : formatNumber(item.body_weight_kg, locale)} {t('kg')}</dd></div>
      <div><dt className="text-muted">{t('waist')}</dt><dd className="text-2xl font-bold">{item.waist_cm === null ? t('dash') : formatNumber(item.waist_cm, locale)} {t('cm')}</dd></div>
    </dl>
    <p className="whitespace-pre-wrap text-muted">{item.notes || t('noNotes')}</p>
    {media.loading ? <p role="status">{t('loadingPhotos')}</p> : media.error ?
      <div role="alert"><p>{t('photosFailed')}</p><button className="min-h-12 px-4" onClick={media.retry}>{t('retry')}</button></div> :
      media.urls.length ? <div className="grid gap-3 sm:grid-cols-3">{media.urls.slice(0, 3).map((url, index) =>
        <Image key={url} src={url} alt={t('photo', { n: formatNumber(index + 1, locale) })} width={480} height={640} unoptimized onError={media.failed} className="h-auto w-full rounded-control object-contain" />)}</div> : <p className="text-muted">{t('noPhotos')}</p>}
  </div>;
}
