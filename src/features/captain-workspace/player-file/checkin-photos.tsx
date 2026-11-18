'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { messages } from './messages';
import { v11Messages } from './v11-messages';

const PhotoDialog = dynamic(() => import('@/ui/responsive-dialog').then(module => module.ResponsiveDialog));

export function CheckinPhotos({ id, initialUrls, initialError }: {
  id: string; initialUrls: string[]; initialError?: boolean;
}) {
  const t = useT(messages), vt = useT(v11Messages), locale = useLocale();
  const [urls, setUrls] = useState(initialUrls);
  const [failed, setFailed] = useState(Boolean(initialError));
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [full, setFull] = useState<{ index: number; path: string } | null>(null);
  const photoPath = (url: string) => url.split('?')[0] ?? url;
  const photoLabel = (index: number) => t('fullPhoto', { count: formatNumber(index + 1, locale) });
  const photoId = (index: number) => `checkin-photo-${id}-${index}`;

  async function retry() {
    setLoading(true);
    try {
      const { mediaUrls } = await import('@/features/inbox');
      const result = await mediaUrls({ kind: 'checkin', id });
      if (!result.data?.length) { setFailed(true); return; }
      setUrls(result.data);
      setFailed(false);
      setAttempt(value => value + 1);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }

  const recovery = failed && <div role="alert" className="text-sm text-danger">
    <p>{t('photoLoadError')}</p>
    <Button variant="secondary" block={false} disabled={loading} aria-busy={loading} onClick={() => void retry()}>{t('retry')}</Button>
  </div>;
  const fullUrl = full && urls.find(url => photoPath(url) === full.path);
  return <>
    {recovery}
    {urls.length > 0 && <div className="grid grid-cols-2 gap-inline">{urls.map((url, index) =>
      <button type="button" id={photoId(index)} key={`${index}:${url}`} onClick={() => setFull({ index, path: photoPath(url) })}
        aria-label={photoLabel(index)} aria-haspopup="dialog" className="min-h-12 min-w-0 cursor-pointer rounded-control focus-visible:ring-2 focus-visible:ring-lime">
        <Image key={attempt} src={url} alt={vt('photos')} width={320} height={320} unoptimized onError={() => setFailed(true)}
          className="h-56 w-full rounded-control object-cover" />
      </button>)}</div>}
    {full !== null && <PhotoDialog modal title={photoLabel(full.index)} openerId={photoId(full.index)} fallbackId={photoId(full.index)}
      onDismiss={() => setFull(null)} className="fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-card border border-line-soft bg-surface p-card text-ink backdrop:bg-bg-deep/80">
      {recovery}
      {!fullUrl && !failed && <p role="status" className="text-sm text-muted">{t('photoLoadError')}</p>}
      {fullUrl && <Image key={`${attempt}:${fullUrl}`} src={fullUrl} alt={vt('photos')} width={640} height={640} unoptimized
        onError={() => setFailed(true)} className="h-auto max-h-[calc(60dvh-2rem)] w-full rounded-control object-contain" />}
    </PhotoDialog>}
  </>;
}
