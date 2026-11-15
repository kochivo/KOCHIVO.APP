'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck, History, ListFilter, X } from 'lucide-react';
import { EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { listInbox, reviewItem } from '../data/inbox';
import type { InboxItem } from '../types';
import { InboxRow } from './inbox-row';
import { FormCheckDetail } from './form-check-detail';
import { CheckinDetail } from './checkin-detail';
import { ReplyBox } from './reply-box';
import { VoiceRecorder, useRecorder, sendVoiceNote } from '@/features/voice-notes';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { useUnsentVoiceGuard } from '../hooks/use-unsent-voice-guard';
import { emptyInputs, inboxKey, nextOpenItem, orderTriage, triage } from '../triage';
import type { TriageInputs, TriageResult } from '../triage';
import { InboxGroups } from './inbox-groups';
import { FlagChip } from './flag-chip';

const currentTime = () => new Date();
export function InboxScreen({ now: clock = currentTime }: { now?: () => Date } = {}) {
  const t = useT(messages);
  const success = useT(successMessages);
  const toast = useToast();
  const locale = useLocale();
  const [status, setStatus] = useState<'open' | 'reviewed'>('open');
  const [filter, setFilter] = useState<'all' | InboxItem['kind']>('all');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [inputs, setInputs] = useState<TriageInputs | null>(null);
  const [groupFilter, setGroupFilter] = useState<'all' | TriageResult['group']>('all');
  const [caughtUp, setCaughtUp] = useState(false);
  const navigation = useRef(0);
  const recorder = useRecorder();
  const [uploaded, setUploaded] = useState<Blob | null>(null);
  const hasVoice = recorder.state.status === 'recorded';
  const recording = recorder.state.status === 'recording' || recorder.state.status === 'requesting';
  const dirtyVoice = hasVoice || recording;
  const [loading, setLoading] = useState(true);
  const [actionError, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const error = actionError || loadError;
  const [pending, setPending] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());
  const canLeave = useUnsentVoiceGuard(dirtyVoice, dirtyVoice && pending.length > 0, t('unsentVoice'));
  function leave() {
    if (!canLeave()) return false;
    navigation.current++; setCaughtUp(false);
    if (dirtyVoice) recorder.reset();
    setUploaded(null);
    setSelected(null);
    return true;
  }
  const [reviews, setReviews] = useState<Record<string, InboxItem>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const reviewsRef = useRef<Record<string, InboxItem>>({});
  const currentStatus = useRef(status);
  const keyOf = (item: InboxItem) => `${item.kind}:${item.id}`;
  function markReview(key: string, item: InboxItem | null) {
    const next = { ...reviewsRef.current };
    if (item) next[key] = item; else delete next[key];
    reviewsRef.current = next; setReviews(next);
  }
  const [now, setNow] = useState<Date | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await listInbox({ status, limit: 50 });
      if (current !== generation.current) return;
      setLoadError(result.error ?? '');
      if (result.error) return;
      setItems(result.data ?? []);
      if (status === 'open') setCount((result.data ?? []).filter(item => !reviewsRef.current[`${item.kind}:${item.id}`]).length);
      const at = clock(); setNow(at); setInputs(null);
      const players = [...new Set((result.data ?? []).filter(item => item.kind === 'checkin').map(item => item.player_id))];
      if (players.length) {
        const { listTriageInputs } = await import('../data/triage-inputs');
        const extra = await listTriageInputs(players, at.toISOString());
        if (current !== generation.current) return;
        if (extra.error) setLoadError(extra.error); else setInputs(extra.data ?? null);
      } else setInputs(emptyInputs);
    } catch { if (current === generation.current) setLoadError(t('loadFailed')); }
    finally { if (current === generation.current) setLoading(false); }
  }, [status, t, clock]);
  useEffect(() => {
    const token = generation;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; token.current++; };
  }, [load]);
  async function send(reply: string, advance = false) {
    if (!selected || recording || (advance && !inputs) || inFlight.current.has(keyOf(selected))) return;
    const item = selected;
    const key = keyOf(item);
    const position = navigation.current;
    const next = advance ? nextOpenItem(displayed.filter(row => !inFlight.current.has(keyOf(row))), item, resultFor) : null;
    inFlight.current.add(key);
    setPending([...inFlight.current]);
    setError('');
    let failure = t('sendFailed');
    if (!hasVoice) {
      markReview(key, { ...item, reply: reply.trim() || null, reviewed_at: clock().toISOString() });
      setCount((value) => value === null ? null : Math.max(0, value - 1));
      if (!advance) setSelected(null);
    }
    try {
      if (recorder.state.status === 'recorded' && uploaded !== recorder.state.blob) {
        await sendVoiceNote(await loadSupabaseBrowser(), { playerId: item.player_id,
          recording: recorder.state.blob, previewUrl: recorder.state.url, seconds: recorder.state.seconds, context: { kind: item.kind, id: item.id } });
        setUploaded(recorder.state.blob);
      }
      const result = await reviewItem({ kind: item.kind, id: item.id, reply });
      if (result.error !== undefined) { failure = result.error; throw new Error(failure); }
      if (hasVoice) {
        markReview(key, { ...item, reply: reply.trim() || null, reviewed_at: clock().toISOString() });
        setCount(value => value === null ? null : Math.max(0, value - 1));
        recorder.reset(); setUploaded(null); if (!advance) setSelected(null);
      }
      if (advance && position === navigation.current && currentStatus.current === 'open') {
        setSelected(next ? { ...next, reply: drafts[keyOf(next)] ?? next.reply } : null);
        setCaughtUp(!next);
      }
      setDrafts(current => { const next = { ...current }; delete next[key]; return next; });
      toast.success({ title: success('replySent', { name: item.player_name }), detail: success('name', { name: item.kind === 'form' ? item.exercise_name : t('checkin') }), icon: 'form' });
    } catch {
      markReview(key, null);
      setDrafts(current => ({ ...current, [key]: reply }));
      if (currentStatus.current === 'open') setItems(rows => rows.some(row => keyOf(row) === key) ? rows : [...rows, item]
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)));
      if (!hasVoice) setCount((value) => value === null ? null : value + 1);
      if (currentStatus.current === 'open') setSelected(current => current ?? { ...item, reply });
      setError(failure);
    } finally { inFlight.current.delete(key); setPending([...inFlight.current]); }
  }
  function switchTo(tab: 'open' | 'reviewed') {
    if (tab === status) return;
    if (!leave()) return;
    currentStatus.current = tab;
    setItems([]); setLoading(true); setError(''); setLoadError(''); setSelected(null); setStatus(tab);
  }
  const displayed = status === 'open' ? items.filter(item => !reviews[keyOf(item)])
    : [...items, ...Object.values(reviews).filter(item => !items.some(row => keyOf(row) === keyOf(item)))]
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
  const resultFor = (item: InboxItem): TriageResult => now && (inputs || item.kind === 'form')
    ? triage(item, inputs?.history ?? [], inputs?.dailyChecks ?? [], now) : { group: 'routine', flags: [] };
  const visible = orderTriage(displayed.filter(item => (filter === 'all' || item.kind === filter) &&
    (groupFilter === 'all' || resultFor(item).group === groupFilter)), resultFor);
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 id="inbox-heading" tabIndex={-1} className="text-3xl font-extrabold">{t('inbox')} <span className="text-lime">{count === null ? t('dash') : formatNumber(count, locale)}</span></h1>
      <div className="glass flex rounded-control p-1" aria-label={t('status')}>
        {(['open', 'reviewed'] as const).map((tab) => <button key={tab} aria-pressed={status === tab}
          className={`min-h-12 rounded-control px-5 ${status === tab ? 'bg-surface-raised text-lime' : 'text-muted'}`}
          onClick={() => switchTo(tab)}>{tab === 'open' ? t('open') : t('reviewed')}</button>)}
      </div>
    </header>
    <div className="flex flex-wrap gap-2" aria-label={t('type')}>
      {(['all', 'form', 'checkin'] as const).map((kind) => <button key={kind} aria-pressed={filter === kind}
        className={`glass min-h-12 rounded-full px-5 ${filter === kind ? 'text-lime' : 'text-muted'}`}
        onClick={() => { if (leave()) setFilter(kind); }}>{kind === 'all' ? t('all') : kind === 'form' ? t('videos') : t('checkins')}</button>)}
    </div>
    {error && <div role="alert" className="glass rounded-card p-4 text-danger">{error}<button onClick={() => { setLoading(true); setError(''); setLoadError(''); void load(); }} className="ms-3 min-h-12 px-4 text-ink">{t('retry')}</button></div>}
    {pending.length > 0 && <p role="status" className="text-muted">{t('sending')}</p>}
    {caughtUp && <p role="status" tabIndex={-1} ref={node => node?.focus()} className="glass-strong rounded-card p-5">{t('caughtUp')}</p>}
    {loading && !displayed.length ? <LoadingState variant="list" aria-label={t('loading')} /> : <div className="grid items-start gap-5 lg:grid-cols-2">
      <section aria-label={t('inbox')} className="space-y-3">
        {!visible.length && !error && !loading && (displayed.length ? <EmptyState icon={ListFilter} title={t('noType')} body={t('noTypeBody')} action={{ label: t('showAll'), onClick: () => { setFilter('all'); setGroupFilter('all'); } }} />
          : status === 'open' ? <EmptyState icon={CheckCheck} title={t('noPending')} body={t('noPendingBody')} steps={[t('stepForm'), t('stepCheckin')]} action={{ label: t('showReviewed'), onClick: () => switchTo('reviewed') }} />
          : <EmptyState icon={History} title={t('noReviewed')} body={t('noReviewedBody')} action={{ label: t('showOpen'), onClick: () => switchTo('open') }} />)}
        <InboxGroups filter={groupFilter} loading={loading && !inputs} onFilter={value => { if (leave()) setGroupFilter(value); }}>{now ? visible.map((item) => <li data-group={resultFor(item).group} key={inboxKey(item)} inert={pending.includes(keyOf(item))} aria-busy={pending.includes(keyOf(item))}><InboxRow item={item} now={now}
          selected={selected?.id === item.id && selected.kind === item.kind} onSelect={() => { if (!inFlight.current.has(keyOf(item)) && leave()) setSelected({ ...item, reply: drafts[keyOf(item)] ?? item.reply }); }} />
          <div className="mt-2 flex flex-wrap gap-2">{resultFor(item).flags.map(flag => <FlagChip key={flag.key} flag={flag} />)}</div></li>) : []}</InboxGroups>
      </section>
      {selected && <ResponsiveDialog key={`${selected.kind}:${selected.id}`} openerId={`inbox-${selected.kind}-${selected.id}`} fallbackId="inbox-heading" aria-label={t('details', { name: selected.player_name })} onDismiss={() => { leave(); }}
        className="sheet fixed inset-0 z-50 m-0 h-full max-h-dvh w-full max-w-none space-y-5 overflow-y-auto bg-bg p-5 text-ink backdrop:bg-bg/80 lg:static lg:z-auto lg:h-auto lg:rounded-card lg:p-6">
        <header className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{selected.player_name}</h2>
          <button aria-label={t('close')} className="flex min-h-12 min-w-12 items-center justify-center" onClick={() => { leave(); }}><X aria-hidden="true" /></button></header>
        {error && <p role="alert" className="text-danger">{error}</p>}
        {selected.kind === 'form' ? <FormCheckDetail key={`form:${selected.id}`} item={selected} /> : <CheckinDetail key={`checkin:${selected.id}`} item={selected} history={inputs?.history} dailyChecks={inputs?.dailyChecks} now={now ?? undefined} />}
        {selected.reviewed_at ? <div className="glass rounded-card p-4"><p className="text-muted">{t('reviewed')}</p><p className="whitespace-pre-wrap">{selected.reply || t('noReply')}</p></div> :
          <ReplyBox key={`${selected.kind}:${selected.id}`} item={selected} onSend={send} onSendNext={inputs ? reply => send(reply, true) : undefined} disabled={pending.includes(keyOf(selected)) || recording} />}
        {!selected.reviewed_at && <section aria-labelledby="inbox-voice" className="space-y-3">
          <h3 id="inbox-voice" className="font-bold">{t('voiceReply')}</h3>
          <fieldset disabled={pending.includes(keyOf(selected)) || Boolean(uploaded)}>
            <VoiceRecorder key={`voice:${selected.kind}:${selected.id}`} playerId={selected.player_id} recorder={recorder} />
          </fieldset>
        </section>}
      </ResponsiveDialog>}
    </div>}
  </div>;
}
