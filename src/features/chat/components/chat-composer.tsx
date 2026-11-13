'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Trash2 } from 'lucide-react';
import { KoSend } from '@/ui/icons/ko-send';
import { useT } from '@/core/i18n/client';
import { useRecorder, voiceNoteMessages } from '@/features/voice-notes';
import type { VoiceInput } from '../types';
import { messages } from '../messages';

export function ChatComposer({ viewer, onSendText, onSendVoice, disabled = false, playerName }: {
  viewer: 'player' | 'captain'; onSendText: (body: string) => Promise<boolean>;
  onSendVoice: (voice: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds'>) => Promise<boolean>; disabled?: boolean; playerName?: string;
}) {
  const t = useT(messages), voiceT = useT(voiceNoteMessages);
  const recorder = useRecorder();
  const { state } = recorder;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const sendAfterStop = useRef(false);
  const sending = useRef(false);
  const voice = state.status === 'recording' || state.status === 'recorded';
  const firstName = playerName?.trim().split(/\s+/)[0];
  const placeholder = viewer === 'captain' && firstName ? t('namedPlaceholder', { name: firstName }) : t(viewer === 'player' ? 'placeholder' : 'playerPlaceholder');
  const sendRecording = async () => {
    if (state.status !== 'recorded' || sending.current) return;
    sending.current = true;
    setBusy(true);
    try {
      await onSendVoice({ blob: state.blob, mimeType: state.blob.type, durationSeconds: state.seconds });
      // The thread owns the optimistic item and its retry, including failed uploads.
      recorder.reset();
    } finally { sending.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (state.status === 'recorded' && sendAfterStop.current) {
      sendAfterStop.current = false;
      void sendRecording();
    }
  });
  const send = async () => {
    if (busy || disabled) return;
    if (state.status === 'recording') { sendAfterStop.current = true; recorder.stop(); return; }
    if (state.status === 'recorded') { await sendRecording(); return; }
    if (!text.trim()) return;
    const body = text.trim();
    setText('');
    await onSendText(body);
  };
  return <div className={`fixed start-4 end-4 z-30 mx-auto max-w-lg ${viewer === 'player' ? 'bottom-24' : 'bottom-6 lg:static lg:mx-0 lg:max-w-none'}`}>
    {(state.status === 'denied' || state.status === 'unsupported') && <p role="alert" className="mb-2 rounded-full bg-surface px-4 py-2 text-xs text-danger">{voiceT(state.status === 'denied' ? 'micDenied' : 'unsupported')}</p>}
    <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex items-center gap-2">
      {voice && <button type="button" disabled={busy} aria-label={t('discard')} onClick={() => { sendAfterStop.current = false; recorder.reset(); }}
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-surface-raised text-muted"><Trash2 aria-hidden className="size-5" /></button>}
      {voice ? <div role="status" className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line-soft bg-surface px-4">
        <span aria-hidden className="size-2.5 rounded-full bg-danger" /><span dir="ltr" className="font-display text-sm">{Math.floor(state.seconds / 60)}:{String(state.seconds % 60).padStart(2, '0')}</span>
        <span className="text-[13px] text-muted">{state.status === 'recording' ? t('recording') : voiceT('voiceNotes')}</span>
      </div> : <input aria-label={placeholder} placeholder={placeholder} value={text} maxLength={1000} disabled={disabled || state.status === 'requesting'}
        onChange={event => setText(event.target.value)} className="min-h-[52px] min-w-0 flex-1 rounded-full border border-line-soft bg-surface px-4 text-sm text-ink placeholder:text-muted" />}
      {voice || text.trim() ? <button type="submit" disabled={disabled || busy} aria-label={t('send')}
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-lime text-on-lime disabled:opacity-50"><KoSend aria-hidden className="size-5 text-on-lime! [&_*]:text-on-lime!" /></button> :
        <button type="button" disabled={disabled || state.status === 'requesting'} aria-label={t('record')} onClick={() => void recorder.start()}
          className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink"><Mic aria-hidden className="size-5" /></button>}
    </form>
  </div>;
}
