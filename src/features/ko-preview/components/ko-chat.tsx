'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { uuidv7 } from '@/core/offline/ids';
import { IconButton } from '@/ui/icon-button';
import { Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Camera, Mic, Square, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
// The feed pulls the whole player data layer; load it only when the player opens it.
const KoFeed = lazy(() => import('./ko-feed').then(module => ({ default: module.KoFeed })));
import { KoAvatar } from '@/ui/ko-avatar';
import { KoMessage } from './ko-message';
import { KoTyping } from './ko-typing';
import { KoActionCard } from './ko-action-card';
import { KoCreditMeter } from './ko-credit-meter';
import { KoQuickButtons } from './ko-quick-buttons';
import { KoUpgradeCard } from './ko-upgrade-card';
import { chatActions, latestPendingAction, useKoActions } from '../hooks/use-ko-actions';
import { koHistoryLimit, useKoHistory } from '../hooks/use-ko-history';
import { contextFromPath } from '../context';
import type { KoContext } from '../context';
import { canSubmitKoDraft } from '../composer-draft';
import { suggestionsFor } from '../suggestions';
import { useLocale, useT } from '@/core/i18n/client';
import { koMaxText } from '@/features/ko-core';
import { useKoRecorder } from '../hooks/use-ko-recorder';
import { messages } from '../messages';
import type { KoExpression, KoRole } from '../policy';
import type { AccountReply, KoReply } from '@/features/ko-core';
import { Button } from '@/ui/button';

export function KoChat({ role, onExpression, account = false, context: suppliedContext, userId, header, sheet = false, feed, now = Date.now }: {
  role: KoRole; onExpression?: (value: KoExpression) => void; account?: boolean; context?: KoContext | null;
  userId?: string; header?: HTMLElement | null; sheet?: boolean; feed?: ReactNode; now?: () => number;
}) {
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const recorder = useKoRecorder(setClip, () => setError(t('micError')));
  const actions = useKoActions(locale, t('chatError'));
  const resetConversation = useCallback(() => {
    active.current?.abort();
    setBusy(false);
    setSent(false);
    onExpression?.('welcome');
  }, [onExpression]);
  const { history, setHistory, clearHistory } = useKoHistory(account ? userId : undefined, actions.states, resetConversation, now);
  const cards = history.flatMap(entry => entry.actions ?? []);
  const pending = history.at(-1)?.actions?.some(action => !action.restoredState && !actions.states[action.id]);

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
  const fill = account || sheet;
  useEffect(() => {
    const element = log.current;
    if (!element) return;
    const latest = () => { element.scrollTop = element.scrollHeight; };
    if (fill && !history.length && !busy) { element.scrollTop = 0; return; }
    latest();
    if (!fill || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(latest);
    observer.observe(element);
    return () => observer.disconnect();
  }, [history, busy, fill]);

  async function submit(event?: FormEvent<HTMLFormElement>, suggestion?: string) {
    event?.preventDefault();
    const prompt = (suggestion ?? draft).trim();
    if (active.current || recorder.status !== 'idle' || !canSubmitKoDraft(prompt, clip, photo)) return;
    if (account && !clip && !photo && /^(?:(?:تمام\s+)?نف[ّ]?ذ|confirm|approve)[.!؟]?$/iu.test(prompt)) {
      const latest = latestPendingAction(cards, actions.states);
      if (latest) {
        setDraft('');
        setError('');
        await actions.confirm(latest);
        return;
      }
    }
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
      if (photo) body.set('photo', photo);
    } else body.set('role', role);
    if (clip) body.set('audio', clip, 'voice-note');
    else if (prompt) body.set('text', prompt);
    try {
      const response = await fetch(account ? '/api/ko' : '/dev/ko/chat', { method: 'POST', body, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!response.ok) {
        const failure = await response.json().catch(() => null) as { error?: string } | null;
        if (controller.signal.aborted) return;
        setError(t(failure?.error === 'configuration' ? 'chatSetup' : 'chatError'));
        onExpression?.('welcome');
        return;
      }
      const result = await response.json() as KoReply | AccountReply;
      if (controller.signal.aborted) return;
      const answer = result.kind === 'message' || result.kind === 'confirm' ? result.text
        : result.kind === 'updated' || result.kind === 'read'
        ? t(result.kind === 'updated' ? 'chatUpdated' : 'chatRead', {
          sets: t('chatReadSets', { n: result.sets, sets: result.sets }),
          reps: t('chatReadReps', { n: result.reps, reps: result.reps }),
        })
        : result.kind === 'clarify' ? result.question : t('chatUnsupported');
      const newCards = account && (result.kind === 'message' || result.kind === 'confirm') ? chatActions(result) : undefined;
      const timestamp = now();
      const questionId = uuidv7(timestamp);
      const answerId = uuidv7(timestamp);
      setHistory(entries => [...entries, { id: questionId, speaker: 'user' as const, text: clip ? t('voiceNote') : photo ? `${t('mealPhoto')} ${prompt}`.trim() : prompt,
        contextText: clip ? '' : prompt, timestamp },
        { id: answerId, speaker: 'ko' as const, text: answer, timestamp, actions: newCards, ...(result.kind === 'message' && {
          quick: result.quick, upgrade: result.upgrade, sources: result.sources,
        }) }].slice(-(userId ? koHistoryLimit : 30)));
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
  const suggestions = suggestionsFor(role, context, sent || Boolean(userId && history.length));
  const phoneButton = sheet ? 'max-lg:min-h-14! max-lg:min-w-14 shrink-0' : '';
  return <div data-ko-chat className={fill ? 'flex min-h-0 flex-1 flex-col' : undefined}>
    {account && userId && header && history.length > 0 && createPortal(
      <Button type="button" variant="ghost" className="min-h-12 shrink-0 text-xs" aria-label={t('clearChat')}
        onClick={clearHistory}>{t('clearChat')}</Button>, header)}
    {account && context && <div className="flex shrink-0 items-center gap-inline border-b border-line px-page-x text-sm text-muted">
      <span>{t(`context.${context.screen}`)}</span>
      {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></IconButton> : <button type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></button>}
    </div>}
    {!sheet && showFeed && <Suspense fallback={<KoTyping />}><KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} /></Suspense>}
    <div ref={log} role="log" aria-label={t(account ? 'accountChatTitle' : 'chatTitle')} className={`flex flex-col overflow-y-auto text-sm ${fill ? 'min-h-0 flex-1 overscroll-contain' : 'max-h-60 min-h-32'}`}>
      {feed}
      {sheet && showFeed && <Suspense fallback={<KoTyping />}><KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} /></Suspense>}
      <div className="flex flex-col gap-stack p-card">
        {account && <KoCreditMeter key={actions.revision} role={role} />}
        {(!userId || history.length === 0) && <KoMessage speaker="ko" text={t(account
          ? role === 'captain' ? 'accountCaptain' : 'accountPlayer'
          : role === 'captain' ? 'chatCaptain' : 'chatPlayer')} sheet={sheet} />}
        {history.map((entry, index) => <Fragment key={entry.id}>
          <KoMessage speaker={entry.speaker} text={entry.text} sources={entry.sources} sheet={sheet}>
            {entry.quick?.length ? <KoQuickButtons quick={entry.quick} disabled={busy || recorder.status !== 'idle' || Boolean(clip || photo)}
              send={text => void submit(undefined, text)} /> : role === 'captain' && entry.upgrade ? <KoUpgradeCard upgrade={entry.upgrade} /> : null}
          </KoMessage>
          {account && entry.actions?.map((action, position) => {
            const state = actions.states[action.id];
            const restored = action.restoredState;
            const upgrade = state?.kind === 'failed' ? state.upgrade : undefined;
            return <Fragment key={action.id}><KoActionCard action={action} number={position + 1}
              state={restored?.kind === 'expired' ? undefined : restored ?? state} busy={busy || recorder.status !== 'idle' || Boolean(clip || photo)}
              focus={position === 0 && index === history.length - 1}
              onConfirm={() => actions.confirm(action)} onCancel={() => actions.cancel(action)} />
              {role === 'captain' && upgrade && <KoUpgradeCard upgrade={upgrade} />}
            </Fragment>;
          })}
        </Fragment>)}
        {busy && <KoTyping />}
      </div>
    </div>
    {suggestions.length > 0 && <div className="flex shrink-0 flex-wrap gap-inline px-page-x pb-stack" role="group" aria-label={t('suggestions')}>
      {suggestions.map(key => <Button key={key} type="button" disabled={busy || Boolean(clip) || recorder.status !== 'idle' || (key === 'suggest.player' && !contextName)}
        variant={'secondary'} block={false} className={"min-h-12 rounded-chip px-stack text-start text-sm text-lime-ink disabled:opacity-50"}
        onClick={() => {
          if (key === 'suggest.today') { setShowFeed(account); setSent(true); return; }
          void submit(undefined, t(key, { name: contextName }));
        }}>{t(key, { name: contextName || t('context.player') })}</Button>)}
    </div>}
    <form onSubmit={submit} className={`shrink-0 border-t border-line p-stack ${sheet ? 'max-lg:pb-[calc(var(--spacing-stack)+var(--safe-bottom))]' : ''}`}>
      {account && role === 'player' && <input ref={camera} type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || clip || recorder.status !== 'idle') return;
          if (file.size > 3_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError(t('photoError')); return; }
          setError('');
          setPhoto(file);
        }} />}
      {photo && <div className="mb-inline flex items-center justify-between gap-inline rounded-control border border-line ps-stack text-sm">
        <span>{t('photoReady')}</span>
        {captainWorkspaceEnabled() ? <IconButton type="button" disabled={busy} aria-label={t('discardPhoto')} onClick={() => setPhoto(null)}
          className="border border-danger/40 text-danger! grid min-h-12 min-w-12 place-items-center text-ink"><X aria-hidden className="size-4" /></IconButton> : <button type="button" disabled={busy} aria-label={t('discardPhoto')} onClick={() => setPhoto(null)}
          className="grid min-h-12 min-w-12 place-items-center text-muted"><X aria-hidden className="size-4" /></button>}
      </div>}
      <div className="flex items-center gap-inline">
        {clip ? <div className="flex min-w-0 flex-1 items-center justify-between gap-inline rounded-control bg-bg ps-stack text-sm">
          <span>{t('voiceOnlyReady')}</span>
          {captainWorkspaceEnabled() ? <IconButton type="button" disabled={busy} aria-label={t('discardVoice')} onClick={() => setClip(null)} className="border border-danger/40 text-danger! grid min-h-12 min-w-12 place-items-center text-ink"><X aria-hidden className="size-4" /></IconButton> : <button type="button" disabled={busy} aria-label={t('discardVoice')} onClick={() => setClip(null)} className="grid min-h-12 min-w-12 place-items-center text-muted"><X aria-hidden className="size-4" /></button>}
        </div> : <input dir="auto" value={draft} maxLength={koMaxText} onChange={event => setDraft(event.target.value)}
          aria-label={t('chatInput')} placeholder={t(recording ? 'voiceRecording' : 'chatInput')} disabled={busy || recorder.status !== 'idle'}
          className={`min-h-12 min-w-0 flex-1 rounded-full border border-line bg-bg px-page-x text-base outline-offset-2 placeholder:text-muted ${sheet ? 'max-lg:min-h-14!' : ''}`} />}
        {account && role === 'player' && !clip && !photo && <Button type="button" disabled={busy || recorder.status !== 'idle'}
          aria-label={t('mealPhoto')} onClick={() => camera.current?.click()}
          variant={'secondary'} block={false} className={`grid min-h-12 min-w-12 place-items-center text-lime-ink disabled:opacity-50 ${phoneButton}`}><Camera aria-hidden className="size-5" /></Button>}
        {!clip && !photo && <button type="button" disabled={busy || recorder.status === 'starting' || Boolean(draft)}
          onClick={() => { setError(''); if (recording) recorder.stop(); else void recorder.start(); }}
          aria-label={t(recording ? 'stopVoice' : 'recordVoice')} aria-pressed={recording}
          className={`grid min-h-12 min-w-12 place-items-center rounded-control border border-line text-lime-ink disabled:opacity-50 ${phoneButton}`}>
          {recording ? <Square aria-hidden className="size-4" /> : <Mic aria-hidden className="size-5" />}
        </button>}
        <Button type="submit" aria-label={t(clip ? 'sendVoiceOnly' : 'chatSend')} disabled={busy || recorder.status !== 'idle' || !canSubmitKoDraft(draft, clip, photo)}
          variant={(captainWorkspaceEnabled()) ? 'secondary' : (pending) ? 'secondary' : 'primary'} block={false} className={`grid min-h-12 min-w-12 place-items-center disabled:opacity-50 ${captainWorkspaceEnabled() || pending ? 'text-muted' : ''} ${phoneButton}`}><ArrowUp aria-hidden className="size-5" /></Button>
      </div>
      {error && <p role="alert" className="mt-inline text-xs text-muted">{error}</p>}
      <p className="mt-inline text-xs text-muted">{t(account ? 'accountPrivacy' : 'chatPrivacy')}</p>
    </form>
  </div>;
}
