'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Sparkles, X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import type { KoFeedItem } from '../types';
import { decideSwapOptimistically } from '../data/decide-swap';
import { refreshFeed } from '../hooks/use-ko-feed';

function exerciseName(value: unknown, locale: string): string {
  if (!value || typeof value !== 'object') return '';
  const names = value as Record<string, unknown>;
  const name = names[locale] ?? names.en;
  return typeof name === 'string' ? name : '';
}

export function feedHref(item: KoFeedItem, locale: string) {
  const player = `/${locale}/captain/players/${item.player_id}`;
  switch (item.kind) {
    case 'join_requested': return `/${locale}/captain/players`;
    case 'sessions_used_up': return player;
    case 'no_program': return `${player}/programs`;
    case 'no_nutrition': return `${player}/nutrition`;
    case 'today_workout': return `/${locale}/player/workout/${String(item.data.day_id)}`;
    case 'my_expiring': return `/${locale}/player/captain`;
    case 'log_meal': return `/${locale}/player/nutrition`;
    default: return null;
  }
}

export function FeedCard({ item, onDismiss }: { item: KoFeedItem; onDismiss: (key: string) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [review, setReview] = useState(false);
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [reply, setReply] = useState<{ text: string; token?: string } | null>(null);
  const [decided, setDecided] = useState(false);
  const swap = item.kind === 'swap_requested';
  const injury = item.data.injury;
  const injuryName = injury === 'knee' || injury === 'shoulder' || injury === 'lower_back' ? t(injury) : '';
  async function decide(approve: boolean) {
    if (busy || typeof item.data.request_id !== 'string') return;
    setBusy(true);
    setError(false);
    const ok = await decideSwapOptimistically(item.data.request_id, approve, setDecided);
    if (ok) void refreshFeed();
    setError(!ok);
    setBusy(false);
  }
  const href = feedHref(item, locale);
  const Icon = item.severity === 'urgent' ? CircleAlert : Sparkles;
  const renewal = item.kind === 'expiring' || item.kind === 'expired';
  async function preview(confirm = false) {
    setBusy(true);
    setError(false);
    const body = new FormData();
    body.set('locale', locale);
    body.set('text', confirm ? 'confirm' : t(renewal ? 'renewPrompt' : 'reminderPrompt', { name: item.player_name, days }));
    if (confirm && reply?.token) body.set('token', reply.token);
    try {
      const response = await fetch('/api/ko', { method: 'POST', body });
      if (!response.ok) throw new Error('preview failed');
      const result: unknown = await response.json();
      if (!result || typeof result !== 'object' || !('text' in result) || typeof result.text !== 'string') throw new Error('invalid preview');
      setReply({ text: result.text, token: 'kind' in result && result.kind === 'confirm' && 'token' in result && typeof result.token === 'string' ? result.token : undefined });
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  if (decided) return busy ? <p role="status" className="p-3 text-sm text-muted">{t('swapPending')}</p> : null;
  return <article className="rounded-control border border-line p-3 text-start">
    <div className="flex items-center gap-2">
      <span className={`grid size-8 shrink-0 place-items-center rounded-control ${item.severity === 'urgent' ? 'bg-danger-soft text-danger' : 'bg-lime-soft text-lime-ink'}`}><Icon aria-hidden className="size-4" /></span>
      <p className="min-w-0 flex-1 text-sm">{t(item.kind, { name: item.player_name })}</p>
      <button type="button" aria-label={t('dismiss')} onClick={() => onDismiss(item.key)} className="grid min-h-12 min-w-12 place-items-center rounded-control text-muted"><X aria-hidden className="size-4" /></button>
    </div>
    {swap && <div className="mt-2 space-y-2">
      <p dir={locale === 'ar' ? 'rtl' : 'ltr'} className="text-sm">{t('swapDetails', {
        from: exerciseName(item.data.from, locale), to: exerciseName(item.data.to, locale), injury: injuryName,
      })}</p>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void decide(true)} className="min-h-12 flex-1 rounded-control bg-lime text-on-lime disabled:opacity-50">{t('approve')}</button>
        <button type="button" disabled={busy} onClick={() => void decide(false)} className="min-h-12 flex-1 rounded-control border border-line disabled:opacity-50">{t('decline')}</button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{t('swapError')}</p>}
    </div>}
    {!swap && (href ? <Link href={href} className="mt-2 flex min-h-12 items-center justify-center rounded-control border border-line text-sm text-lime-ink">{t('action')}</Link>
      : !review && <button type="button" onClick={() => setReview(true)} className="mt-2 min-h-12 w-full rounded-control border border-line text-sm text-lime-ink">{t('preview')}</button>)}
    {review && <form onSubmit={event => { event.preventDefault(); void preview(Boolean(reply?.token)); }} className="mt-2 space-y-2">
      {renewal && !reply && <label className="block text-sm">{t('days')}<input type="number" min={1} max={365} required value={days} onChange={event => setDays(event.target.value)} className="mt-1 min-h-12 w-full rounded-control border border-line bg-bg px-3" /></label>}
      {reply && <p className="whitespace-pre-wrap text-sm" role="status">{reply.text}</p>}
      {reply && <button type="button" disabled={busy} onClick={() => { setReply(null); setError(false); }} className="min-h-12 w-full rounded-control border border-line text-lime-ink disabled:opacity-50">{t('restart')}</button>}
      {(!reply || reply.token || error) && <button disabled={busy} className="min-h-12 w-full rounded-control border border-line text-lime-ink disabled:opacity-50">{t(busy ? 'loading' : reply?.token ? 'confirm' : 'preview')}</button>}
      {error && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
    </form>}
  </article>;
}
