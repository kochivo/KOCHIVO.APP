'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useInboxMedia } from '../hooks/use-inbox-media';
import { LoadingState } from '@/ui/loading-state';
import type { InboxItem } from '../types';

export function FormCheckDetail({ item }: { item: Extract<InboxItem, { kind: 'form' }> }) {
  const t = useT(messages);
  const media = useInboxMedia(item);
  return <div className="space-y-card-gap">
    <h3 className="text-xl font-bold">{item.exercise_name}</h3>
    {media.loading ? <LoadingState variant="detail" aria-label={t('loadingVideo')} /> : media.error ?
      <div role="alert"><p>{t('videoFailed')}</p>{captainWorkspaceEnabled() ? <Button variant="secondary" className="min-h-12 px-page-x" onClick={media.retry}>{t('retry')}</Button> : <button className="min-h-12 px-page-x" onClick={media.retry}>{t('retry')}</button>}</div> :
      <video key={media.urls[0]} src={media.urls[0]} controls playsInline preload="metadata" onError={media.failed} className="w-full rounded-card bg-bg" aria-label={t('playerVideo')} />}
    <p className="whitespace-pre-wrap text-muted">{item.note || t('noNotes')}</p>
  </div>;
}
