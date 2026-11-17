'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { KoSend } from '@/ui/icons/ko-send';
import { useT } from '@/core/i18n/client';
import { useRecorder } from '@/features/voice-notes';
import type { VoiceInput } from '@/features/chat';
import { conversationMessages } from '../conversation-messages';
import { voiceDuration } from '../conversation-preview';
import { useUnsentVoiceGuard } from '../hooks/use-unsent-voice-guard';
import { Button } from '@/ui/button';

export function ConversationCompose({ onSendText, onSendVoice, onGuard }: {
  onSendText: (body: string) => Promise<boolean>;
  onSendVoice: (voice: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'>) => Promise<boolean>;
  onGuard: (guard: () => boolean) => void;
}) {
  const t = useT(conversationMessages), recorder = useRecorder();
  const [text, setText] = useState(''), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const state = recorder.state;
  const voice = state.status === 'recorded' || state.status === 'recording';
  const canLeave = useUnsentVoiceGuard(voice || state.status === 'requesting', busy, t('unsent'));
  useEffect(() => { onGuard(canLeave); return () => onGuard(() => true); }, [onGuard, canLeave]);
  async function send() {
    if (lock.current || state.status === 'recording' || state.status === 'requesting') return;
    if (state.status !== 'recorded' && !text.trim()) return;
    lock.current = true; setBusy(true);
    try {
      if (state.status === 'recorded') {
        await onSendVoice({ blob: state.blob, mimeType: state.blob.type, durationSeconds: state.seconds });
        recorder.reset();
      } else { const body = text.trim(); setText(''); await onSendText(body); }
    } finally { lock.current = false; setBusy(false); }
  }
  return <div className="space-y-stack border-t border-line-soft p-stack">
    <div aria-label={t('quick')} className="flex flex-wrap gap-inline">{(['light', 'video', 'okay'] as const).map(key => <Button key={key} type="button" disabled={busy}
      onClick={() => setText(t(key))} variant={'secondary'} block={false} className={"min-h-12 px-stack text-micro text-muted"}>{t(key)}</Button>)}</div>
    {(state.status === 'denied' || state.status === 'unsupported') && <p role="alert" className="text-xs text-danger">{t('micFailed')}</p>}
    <form className="flex items-center gap-inline" onSubmit={event => { event.preventDefault(); void send(); }}>
      <button type="button" disabled={busy || state.status === 'requesting'} aria-label={t(state.status === 'recording' ? 'stop' : 'record')}
        onClick={() => state.status === 'recording' ? recorder.stop() : void recorder.start()}
        className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center rounded-xl text-muted disabled:opacity-50`}>{state.status === 'recording' ? <Square className="size-4" aria-hidden /> : <Mic strokeWidth={1.5} className="size-4" aria-hidden />}</button>
      {voice ? <div role="status" className="min-w-0 flex-1 text-xs text-muted"><span dir="ltr">{voiceDuration(state.seconds)}</span>{state.status === 'recording' && <span className="ms-inline">{t('recording')}</span>}</div>
        : <input value={text} onChange={event => setText(event.target.value)} maxLength={1000} disabled={busy || state.status === 'requesting'}
          aria-label={t('placeholder')} placeholder={t('placeholder')} className={`${editableFieldClass} min-h-12 min-w-0 flex-1 rounded-control border border-line bg-bg px-stack text-row outline-none placeholder:text-faint`} />}
      {voice && <button type="button" disabled={busy} onClick={recorder.reset} aria-label={t('discard')} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center text-muted`}><Trash2 className="size-4" aria-hidden /></button>}
      <Button type="submit" aria-label={t('send')} disabled={busy || state.status === 'recording' || state.status === 'requesting' || (!text.trim() && state.status !== 'recorded')}
        variant={'primary'} block={false} className={"grid min-h-12 min-w-12 place-items-center disabled:opacity-50"}><KoSend className="size-4 text-on-lime! [&_*]:text-on-lime!" aria-hidden /></Button>
    </form>
  </div>;
}
