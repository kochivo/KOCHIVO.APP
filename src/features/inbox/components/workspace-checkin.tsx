'use client';
import { Button } from '@/ui/button';
import Image from 'next/image';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { LoadingState } from '@/ui/loading-state';
import type { InboxItem } from '../types';
import type { TriageInputs } from '../triage';
import { dailyAverages } from '../triage';
import { useInboxMedia } from '../hooks/use-inbox-media';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceKpis } from './workspace-kpis';
export function WorkspaceCheckin({ item, inputs, now }: { item: Extract<InboxItem, { kind: 'checkin' }>; inputs: TriageInputs; now: Date }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const media = useInboxMedia(item);
  const averages = dailyAverages(item.player_id, inputs.dailyChecks, now, item.timezone);
  return <div>
    <WorkspaceKpis item={item} inputs={inputs} />
    <dl className="px-page-x">
      <div className="flex justify-between gap-stack py-stack text-row"><dt className="text-muted">{t('sleep')}</dt>
        <dd className={averages.sleep !== null && averages.sleep < 6 ? 'text-warn' : ''}>{averages.sleep === null ? t('dash') : t('hours', { value: formatNumber(Math.round(averages.sleep * 10) / 10, locale) })}</dd></div>
      <div className="flex justify-between gap-stack border-t border-line-soft py-stack text-row"><dt className="text-muted">{t('sorenessAnswer')}</dt>
        <dd className={averages.soreness !== null && averages.soreness >= 4 ? 'text-warn' : ''}>{averages.soreness === null ? t('dash') : formatNumber(Math.round(averages.soreness * 10) / 10, locale)}</dd></div>
      <div className="flex justify-between gap-stack border-t border-line-soft py-stack text-row"><dt className="shrink-0 text-muted">{t('noteAnswer')}</dt>
        <dd className="min-w-0 whitespace-pre-wrap break-words text-end">{item.notes || t('noNotes')}</dd></div>
    </dl>
    <div className="px-page-x py-card">{media.loading ? <LoadingState variant="cards" aria-label={t('loading')} /> : media.error ? <div role="alert"><p>{t('photosFailed')}</p>
      <Button variant="secondary" className="min-h-12 px-page-x" onClick={media.retry}>{t('retry')}</Button></div> : media.urls.length ?
      <div className="grid grid-cols-2 gap-stack sm:grid-cols-3">{media.urls.slice(0, 3).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="min-h-12">
        <Image src={url} alt={t((['front', 'side', 'rear'] as const)[index] ?? 'front')} width={240} height={320} unoptimized onError={media.failed}
          className="aspect-[3/4] w-full rounded-2xl border border-line-soft object-cover" /></a>)}</div> : <p className="text-sm text-faint">{t('noPhotos')}</p>}</div>
  </div>;
}
