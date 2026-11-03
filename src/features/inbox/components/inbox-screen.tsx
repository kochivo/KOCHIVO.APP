'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { listInbox, reviewItem } from '../data/inbox';
import type { InboxItem } from '../types';
import { InboxRow } from './inbox-row';
import { FormCheckDetail } from './form-check-detail';
import { CheckinDetail } from './checkin-detail';
import { ReplyBox } from './reply-box';

export function InboxScreen() {
  const [status, setStatus] = useState<'open' | 'reviewed'>('open');
  const [filter, setFilter] = useState<'all' | InboxItem['kind']>('all');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await listInbox({ status, limit: 50 });
      if (current !== generation.current) return;
      setError(result.error ?? '');
      if (result.error) return;
      setItems(result.data ?? []);
      if (status === 'open') setCount(result.data?.length ?? 0);
      setNow(new Date());
    } catch { if (current === generation.current) setError('مش قادرين نحمّل المهام. جرّب تاني'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [status]);
  useEffect(() => {
    const token = generation;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; token.current++; };
  }, [load]);
  async function send(reply: string) {
    if (!selected || pending) return;
    const item = selected;
    const snapshot = items;
    generation.current++;
    setPending(true);
    setError('');
    setItems((rows) => rows.filter((row) => row.kind !== item.kind || row.id !== item.id));
    setCount((value) => value === null ? null : Math.max(0, value - 1));
    setSelected(null);
    try {
      const result = await reviewItem({ kind: item.kind, id: item.id, reply });
      if (result.error) throw new Error(result.error);
    } catch (failure) {
      setItems(snapshot);
      setCount((value) => value === null ? null : value + 1);
      setSelected({ ...item, reply });
      setError(failure instanceof Error ? failure.message : 'الرد متبعتش. جرّب تاني');
    } finally { setPending(false); }
  }
  const visible = items.filter((item) => filter === 'all' || item.kind === filter);
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 id="inbox-heading" tabIndex={-1} className="text-3xl font-extrabold"><bdi>INBOX</bdi> · المهام <span className="text-lime">{count ?? '—'}</span></h1>
      <div className="glass flex rounded-control p-1" aria-label="حالة المهام">
        {(['open', 'reviewed'] as const).map((tab) => <button key={tab} disabled={pending} aria-pressed={status === tab}
          className={`min-h-12 rounded-control px-5 ${status === tab ? 'bg-surface-raised text-lime' : 'text-muted'}`}
          onClick={() => { if (tab !== status) { setLoading(true); setError(''); setSelected(null); setStatus(tab); } }}>{tab === 'open' ? 'مستنياك' : 'اتراجعت'}</button>)}
      </div>
    </header>
    <div className="flex flex-wrap gap-2" aria-label="نوع المهمة">
      {(['all', 'form', 'checkin'] as const).map((kind) => <button key={kind} aria-pressed={filter === kind}
        className={`glass min-h-12 rounded-full px-5 ${filter === kind ? 'text-lime' : 'text-muted'}`}
        onClick={() => { setSelected(null); setFilter(kind); }}>{kind === 'all' ? 'الكل' : kind === 'form' ? 'فيديوهات' : 'تحديثات'}</button>)}
    </div>
    {error && <div role="alert" className="glass rounded-card p-4 text-danger">{error}<button disabled={pending} onClick={() => { setLoading(true); setError(''); void load(); }} className="ms-3 min-h-12 px-4 text-ink">جرّب تاني</button></div>}
    {pending && <p role="status" className="text-muted">بنبعت الرد…</p>}
    {loading ? <p role="status">بنحمّل المهام…</p> : <div className="grid items-start gap-5 lg:grid-cols-2">
      <section aria-label="المهام" className="space-y-3">
        {!visible.length && !error && <p className="glass rounded-card p-6 text-muted">{items.length ? 'مفيش مهام من النوع ده' : status === 'open' ? 'مفيش حاجة مستنياك. عاش' : 'لسه مراجعتش حاجة'}</p>}
        <ul className="space-y-3">{now && visible.map((item) => <li key={`${item.kind}:${item.id}`}><InboxRow item={item} now={now}
          selected={selected?.id === item.id && selected.kind === item.kind} onSelect={() => { if (!pending) setSelected(item); }} /></li>)}</ul>
      </section>
      {selected && <ResponsiveDialog key={`${selected.kind}:${selected.id}`} openerId={`inbox-${selected.kind}-${selected.id}`} fallbackId="inbox-heading" aria-label={`تفاصيل مهمة ${selected.player_name}`} onDismiss={() => setSelected(null)}
        className="glass-strong fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none space-y-5 overflow-y-auto bg-bg p-5 text-ink backdrop:bg-bg/80 lg:static lg:z-auto lg:h-auto lg:rounded-card lg:p-6">
        <header className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{selected.player_name}</h2>
          <button aria-label="اقفل التفاصيل" className="flex min-h-12 min-w-12 items-center justify-center" onClick={() => setSelected(null)}><X aria-hidden="true" /></button></header>
        {error && <p role="alert" className="text-danger">{error}</p>}
        {selected.kind === 'form' ? <FormCheckDetail key={`form:${selected.id}`} item={selected} /> : <CheckinDetail key={`checkin:${selected.id}`} item={selected} />}
        {selected.reviewed_at ? <div className="glass rounded-card p-4"><p className="text-muted">اتراجعت</p><p className="whitespace-pre-wrap">{selected.reply || 'اتراجعت من غير رد'}</p></div> :
          <ReplyBox key={`${selected.kind}:${selected.id}`} item={selected} onSend={send} />}
      </ResponsiveDialog>}
    </div>}
  </div>;
}
