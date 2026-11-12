'use client';
import Image from 'next/image';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { LoadingState } from '@/ui/loading-state';
import type { InboxItem } from '../types';
import type { TriageInputs } from '../triage';
import { previousCheckins, dailyAverages } from '../triage';
import { useInboxMedia } from '../hooks/use-inbox-media';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceFact } from './workspace-fact';

export function WorkspaceCheckin({ item, inputs, now }: { item: Extract<InboxItem, { kind: 'checkin' }>; inputs: TriageInputs; now: Date }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const media = useInboxMedia(item);
  const previous = previousCheckins(item, inputs.history)[0];
  const averages = dailyAverages(item.player_id, inputs.dailyChecks, now, item.timezone);
  const delta = (key: 'body_weight_kg' | 'waist_cm') => {
    const value = item[key], past = previous?.[key];
    if (value == null || past == null) return null;
    const change = Math.round((value - past) * 10) / 10;
    return <bdi dir="ltr" className="rounded-full bg-lime-soft px-2.5 py-1 text-xs text-lime">{t(key === 'body_weight_kg' ? 'kg' : 'cm', { value: `${change > 0 ? '+' : ''}${formatNumber(change, locale)}` })}</bdi>;
  };
  return <div className="space-y-3.5">
    {media.loading ? <LoadingState variant="cards" aria-label={t('loading')} /> : media.error ? <div role="alert"><p>{t('photosFailed')}</p>
      <button className="min-h-12 px-4" onClick={media.retry}>{t('retry')}</button></div> : media.urls.length ?
      <div className="grid grid-cols-3 gap-3.5">{media.urls.slice(0, 3).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">
        <Image src={url} alt={t((['front', 'side', 'rear'] as const)[index] ?? 'front')} width={240} height={320} unoptimized onError={media.failed}
          className="aspect-[3/4] w-full rounded-2xl border border-line-soft object-cover" /></a>)}</div> : <p className="text-sm text-faint">{t('noPhotos')}</p>}
    <dl className="glass overflow-hidden rounded-card border border-line-soft">
      <WorkspaceFact label={t('weight')}><b className="font-display font-extrabold tabular-nums">{item.body_weight_kg == null ? t('dash') : formatNumber(item.body_weight_kg, locale)}</b>{delta('body_weight_kg')}</WorkspaceFact>
      <WorkspaceFact label={t('waist')}><b className="font-display font-extrabold tabular-nums">{item.waist_cm == null ? t('dash') : formatNumber(item.waist_cm, locale)}</b>{delta('waist_cm')}</WorkspaceFact>
      <WorkspaceFact label={t('sleep')}>{averages.sleep == null ? t('dash') : t('hours', { value: formatNumber(Math.round(averages.sleep * 10) / 10, locale) })}</WorkspaceFact>
      <WorkspaceFact label={t('note')}><span className="whitespace-pre-wrap">{item.notes || t('noNotes')}</span></WorkspaceFact>
    </dl>
  </div>;
}
