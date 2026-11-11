'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { useResource } from '@/core/resource';
import type { Locale } from '@/core/i18n/locale';
import { pendingRequests } from '../data/request-actions';
import { messages } from '../requests/messages';
export function PendingForms({locale}:{locale:Locale}) {
  const load = useCallback(() => pendingRequests(),[]);
  const resource = useResource(`pending-forms:${locale}`,load);
  const m = messages[locale];
  if (!resource.data) return <section className="glass rounded-card p-5" role="status">
    {resource.status === 'error' ? <><p>{m.error}</p><button onClick={() => void resource.retry()} className="min-h-12 text-lime">{m.retry}</button></> : m.loading}</section>;
  if (!resource.data.length) return null;
  return <section className="glass-strong space-y-3 rounded-card p-5"><h2 className="font-bold">{m.pending}</h2>
    {resource.status === 'error' && <div role="alert"><p>{m.error}</p><button className="min-h-12 text-lime" onClick={() => void resource.retry()}>{m.retry}</button></div>}
    <ul>{resource.data.map(r => <li key={r.id}><Link href={`/${locale}/player/forms/${r.id}`} prefetch={false}
      className="flex min-h-12 items-center justify-between gap-3 text-lime">{r.forms?.title}<span className="text-xs text-muted">{r.due_at && new Intl.DateTimeFormat(locale,{timeZone:'Africa/Cairo'}).format(new Date(r.due_at))}</span></Link></li>)}</ul>
  </section>;
}
