'use client';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { assessmentAnswer } from '../assessment-answer';
import type { AssessmentItem } from '../workspace-types';
import { assessmentPhotos } from '../data/workspace';
import { workspaceMessages } from '../workspace-messages';
import { WorkspaceFact } from './workspace-fact';

export function WorkspaceAssessment({ item }: { item: AssessmentItem }) {
  const t = useT(workspaceMessages), locale = useLocale();
  const [failed, setFailed] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const loader = useCallback(async () => {
    const result = await assessmentPhotos(item.id);
    if (!result.data || result.error) throw new Error(result.error);
    return result.data;
  }, [item.id]);
  const media = useResource(item.answers.some(answer => answer.photoCount) ? `inbox-assessment-photos:${item.id}` : null, loader, { staleMs: 300000 });
  const retry = () => { setFailed(false); setRefreshed(false); void media.retry(); };
  const imageFailed = () => {
    if (!refreshed) { setRefreshed(true); void media.retry(); } else setFailed(true);
  };
  return <section className="space-y-3.5">
    <h3 className="font-display text-[19px] font-semibold">{item.title}</h3>
    {!item.answers.length ? <p className="text-faint">{t('noAnswers')}</p> : <dl>
      {item.answers.map(answer => <WorkspaceFact key={answer.id} flagged={answer.alert} label={locale === 'en' ? answer.label_en || answer.label_ar : answer.label_ar}>
        <span className="whitespace-pre-wrap">{assessmentAnswer(answer.value, answer.options ?? [], locale, t('yes'), t('no')) || t('dash')}</span>
      </WorkspaceFact>)}
    </dl>}
    {item.answers.some(answer => answer.photoCount > 0) && (media.error || failed ? <div role="alert">{t('photosFailed')}<button className="min-h-12 px-3" onClick={retry}>{t('retry')}</button></div> :
      !media.data ? <p role="status">{t('loading')}</p> : <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{media.data.map((photo, index) =>
        <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer" className="min-h-12"><Image src={photo.url} alt={t('photo', { count: formatNumber(index + 1, locale) })}
          width={240} height={320} unoptimized onError={imageFailed} className="aspect-[3/4] w-full rounded-2xl border border-line-soft object-cover" /></a>)}</div>)}
  </section>;
}
