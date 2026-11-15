'use client';
import { Button } from '@/ui/button';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { messages } from './messages';
import { createPhotoRecovery } from './photo-recovery';

export type SignPhotos = (input: { kind: 'checkin'; id: string }) => Promise<{ data?: string[]; error?: string }>;

export function FormPhotos({ id, playerId, count, locale, sign }: {
  id: string; playerId: string; count: number; locale: Locale; sign: SignPhotos;
}) {
  const t = createT(messages, locale);
  const [recovery] = useState(createPhotoRecovery);
  const [version, setVersion] = useState(0);
  const [failedImage, setFailedImage] = useState(false);
  const load = useCallback(async () => {
    const result = await sign({ kind: 'checkin', id });
    if (result.error || !result.data) throw new Error(result.error);
    return result.data;
  }, [id, sign]);
  const media = useResource<string[]>(count ? `player-form-photos:${playerId}:${id}` : null, load, { staleMs: 300_000 });
  const refresh = () => { void media.retry().then(() => setVersion(value => value + 1)); };
  const retry = () => { setFailedImage(false); recovery.reset(); refresh(); };
  const failed = (batch: string[]) => {
    const action = recovery.failed(batch);
    if (action === 'error') setFailedImage(true);
    else if (action === 'refresh') refresh();
  };
  return <section aria-label={t('photos')} className="space-y-stack border-t border-line py-page-y">
    <h3 className="text-sm text-muted">{t('photos')}</h3>
    {!count ? <p className="text-sm text-muted">{t('noPhotos')}</p> : media.status === 'error' || failedImage ?
      <div role="alert"><p>{t('photosFailed')}</p><Button variant="secondary" type="button" className="min-h-12 px-page-x" onClick={retry}>{t('retry')}</Button></div> :
      !media.data ? <p role="status" className="text-sm text-muted">{t('photosLoading')}</p> :
        <div className="grid grid-cols-3 gap-stack">{media.data.map((url, index, batch) =>
          <a key={`${version}:${url}`} href={url} target="_blank" rel="noreferrer" className="min-h-12 overflow-hidden rounded-control">
            <Image src={url} alt={t('photo', { count: formatNumber(index + 1, locale) })} width={160} height={200}
              unoptimized className="h-auto w-full object-contain" onError={() => failed(batch)} />
          </a>)}</div>}
  </section>;
}
