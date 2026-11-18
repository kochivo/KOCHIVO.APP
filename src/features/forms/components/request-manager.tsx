'use client';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useCallback,useRef,useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useResource } from '@/core/resource';
import { useViewerTimezone } from '@/core/timezone/client';
import type { Locale } from '@/core/i18n/locale';
import { playerRequests,requestPicker,remindRequest,requestDetail } from '../data/request-actions';
import { messages } from '../requests/messages';
import { RequestPicker } from './request-picker';
import { RequestReview } from './request-review';
export function RequestManager({playerId,locale}:{playerId:string;locale:Locale}) {
  const router = useRouter();
  const timezone = useViewerTimezone();
  const t = useT(messages),search = useSearchParams();
  const requested = search.get('requestId');
  const load = useCallback(async () => {
    const [picker,requests] = await Promise.all([requestPicker(playerId),playerRequests(playerId)]);
    if (requested && !requests.some(r => r.request.id === requested)) {
      const detail = await requestDetail(requested);
      if (detail.request.player_id === playerId) requests.push(detail);
    }
    return {...picker,requests};
  },[playerId,requested]);
  const resource = useResource(`form-requests:${playerId}:${locale}:${requested ?? ''}`,load);
  const [picking,setPicking] = useState(false),[selection,setSelection] = useState({query:requested,id:requested});
  const selected = selection.query === requested ? selection.id : requested;
  const [failedReminder,setFailedReminder] = useState<string | null>(null),[sending,setSending] = useState(false),[sent,setSent] = useState(false);
  const busy = useRef(false);
  async function remind(id:string) {
    if (busy.current || !resource.data) return;
    const previous = resource.data;
    busy.current = true;setSending(true);setFailedReminder(null);
    try {
      const ok = await resource.mutate(current => ({...(current ?? previous),pending:(current ?? previous).pending.map(r => r.id === id ? {...r,reminded_at:new Date().toISOString()} : r)}),
        async () => {if (!(await remindRequest(id)).ok) throw new Error('remind');});
      if (!ok) setFailedReminder(id);
    } catch {setFailedReminder(id);}
    finally {busy.current = false;setSending(false);}
  }
  if (!resource.data) return <section role="status">{resource.status === 'error' ? t('error') : t('loading')}
    {resource.status === 'error' && <Button variant="secondary" className="min-h-12 px-page-x" onClick={() => void resource.retry()}>{t('retry')}</Button>}</section>;
  const data = resource.data, detail = data.requests.find(r => r.request.id === selected);
  return <section className="space-y-card-gap" aria-label={t('pending')}>
    <Button variant={picking || detail ? 'secondary' : 'primary'} onClick={() => {setPicking(true);setSent(false);}}>{t('send')}</Button>
    {sent && <p role="status">{t('sent')}</p>}
    {picking && <RequestPicker forms={data.forms} playerId={playerId} locale={locale} onCancel={() => setPicking(false)}
      onSend={(row,commit) => resource.mutate(current => ({...(current ?? data),pending:[{
        id:row.id,form_id:row.form_id,due_at:row.due_at,reminded_at:null,forms:{title:data.forms.find(f => f.id === row.form_id)?.title ?? ''},
      },...(current ?? data).pending]}),commit)}
      onSent={() => {setPicking(false);setSent(true);void resource.retry();router.refresh();}} />}
    {(failedReminder || resource.status === 'error') && <div role="alert" className="text-danger"><p>{t('error')}</p>
      <Button variant="secondary" className="min-h-12" disabled={sending} onClick={() => { if (failedReminder) void remind(failedReminder); else void resource.retry(); }}>{t('retry')}</Button></div>}
    {!!data.pending.length && <ul className="glass divide-y divide-line rounded-card p-card">{data.pending.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-stack">
      <span>{r.forms?.title}{r.due_at && <span className="ms-stack text-xs text-muted">{new Intl.DateTimeFormat(locale,{timeZone:timezone}).format(new Date(r.due_at))}</span>}</span><Button variant="secondary" disabled={sending || !!r.reminded_at} onClick={() => void remind(r.id)}
        className="min-h-12 px-page-x">{r.reminded_at ? t('reminded') : t('remind')}</Button></li>)}</ul>}
    {!data.requests.length && <p className="text-muted">{t('empty')}</p>}
    <ul className="flex flex-wrap gap-stack">{data.requests.filter(r => r.request.answered_at).map(r => <li key={r.request.id}>
      <button aria-pressed={selected === r.request.id} onClick={() => setSelection({query:requested,id:r.request.id})} className="glass min-h-12 rounded-control px-page-x text-start">{r.title}</button></li>)}</ul>
    {!picking && detail && <RequestReview key={detail.request.id} data={detail} locale={locale} onReviewed={() => void resource.retry()} />}
  </section>;
}
