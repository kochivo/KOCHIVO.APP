'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, Camera, Mic, Square, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { KoFeed } from './ko-feed';
import { KoAvatar } from '@/ui/ko-avatar';
import { KoMessage } from './ko-message';
import { KoTyping } from './ko-typing';
import { KoActionCard } from './ko-action-card';
import { KoCreditMeter } from './ko-credit-meter';
import { KoQuickButtons } from './ko-quick-buttons';
import { KoUpgradeCard } from './ko-upgrade-card';
import { chatActions, latestPendingAction, useKoActions } from '../hooks/use-ko-actions';
import type { ChatAction } from '../hooks/use-ko-actions';
import { contextFromPath } from '../context';
import type { KoContext } from '../context';
import { canSubmitKoDraft } from '../composer-draft';
import { suggestionsFor } from '../suggestions';
import { useLocale, useT } from '@/core/i18n/client';
import { koMaxText } from '@/features/ko-core';
import { useKoRecorder } from '../hooks/use-ko-recorder';
import { messages } from '../messages';
import type { KoExpression, KoRole } from '../policy';
import type { KoReply } from '@/features/ko-core';
import type { AccountReply } from '@/features/ko-core';
import { Button } from '@/ui/button';

type Extras = Pick<Extract<AccountReply, { kind: 'message' }>, 'quick' | 'upgrade'>;
type Entry = Extras & { speaker: 'user' | 'ko'; text: string; contextText?: string; actions?: ChatAction[] };

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
  const [history, setHistory] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const recorder = useKoRecorder(setClip, () => setError(t('micError')));
  const actions = useKoActions(locale, t('chatError'));
  const cards = history.flatMap(entry => entry.actions ?? []);
  const pending = history.at(-1)?.actions?.some(action => !actions.states[action.id]);

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
      const newCards = account && (result.kind === 'message' || result.kind === 'confirm') ? chatActions(result) : undefined;
      setHistory(entries => [...entries, { speaker: 'user' as const, text: clip ? t('voiceNote') : photo ? `${t('mealPhoto')} ${prompt}`.trim() : prompt,
        contextText: clip ? '' : prompt },
        { speaker: 'ko' as const, text: answer, actions: newCards, ...(result.kind === 'message' && {
          quick: result.quick, upgrade: result.upgrade,
        }) }].slice(-30));
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
    {account && context && <div className="flex items-center gap-inline border-b border-line px-page-x text-sm text-muted">
      <span>{t(`context.${context.screen}`)}</span>
      {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></IconButton> : <button type="button" aria-label={t('context.remove')} onClick={() => setDropped(true)} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-4" /></button>}
    </div>}
    {showFeed && <KoFeed avatar={value => <KoAvatar expression={value} className="size-10" />} />}
    <div ref={log} role="log" aria-label={t(account ? 'accountChatTitle' : 'chatTitle')} className="flex max-h-60 min-h-32 flex-col gap-stack overflow-y-auto p-card text-sm">
      {account && <KoCreditMeter key={actions.revision} role={role} />}
      <KoMessage speaker="ko" text={t(account
        ? role === 'captain' ? 'accountCaptain' : 'accountPlayer'
        : role === 'captain' ? 'chatCaptain' : 'chatPlayer')} />
      {history.map((entry, index) => <Fragment key={entry.actions?.[0]?.id ?? index}>
        <KoMessage speaker={entry.speaker} text={entry.text}>
          {entry.quick?.length ? <KoQuickButtons quick={entry.quick} disabled={busy || recorder.status !== 'idle' || Boolean(clip || photo)}
            send={text => void submit(undefined, text)} /> : role === 'captain' && entry.upgrade ? <KoUpgradeCard upgrade={entry.upgrade} /> : null}
        </KoMessage>
        {account && entry.actions?.map((action, position) => {
          const state = actions.states[action.id];
          const upgrade = state?.kind === 'failed' ? state.upgrade : undefined;
          return <Fragment key={action.id}><KoActionCard action={action} number={position + 1}
          state={state} busy={busy || recorder.status !== 'idle' || Boolean(clip || photo)}
          focus={position === 0 && index === history.length - 1}
          onConfirm={() => actions.confirm(action)} onCancel={() => actions.cancel(action)} />
          {role === 'captain' && upgrade && <KoUpgradeCard upgrade={upgrade} />}
          </Fragment>;
        })}
      </Fragment>)}
      {busy && <KoTyping />}
    </div>
    {suggestionsFor(role, context, sent).length > 0 && <div className="flex flex-wrap gap-inline px-page-x pb-stack" role="group" aria-label={t('suggestions')}>
      {suggestionsFor(role, context, sent).map(key => <Button key={key} type="button" disabled={busy || Boolean(clip) || recorder.status !== 'idle' || (key === 'suggest.player' && !contextName)}
        variant={'secondary'} block={false} className={"min-h-12 rounded-chip px-stack text-start text-sm text-lime-ink disabled:opacity-50"}
        onClick={() => {
          if (key === 'suggest.today') { setShowFeed(account); setSent(true); return; }
          void submit(undefined, t(key, { name: contextName }));
        }}>{t(key, { name: contextName || t('context.player') })}</Button>)}
    </div>}
    <form onSubmit={submit} className="border-t border-line p-stack">
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
          className="min-h-12 min-w-0 flex-1 rounded-full border border-line bg-bg px-page-x text-base outline-offset-2 placeholder:text-muted" />}
        {account && role === 'player' && !clip && !photo && <Button type="button" disabled={busy || recorder.status !== 'idle'}
          aria-label={t('mealPhoto')} onClick={() => camera.current?.click()}
          variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center text-lime-ink disabled:opacity-50"}><Camera aria-hidden className="size-5" /></Button>}
        {!clip && !photo && <button type="button" disabled={busy || recorder.status === 'starting' || Boolean(draft)}
          onClick={() => { setError(''); if (recording) recorder.stop(); else void recorder.start(); }}
          aria-label={t(recording ? 'stopVoice' : 'recordVoice')} aria-pressed={recording}
          className="grid min-h-12 min-w-12 place-items-center rounded-control border border-line text-lime-ink disabled:opacity-50">
          {recording ? <Square aria-hidden className="size-4" /> : <Mic aria-hidden className="size-5" />}
        </button>}
        <Button type="submit" aria-label={t(clip ? 'sendVoiceOnly' : 'chatSend')} disabled={busy || recorder.status !== 'idle' || !canSubmitKoDraft(draft, clip, photo)}
          variant={(captainWorkspaceEnabled()) ? 'secondary' : (pending) ? 'secondary' : 'primary'} block={false} className={`grid min-h-12 min-w-12 place-items-center disabled:opacity-50 ${captainWorkspaceEnabled() ? "text-muted" : pending ? "text-muted" : ""} `}><ArrowUp aria-hidden className="size-5" /></Button>
      </div>
      {error && <p role="alert" className="mt-inline text-xs text-muted">{error}</p>}
      <p className="mt-inline text-xs text-muted">{t(account ? 'accountPrivacy' : 'chatPrivacy')}</p>
    </form>
  </div>;
}
