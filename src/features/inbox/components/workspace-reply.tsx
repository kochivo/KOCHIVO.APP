'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { VoiceRecorder, useRecorder, sendVoiceNote } from '@/features/voice-notes';
import type { WorkspaceItem } from '../workspace-types';
import { useUnsentVoiceGuard } from '../hooks/use-unsent-voice-guard';
import { workspaceMessages } from '../workspace-messages';
import { quickReplies } from '../merge';

export function WorkspaceReply({ item, reply, onDraft, onSend, onDirty }: {
  item: Exclude<WorkspaceItem, { kind: 'request' }>;
  reply: string; onDraft: (reply: string) => void;
  onSend: (reply: string, advance: boolean) => Promise<void>;
  onDirty: (canLeave: () => boolean) => void;
}) {
  const t = useT(workspaceMessages);
  const locale = useLocale();
  const suggestions = item.kind === 'form' ? quickReplies('form', locale) : [t('great'), t('food'), t('program')];
  const [voice, setVoice] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const recorder = useRecorder();
  const recording = recorder.state.status === 'recording' || recorder.state.status === 'requesting';
  const dirty = recording || recorder.state.status === 'recorded';
  const [uploaded, setUploaded] = useState<Blob | null>(null);
  const locked = useRef(false);
  const canLeave = useUnsentVoiceGuard(dirty, pending, t('unsent'));
  useEffect(() => {
    onDirty(() => !pending && canLeave());
    return () => onDirty(() => true);
  }, [onDirty, pending, canLeave]);
  async function send(advance: boolean) {
    if (locked.current || recording) return;
    locked.current = true; setPending(true); setError('');
    try {
      if (recorder.state.status === 'recorded' && uploaded !== recorder.state.blob) {
        await sendVoiceNote(await loadSupabaseBrowser(), { playerId: item.player_id, recording: recorder.state.blob,
          previewUrl: recorder.state.url, seconds: recorder.state.seconds,
          ...(item.kind === 'assessment' ? {} : { context: { kind: item.kind, id: item.id } }) });
        setUploaded(recorder.state.blob);
      }
      await onSend(reply, advance);
      recorder.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('failed')); }
    finally { locked.current = false; setPending(false); }
  }
  return <form className="space-y-3.5" onSubmit={event => { event.preventDefault(); void send(true); }}>
    <p className="text-xs text-faint">{t('quick')}</p>
    <div className="flex flex-wrap gap-2">{suggestions.map(text => <button key={text} type="button" disabled={pending}
      onClick={() => onDraft(text)} className="min-h-12 rounded-full border border-line-soft px-4 text-sm text-muted">{text}</button>)}
      <button type="button" disabled={pending || recording} aria-expanded={voice} onClick={() => setVoice(value => !value)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-soft px-4 text-sm text-muted"><Mic className="size-4" aria-hidden />{t('voice')}</button>
    </div>
    {voice && <fieldset disabled={pending || Boolean(uploaded)}><VoiceRecorder playerId={item.player_id} recorder={recorder} /></fieldset>}
    <label className="block"><span className="sr-only">{t('placeholder')}</span><textarea value={reply} onChange={event => onDraft(event.target.value)}
      placeholder={t('placeholder')} maxLength={1000} disabled={pending} className="min-h-[52px] w-full rounded-[14px] border border-line bg-transparent px-3.5 py-3 text-start text-sm placeholder:text-faint" /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <button disabled={pending || recording} className="min-h-12 w-full rounded-full bg-lime px-5 font-semibold text-on-lime disabled:opacity-50">{t(pending ? 'sending' : 'sendNext')}</button>
    <button type="button" disabled={pending || recording} onClick={() => { void send(false); }} className="min-h-12 w-full rounded-full border border-line px-5 text-sm disabled:opacity-50">{t('send')}</button>
  </form>;
}
