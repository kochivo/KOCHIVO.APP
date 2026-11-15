'use client';

import { Button } from '@/ui/button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Sparkles, X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { koFeedMessages as messages } from '@/features/ko-feed';
import type { KoFeedItem } from '@/features/ko-feed';
import { decideSwapOptimistically } from '@/features/ko-feed';
import { refreshFeed } from '@/features/ko-feed';
import { buttonClass } from '@/ui/button';

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

export function FeedCard({ item, onDismiss, primary = true }: { item: KoFeedItem; onDismiss: (key: string) => void; primary?: boolean }) {
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
  const injuryName = item.data.reason === 'discomfort' ? t('discomfort')
    : injury === 'knee' || injury === 'shoulder' || injury === 'lower_back' ? t(injury) : '';
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
  if (decided) return busy ? <p role="status" className="p-stack text-sm text-muted">{t('swapPending')}</p> : null;
  return <article className="rounded-control border border-line p-stack text-start">
    <div className="flex items-center gap-inline">
      <span className={`grid size-8 shrink-0 place-items-center rounded-control ${item.severity === 'urgent' ? 'bg-danger-soft text-danger' : 'bg-lime-soft text-lime-ink'}`}><Icon aria-hidden className="size-4" /></span>
      <p className="min-w-0 flex-1 text-sm">{t(item.kind, { name: item.player_name })}</p>
      {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('dismiss')} onClick={() => onDismiss(item.key)} className="grid min-h-12 min-w-12 place-items-center rounded-control text-ink"><X aria-hidden className="size-4" /></IconButton> : <button type="button" aria-label={t('dismiss')} onClick={() => onDismiss(item.key)} className="grid min-h-12 min-w-12 place-items-center rounded-control text-muted"><X aria-hidden className="size-4" /></button>}
    </div>
    {swap && <div className="mt-inline space-y-inline">
      <p dir={locale === 'ar' ? 'rtl' : 'ltr'} className="text-sm">{t('swapDetails', {
        from: exerciseName(item.data.from, locale), to: exerciseName(item.data.to, locale), injury: injuryName,
      })}</p>
      <div className="flex gap-inline">
        {captainWorkspaceEnabled() ? <Button variant={primary ? 'primary' : 'secondary'} disabled={busy} onClick={() => void decide(true)} className="min-h-12 flex-1">{t('approve')}</Button>
          : <Button type="button" disabled={busy} onClick={() => void decide(true)} variant={'primary'} block={false} className={"min-h-12 flex-1 disabled:opacity-50"}>{t('approve')}</Button>}
        <Button type="button" disabled={busy} onClick={() => void decide(false)} variant={'secondary'} block={false} className={"min-h-12 flex-1 disabled:opacity-50"}>{t('decline')}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{t('swapError')}</p>}
    </div>}
    {!swap && (href ? <Link href={href} className={buttonClass({ variant: 'secondary', block: false, className: "mt-inline flex min-h-12 items-center justify-center text-sm text-lime-ink" })}>{t('action')}</Link>
      : !review && <Button type="button" onClick={() => setReview(true)} variant={'secondary'} block={false} className={"mt-inline min-h-12 w-full text-sm text-lime-ink"}>{t('preview')}</Button>)}
    {review && <form onSubmit={event => { event.preventDefault(); void preview(Boolean(reply?.token)); }} className="mt-inline space-y-inline">
      {renewal && !reply && <label className="block text-sm">{t('days')}<input type="number" min={1} max={365} required value={days} onChange={event => setDays(event.target.value)} className="mt-inline min-h-12 w-full rounded-control border border-line bg-bg px-stack" /></label>}
      {reply && <p className="whitespace-pre-wrap text-sm" role="status">{reply.text}</p>}
      {reply && <Button type="button" disabled={busy} onClick={() => { setReply(null); setError(false); }} variant={'secondary'} block={false} className={"min-h-12 w-full text-lime-ink disabled:opacity-50"}>{t('restart')}</Button>}
      {(!reply || reply.token || error) && <Button disabled={busy} type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full text-lime-ink disabled:opacity-50"}>{t(busy ? 'loading' : reply?.token ? 'confirm' : 'preview')}</Button>}
      {error && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
    </form>}
  </article>;
}
