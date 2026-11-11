'use client';
import { useCallback,useRef,useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useResource } from '@/core/resource';
import type { Locale } from '@/core/i18n/locale';
import { playerRequests,requestPicker,remindRequest,requestDetail } from '../data/request-actions';
import { messages } from '../requests/messages';
import { RequestPicker } from './request-picker';
import { RequestReview } from './request-review';
export function RequestManager({playerId,locale}:{playerId:string;locale:Locale}) {
  const m = messages[locale],search = useSearchParams();
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
  const [error,setError] = useState(false),[sending,setSending] = useState(false),[sent,setSent] = useState(false);
  const busy = useRef(false);
  async function remind(id:string) {
    if (busy.current || !resource.data) return;
    const previous = resource.data;
    busy.current = true;setSending(true);setError(false);
    try {
      const ok = await resource.mutate(current => ({...(current ?? previous),pending:(current ?? previous).pending.map(r => r.id === id ? {...r,reminded_at:new Date().toISOString()} : r)}),
        async () => {if (!(await remindRequest(id)).ok) throw new Error('remind');});
      if (!ok) setError(true);
    } catch {setError(true);}
    finally {busy.current = false;setSending(false);}
  }
  if (!resource.data) return <section role="status">{resource.status === 'error' ? m.error : m.loading}
    {resource.status === 'error' && <button className="min-h-12 px-4 text-lime" onClick={() => void resource.retry()}>{m.retry}</button>}</section>;
  const data = resource.data, detail = data.requests.find(r => r.request.id === selected);
  return <section className="space-y-4" aria-label={m.pending}>
    <button onClick={() => {setPicking(true);setSent(false);}} className="min-h-12 rounded-control bg-lime-soft px-5 font-bold text-lime">{m.send}</button>
    {sent && <p role="status">{m.sent}</p>}
    {picking && <RequestPicker forms={data.forms} playerId={playerId} locale={locale} onCancel={() => setPicking(false)}
      onSend={(row,commit) => resource.mutate(current => ({...(current ?? data),pending:[{
        id:row.id,form_id:row.form_id,due_at:row.due_at,reminded_at:null,forms:{title:data.forms.find(f => f.id === row.form_id)?.title ?? ''},
      },...(current ?? data).pending]}),commit)}
      onSent={() => {setPicking(false);setSent(true);void resource.retry();}} />}
    {(error || resource.status === 'error') && <div role="alert" className="text-danger"><p>{m.error}</p>
      <button className="min-h-12 text-lime" onClick={() => {setError(false);void resource.retry();}}>{m.retry}</button></div>}
    {!!data.pending.length && <ul className="glass divide-y divide-line rounded-card p-4">{data.pending.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3">
      <span>{r.forms?.title}{r.due_at && <span className="ms-3 text-xs text-muted">{new Intl.DateTimeFormat(locale,{timeZone:'Africa/Cairo'}).format(new Date(r.due_at))}</span>}</span><button disabled={sending || !!r.reminded_at} onClick={() => void remind(r.id)}
        className="min-h-12 px-4 text-lime disabled:text-muted">{r.reminded_at ? m.reminded : m.remind}</button></li>)}</ul>}
    {!data.requests.length && <p className="text-muted">{m.empty}</p>}
    <ul className="flex flex-wrap gap-3">{data.requests.filter(r => r.request.answered_at).map(r => <li key={r.request.id}>
      <button aria-pressed={selected === r.request.id} onClick={() => setSelection({query:requested,id:r.request.id})} className="glass min-h-12 rounded-control px-4 text-start">{r.title}</button></li>)}</ul>
    {!picking && detail && <RequestReview key={detail.request.id} data={detail} locale={locale} onReviewed={() => void resource.retry()} />}
  </section>;
}
