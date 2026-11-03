'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck, History, ListFilter, X } from 'lucide-react';
import { EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { messages as uiMessages } from '@/ui/messages';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { listInbox, reviewItem } from '../data/inbox';
import type { InboxItem } from '../types';
import { InboxRow } from './inbox-row';
import { FormCheckDetail } from './form-check-detail';
import { CheckinDetail } from './checkin-detail';
import { ReplyBox } from './reply-box';
import { VoiceRecorder } from '@/features/voice-notes';

export function InboxScreen() {
  const t = useT(messages);
  const feedback = useT(uiMessages);
  const toast = useToast();
  const locale = useLocale();
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
    } catch { if (current === generation.current) setError(t('loadFailed')); }
    finally { if (current === generation.current) setLoading(false); }
  }, [status, t]);
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
      toast.success(feedback('reviewSent'));
    } catch (failure) {
      setItems(snapshot);
      setCount((value) => value === null ? null : value + 1);
      setSelected({ ...item, reply });
      setError(failure instanceof Error ? failure.message : t('sendFailed'));
    } finally { setPending(false); }
  }
  function switchTo(tab: 'open' | 'reviewed') {
    if (tab === status) return;
    setLoading(true); setError(''); setSelected(null); setStatus(tab);
  }
  const visible = items.filter((item) => filter === 'all' || item.kind === filter);
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 id="inbox-heading" tabIndex={-1} className="text-3xl font-extrabold">{t('inbox')} <span className="text-lime">{count === null ? t('dash') : formatNumber(count, locale)}</span></h1>
      <div className="glass flex rounded-control p-1" aria-label={t('status')}>
        {(['open', 'reviewed'] as const).map((tab) => <button key={tab} disabled={pending} aria-pressed={status === tab}
          className={`min-h-12 rounded-control px-5 ${status === tab ? 'bg-surface-raised text-lime' : 'text-muted'}`}
          onClick={() => switchTo(tab)}>{tab === 'open' ? t('open') : t('reviewed')}</button>)}
      </div>
    </header>
    <div className="flex flex-wrap gap-2" aria-label={t('type')}>
      {(['all', 'form', 'checkin'] as const).map((kind) => <button key={kind} aria-pressed={filter === kind}
        className={`glass min-h-12 rounded-full px-5 ${filter === kind ? 'text-lime' : 'text-muted'}`}
        onClick={() => { setSelected(null); setFilter(kind); }}>{kind === 'all' ? t('all') : kind === 'form' ? t('videos') : t('checkins')}</button>)}
    </div>
    {error && <div role="alert" className="glass rounded-card p-4 text-danger">{error}<button disabled={pending} onClick={() => { setLoading(true); setError(''); void load(); }} className="ms-3 min-h-12 px-4 text-ink">{t('retry')}</button></div>}
    {pending && <p role="status" className="text-muted">{t('sending')}</p>}
    {loading ? <LoadingState variant="list" aria-label={t('loading')} /> : <div className="grid items-start gap-5 lg:grid-cols-2">
      <section aria-label={t('inbox')} className="space-y-3">
        {!visible.length && !error && (items.length ? <EmptyState icon={ListFilter} title={t('noType')} body={t('noTypeBody')} action={{ label: t('showAll'), onClick: () => setFilter('all') }} />
          : status === 'open' ? <EmptyState icon={CheckCheck} title={t('noPending')} body={t('noPendingBody')} steps={[t('stepForm'), t('stepCheckin')]} action={{ label: t('showReviewed'), onClick: () => switchTo('reviewed') }} />
          : <EmptyState icon={History} title={t('noReviewed')} body={t('noReviewedBody')} action={{ label: t('showOpen'), onClick: () => switchTo('open') }} />)}
        <ul className="space-y-3">{now && visible.map((item) => <li key={`${item.kind}:${item.id}`}><InboxRow item={item} now={now}
          selected={selected?.id === item.id && selected.kind === item.kind} onSelect={() => { if (!pending) setSelected(item); }} /></li>)}</ul>
      </section>
      {selected && <ResponsiveDialog key={`${selected.kind}:${selected.id}`} openerId={`inbox-${selected.kind}-${selected.id}`} fallbackId="inbox-heading" aria-label={t('details', { name: selected.player_name })} onDismiss={() => setSelected(null)}
        className="glass-strong fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none space-y-5 overflow-y-auto bg-bg p-5 text-ink backdrop:bg-bg/80 lg:static lg:z-auto lg:h-auto lg:rounded-card lg:p-6">
        <header className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{selected.player_name}</h2>
          <button aria-label={t('close')} className="flex min-h-12 min-w-12 items-center justify-center" onClick={() => setSelected(null)}><X aria-hidden="true" /></button></header>
        {error && <p role="alert" className="text-danger">{error}</p>}
        {selected.kind === 'form' ? <FormCheckDetail key={`form:${selected.id}`} item={selected} /> : <CheckinDetail key={`checkin:${selected.id}`} item={selected} />}
        {selected.reviewed_at ? <div className="glass rounded-card p-4"><p className="text-muted">{t('reviewed')}</p><p className="whitespace-pre-wrap">{selected.reply || t('noReply')}</p></div> :
          <ReplyBox key={`${selected.kind}:${selected.id}`} item={selected} onSend={send} />}
        <section aria-labelledby="inbox-voice" className="space-y-3">
          <h3 id="inbox-voice" className="font-bold">{t('voiceReply')}</h3>
          <VoiceRecorder key={`voice:${selected.kind}:${selected.id}`} playerId={selected.player_id} context={{ kind: selected.kind, id: selected.id }} />
        </section>
      </ResponsiveDialog>}
    </div>}
  </div>;
}
