'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';
import { KoSend } from '@/ui/icons/ko-send';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { useRecorder } from '@/features/voice-notes';
import type { VoiceInput } from '@/features/chat';
import { taskMessages } from './messages';
import { Button } from '@/ui/button';
export function TaskCompose({ onSend, disabled }: { disabled: boolean;
  onSend: (body: string, voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds' | 'id'>) => Promise<boolean> }) {
  const t = useT(taskMessages), recorder = useRecorder();
  const [body, setBody] = useState('');
  const sending = useRef(false), voiceId = useRef<string | undefined>(undefined);
  const state = recorder.state;
  const recording = state.status === 'recording';
  const blocked = disabled || recording || state.status === 'requesting';
  async function send() {
    if (blocked || sending.current || (!body.trim() && state.status !== 'recorded')) return;
    sending.current = true;
    try {
      if (state.status === 'recorded') voiceId.current ??= uuidv7();
      const ok = await onSend(body, state.status === 'recorded' ? { id: voiceId.current, blob: state.blob,
        mimeType: state.blob.type, durationSeconds: state.seconds } : undefined);
      if (ok) { setBody(''); recorder.reset(); voiceId.current = undefined; }
    } finally { sending.current = false; }
  }
  return <div className="mt-stack space-y-inline">
    {(state.status === 'denied' || state.status === 'unsupported') && <p role="alert" className="text-sm text-danger">{t('voiceError')}</p>}
    {state.status === 'recorded' && <div className="flex items-center gap-inline"><audio controls src={state.url} className="min-w-0 flex-1" />
      <button disabled={disabled} aria-label={t('discard')} className={`${secondaryButtonClass} min-h-12 min-w-12`} onClick={() => { recorder.reset(); voiceId.current = undefined; }}><Trash2 aria-hidden className="mx-auto size-4" /></button></div>}
    <form className="glass flex items-center gap-inline rounded-control p-inline" onSubmit={event => { event.preventDefault(); void send(); }}>
      <button type="button" disabled={disabled || state.status === 'requesting' || state.status === 'recorded'}
        aria-label={t(recording ? 'stop' : 'mic')} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center text-muted`}
        onClick={() => recording ? recorder.stop() : void recorder.start()}>{recording ? <Square aria-hidden className="size-4" /> : <Mic aria-hidden className="size-4" />}</button>
      {recording ? <span role="status" className="min-w-0 flex-1 text-xs text-muted">{t('recording')}</span> :
        <input id="task-reply" aria-label={t('placeholder')} placeholder={t('placeholder')} maxLength={1000} value={body} disabled={disabled}
          onChange={event => setBody(event.target.value)} className={`${editableFieldClass} min-h-12 min-w-0 flex-1 bg-surface text-sm outline-none`} />}
      <Button disabled={blocked || (!body.trim() && state.status !== 'recorded')} type="submit" variant={'primary'} block={false} className={"flex min-h-12 shrink-0 items-center gap-inline px-stack text-xs font-semibold disabled:opacity-50"}>
        <KoSend aria-hidden className="size-4" />{t('send')}</Button>
    </form>
  </div>;
}
