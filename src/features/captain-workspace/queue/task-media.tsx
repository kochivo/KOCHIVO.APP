'use client';
import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { mediaUrls } from '@/features/inbox';
import type { InboxItem } from '@/features/inbox';
import { formatNumber } from '@/lib/format';
import { taskMessages } from './messages';
import { Button } from '@/ui/button';
export function TaskMedia({ item }: { item: InboxItem }) {
  const t = useT(taskMessages), locale = useLocale();
  const [failed, setFailed] = useState(false);
  const loader = useCallback(async () => {
    const result = await mediaUrls({ id: item.id, kind: item.kind });
    if (result.error || !result.data) throw new Error(t('error'));
    return result.data;
  }, [item.id, item.kind, t]);
  const media = useResource(`task-media:${item.kind}:${item.id}`, loader, { staleMs: 300_000 });
  if (media.error || failed) return <div role="alert"><p>{t('error')}</p><Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-3"} onClick={() => { setFailed(false); void media.retry(); }}>{t('retry')}</Button></div>;
  if (!media.data) return <p role="status" className="glass-strong grid aspect-video place-items-center rounded-control text-muted">{t('loading')}</p>;
  if (item.kind === 'form') return <video controls playsInline preload="metadata" src={media.data[0]} onError={() => setFailed(true)} aria-label={t('videoLabel')} className="aspect-video w-full rounded-control bg-bg object-contain" />;
  return <>{media.data.length ? <div className="grid grid-cols-2 gap-2">{media.data.map((url, index) => <Image key={url} src={url} alt={t('photo', { n: formatNumber(index + 1, locale) })} unoptimized width={240} height={320} onError={() => setFailed(true)} className="aspect-[3/4] w-full rounded-control object-cover" />)}</div>
    : <p className="text-sm text-muted">{t('noPhotos')}</p>}
    {item.body_weight_kg !== null && <dl className="mt-3 flex items-center justify-between border-b border-line-soft py-3 text-sm"><dt className="text-muted">{t('weight')}</dt><dd>{t('kg', { value: formatNumber(item.body_weight_kg, locale) })}</dd></dl>}
  </>;
}
