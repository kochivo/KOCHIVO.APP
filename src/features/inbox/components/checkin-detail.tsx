'use client';

import Image from 'next/image';
import { useInboxMedia } from '../hooks/use-inbox-media';
import type { InboxItem } from '../types';

export function CheckinDetail({ item }: { item: Extract<InboxItem, { kind: 'checkin' }> }) {
  const media = useInboxMedia(item);
  return <div className="space-y-4">
    <h3 className="text-xl font-bold">أسبوع {item.week_start}</h3>
    <dl className="glass-strong grid grid-cols-2 gap-4 rounded-card p-4">
      <div><dt className="text-muted">الوزن</dt><dd className="text-2xl font-bold">{item.body_weight_kg ?? '—'} كجم</dd></div>
      <div><dt className="text-muted">الوسط</dt><dd className="text-2xl font-bold">{item.waist_cm ?? '—'} سم</dd></div>
    </dl>
    <p className="whitespace-pre-wrap text-muted">{item.notes || 'مفيش ملاحظات'}</p>
    {media.loading ? <p role="status">بنحمّل الصور…</p> : media.error ?
      <div role="alert"><p>الصور مش راضية تفتح</p><button className="min-h-12 px-4" onClick={media.retry}>جرّب تاني</button></div> :
      media.urls.length ? <div className="grid gap-3 sm:grid-cols-3">{media.urls.slice(0, 3).map((url, index) =>
        <Image key={url} src={url} alt={`صورة التحديث ${index + 1}`} width={480} height={640} unoptimized onError={media.failed} className="h-auto w-full rounded-control object-contain" />)}</div> : <p className="text-muted">مفيش صور</p>}
  </div>;
}
