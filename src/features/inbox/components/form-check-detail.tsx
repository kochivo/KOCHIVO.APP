'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useInboxMedia } from '../hooks/use-inbox-media';
import type { InboxItem } from '../types';

export function FormCheckDetail({ item }: { item: Extract<InboxItem, { kind: 'form' }> }) {
  const t = useT(messages);
  const media = useInboxMedia(item);
  return <div className="space-y-4">
    <h3 className="text-xl font-bold">{item.exercise_name}</h3>
    {media.loading ? <p role="status">{t('loadingVideo')}</p> : media.error ?
      <div role="alert"><p>{t('videoFailed')}</p><button className="min-h-12 px-4" onClick={media.retry}>{t('retry')}</button></div> :
      <video key={media.urls[0]} src={media.urls[0]} controls playsInline preload="metadata" onError={media.failed} className="w-full rounded-card bg-bg" aria-label={t('playerVideo')} />}
    <p className="whitespace-pre-wrap text-muted">{item.note || t('noNotes')}</p>
  </div>;
}
