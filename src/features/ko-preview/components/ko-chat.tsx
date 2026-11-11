'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, Camera, Mic, Square, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { KoFeed } from './ko-feed';
import { KoAvatar } from '@/ui/ko-avatar';
import { KoMessage } from './ko-message';
import { KoTyping } from './ko-typing';
import { KoConfirm, createApproval } from './ko-confirm';
import { contextFromPath } from '../context';
import type { KoContext } from '../context';
import { suggestionsFor } from '../suggestions';
import { useLocale, useT } from '@/core/i18n/client';
import { koMaxText } from '@/features/ko-core';
import { useKoRecorder } from '../hooks/use-ko-recorder';
import { messages } from '../messages';
import type { KoExpression, KoRole } from '../policy';
import type { KoReply } from '@/features/ko-core';
import type { AccountReply } from '@/features/ko-core';

type Entry = { speaker: 'user' | 'ko'; text: string; contextText?: string };

export function KoChat({ role, onExpression, account = false, context: suppliedContext }: { role: KoRole; onExpression?: (value: KoExpression) => void; account?: boolean; context?: KoContext | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const pathname = usePathname();
  const [dropped, setDropped] = useState(false);
  const context = dropped ? null : suppliedContext === undefined ? contextFromPath(pathname ?? '/') : suppliedContext;
  const [contextName, setContextName] = useState('');
  const [showFeed, setShowFeed] = useState(false);
  const [sent, setSent] = useState(false);
  const [draft, setDraft] = useState('');
  const [clip, setClip] = useState<Blob | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [approval, setApproval] = useState<ReturnType<typeof createApproval> | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const recorder = useKoRecorder(setClip, () => setError(t('micError')));

  useEffect(() => () => active.current?.abort(), []);
  const serializedContext = JSON.stringify(context);
  useEffect(() => {
    if (!account || context?.screen !== 'player') return;
    const controller = new AbortController();
    const body = new FormData();
    body.set('context', serializedContext);
    body.set('contextOnly', '1');
    void fetch('/api/ko', { method: 'POST', body, signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<{ name: string | null }> : null)
      .then(result => { if (!controller.signal.aborted) setContextName(result?.name ?? ''); })
      .catch(() => { if (!controller.signal.aborted) setContextName(''); });
    return () => controller.abort();
  }, [account, serializedContext, context?.screen]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [history, busy]);

  async function submit(event?: FormEvent<HTMLFormElement>, suggestion?: string) {
    event?.preventDefault();
    const prompt = (suggestion ?? draft).trim();
    if (active.current || recorder.status !== 'idle' || (!prompt && !clip && !photo)) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setSent(true);
    setError('');
    onExpression?.('thinking');
    const body = new FormData();
    if (context) body.set('context', JSON.stringify(context));
    if (account) {
      // Keep this text-only projection local: the agent's public runtime API is server-only.
      const turns = history.map(entry => ({ role: entry.speaker, text: entry.contextText ?? entry.text }))
        .filter(entry => entry.text.length > 0).slice(-6).map(entry => ({ ...entry, text: entry.text.slice(0, 500) }));
      while (turns.reduce((sum, turn) => sum + turn.text.length, 0) > 2000) turns.shift();
      body.set('history', JSON.stringify(turns));
      body.set('locale', locale);
      const confirming = !clip && !photo && /^(?:(?:تمام\s+)?نف[ّ]?ذ|confirm|approve)[.!؟]?$/iu.test(prompt);
      const token = confirming ? approval?.take(Date.now()) : null;
      if (token) body.set('token', token);
      approval?.clear();
      setApproval(null);
      if (photo) body.set('photo', photo);
    } else body.set('role', role);
    if (clip) body.set('audio', clip, 'voice-note');
    else if (prompt) body.set('text', prompt);
    try {
      const response = await fetch(account ? '/api/ko' : '/dev/ko/chat', { method: 'POST', body, signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        setError(t(failure?.error === 'configuration' ? 'chatSetup' : 'chatError'));
        onExpression?.('welcome');
        return;
      }
      const result = await response.json() as KoReply | AccountReply;
      const answer = result.kind === 'message' || result.kind === 'confirm' ? result.text
        : result.kind === 'updated' || result.kind === 'read'
        ? t(result.kind === 'updated' ? 'chatUpdated' : 'chatRead', { sets: result.sets, reps: result.reps })
        : result.kind === 'clarify' ? result.question : t('chatUnsupported');
      setApproval(account && result.kind === 'confirm' ? createApproval(result.token, Date.now()) : null);
      setHistory(entries => [...entries, { speaker: 'user' as const, text: clip ? t('voiceNote') : photo ? `${t('mealPhoto')} ${prompt}`.trim() : prompt,
        contextText: clip ? '' : prompt },
        { speaker: 'ko' as const, text: answer }].slice(-30));
      setDraft('');
      setClip(null);
      setPhoto(null);
      onExpression?.(result.kind === 'updated' ? 'cheer' : 'welcome');
    } catch {
      if (!controller.signal.aborted) {
        setError(t('chatError'));
        onExpression?.('welcome');
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      active.current = null;
    }
  }

  const recording = recorder.status === 'recording';
  return <div data-ko-chat>
    {account && context && <div className="flex items-center gap-2 border-b border-line px-4 text-sm text-muted">
      <span>{t(`context.${context.screen}`)}</span>
      <button type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></button>
    </div>}
    {showFeed && <KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} />}
    <div ref={log} role="log" aria-label={t(account ? 'accountChatTitle' : 'chatTitle')} className="flex max-h-60 min-h-32 flex-col gap-3 overflow-y-auto p-4 text-sm">
      <KoMessage speaker="ko" text={t(account
        ? role === 'captain' ? 'accountCaptain' : 'accountPlayer'
        : role === 'captain' ? 'chatCaptain' : 'chatPlayer')} />
      {history.map((entry, index) => <KoMessage key={index} {...entry} />)}
      {account && approval && <KoConfirm approval={approval} busy={busy || recorder.status !== 'idle' || Boolean(clip || photo)}
        onConfirm={() => { void submit(undefined, t('confirmAction')); }}
        onCancel={() => { approval.clear(); setApproval(null); setHistory(entries => [...entries, { speaker: 'ko' as const, text: t('confirmCancelled') }].slice(-30)); }} />}
      {busy && <KoTyping />}
    </div>
    {suggestionsFor(role, context, sent).length > 0 && <div className="flex flex-wrap gap-2 px-4 pb-3" role="group" aria-label={t('suggestions')}>
      {suggestionsFor(role, context, sent).map(key => <button key={key} type="button" disabled={busy || recorder.status !== 'idle' || (key === 'suggest.player' && !contextName)}
        className="min-h-12 rounded-chip border border-line px-3 text-start text-sm text-lime-ink disabled:opacity-50"
        onClick={() => {
          if (key === 'suggest.today') { setShowFeed(account); setSent(true); return; }
          void submit(undefined, t(key, { name: contextName }));
        }}>{t(key, { name: contextName || t('context.player') })}</button>)}
    </div>}
    <form onSubmit={submit} className="border-t border-line p-3">
      {account && role === 'player' && <input ref={camera} type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          if (file.size > 3_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(t('photoError')); return; }
          setError('');
          setPhoto(file);
        }} />}
      {photo && <div className="mb-2 flex items-center justify-between gap-2 rounded-control border border-line ps-3 text-sm">
        <span>{t('photoReady')}</span>
        <button type="button" disabled={busy} aria-label={t('discardPhoto')} onClick={() => setPhoto(null)}
          className="grid min-h-12 min-w-12 place-items-center text-muted"><X aria-hidden className="size-4" /></button>
      </div>}
      <div className="flex items-center gap-2">
        {clip ? <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-control bg-bg ps-3 text-sm">
          <span>{t('voiceReady')}</span>
          <button type="button" disabled={busy} aria-label={t('discardVoice')} onClick={() => setClip(null)} className="grid min-h-12 min-w-12 place-items-center text-muted"><X aria-hidden className="size-4" /></button>
        </div> : <input dir="auto" value={draft} maxLength={koMaxText} onChange={event => setDraft(event.target.value)}
          aria-label={t('chatInput')} placeholder={t(recording ? 'voiceRecording' : 'chatInput')} disabled={busy || recorder.status !== 'idle'}
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 text-base outline-offset-2 placeholder:text-muted" />}
        {account && role === 'player' && !clip && !photo && <button type="button" disabled={busy || recorder.status !== 'idle'}
          aria-label={t('mealPhoto')} onClick={() => camera.current?.click()}
          className="grid min-h-12 min-w-12 place-items-center rounded-control border border-line text-lime-ink disabled:opacity-50"><Camera aria-hidden className="size-5" /></button>}
        {!clip && !photo && <button type="button" disabled={busy || recorder.status === 'starting' || Boolean(draft.trim())}
          onClick={() => { setError(''); if (recording) recorder.stop(); else void recorder.start(); }}
          aria-label={t(recording ? 'stopVoice' : 'recordVoice')} aria-pressed={recording}
          className="grid min-h-12 min-w-12 place-items-center rounded-control border border-line text-lime-ink disabled:opacity-50">
          {recording ? <Square aria-hidden className="size-4" /> : <Mic aria-hidden className="size-5" />}
        </button>}
        <button type="submit" aria-label={t('chatSend')} disabled={busy || recorder.status !== 'idle' || (!clip && !photo && !draft.trim())}
          className={`grid min-h-12 min-w-12 place-items-center rounded-full disabled:opacity-50 ${approval ? 'border border-line text-muted' : 'bg-lime text-on-lime'}`}><ArrowUp aria-hidden className="size-5" /></button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-muted">{error}</p>}
      <p className="mt-2 text-xs text-muted">{t(account ? 'accountPrivacy' : 'chatPrivacy')}</p>
    </form>
  </div>;
}
