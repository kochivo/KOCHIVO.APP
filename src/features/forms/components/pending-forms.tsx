'use client';
import { Button } from '@/ui/button';
import { useCallback } from 'react';
import Link from 'next/link';
import { useResource } from '@/core/resource';
import { useViewerTimezone } from '@/core/timezone/client';
import type { Locale } from '@/core/i18n/locale';
import { pendingRequests } from '../data/request-actions';
import { messages } from '../requests/messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { createT } from '@/core/i18n/messages';
export function PendingForms({locale}:{locale:Locale}) {
  const timezone = useViewerTimezone();
  const load = useCallback(() => pendingRequests(),[]);
  const resource = useResource(`pending-forms:${locale}`,load);
  const m = messages[locale];
  const v6 = captainWorkspaceEnabled();
  const v6t = createT(v6Messages, locale);
  if (!resource.data) return <section className="glass rounded-card p-card" role="status">
    {resource.status === 'error' ? <><p>{m.error}</p>{v6 ? <Button variant="secondary" onClick={() => void resource.retry()} className="min-h-12 text-lime">{m.retry}</Button> : <button onClick={() => void resource.retry()} className="min-h-12 text-lime">{m.retry}</button>}</> : m.loading}</section>;
  if (!resource.data.length) return v6 ? <section className="glass rounded-card border border-line-soft p-card"><h2 className="font-display text-title font-semibold">{v6t('title')}</h2><p className="mt-stack text-sm text-faint">{m.empty}</p></section> : null;
  return <section className="glass-strong space-y-stack rounded-card p-card"><h2 className="font-bold">{v6 ? v6t('title') : m.pending}</h2>
    {resource.status === 'error' && <div role="alert"><p>{m.error}</p>{v6 ? <Button variant="secondary" className="min-h-12 text-lime" onClick={() => void resource.retry()}>{m.retry}</Button> : <button className="min-h-12 text-lime" onClick={() => void resource.retry()}>{m.retry}</button>}</div>}
    <ul>{resource.data.map(r => <li key={r.id}><Link href={`/${locale}/player/forms/${r.id}`} prefetch={false}
      className="flex min-h-12 items-center justify-between gap-stack text-lime">{r.forms?.title}<span className="text-xs text-muted">{r.due_at && new Intl.DateTimeFormat(locale,{timeZone:timezone}).format(new Date(r.due_at))}</span></Link></li>)}</ul>
  </section>;
}
