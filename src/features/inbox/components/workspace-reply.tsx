'use client';
import { KoMic } from '@/ui/icons/ko-mic';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { VoiceRecorder, useRecorder, sendVoiceNote } from '@/features/voice-notes';
import type { WorkspaceItem } from '../workspace-types';
import { useUnsentVoiceGuard } from '../hooks/use-unsent-voice-guard';
import { workspaceMessages } from '../workspace-messages';
import { quickReplies } from '../merge';
import { Button } from '@/ui/button';

export function WorkspaceReply({ item, reply, onDraft, onSend, onDirty, blocked = false }: {
  item: Exclude<WorkspaceItem, { kind: 'request' }>;
  reply: string; onDraft: (reply: string) => void;
  onSend: (reply: string, advance: boolean) => Promise<void>;
  onDirty: (canLeave: () => boolean) => void;
  blocked?: boolean;
}) {
  const MicIcon = captainWorkspaceEnabled() ? KoMic : Mic;
  const t = useT(workspaceMessages);
  const locale = useLocale();
  const suggestions = item.kind === 'form' ? quickReplies('form', locale) : [t('great'), t('food'), t('program'), t('sleepEarly')];
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
  async function send(advance: boolean, withoutReply = false) {
    if (locked.current || recording || blocked) return;
    if (withoutReply && !canLeave()) return;
    locked.current = true; setPending(true); setError('');
    try {
      if (!withoutReply && recorder.state.status === 'recorded' && uploaded !== recorder.state.blob) {
        await sendVoiceNote(await loadSupabaseBrowser(), { playerId: item.player_id, recording: recorder.state.blob,
          previewUrl: recorder.state.url, seconds: recorder.state.seconds,
          ...(item.kind === 'assessment' ? {} : { context: { kind: item.kind, id: item.id } }) });
        setUploaded(recorder.state.blob);
      }
      await onSend(withoutReply ? '' : reply, advance);
      recorder.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('failed')); }
    finally { locked.current = false; setPending(false); }
  }
  return <form className="space-y-3 border-t border-line px-5 py-4" onSubmit={event => { event.preventDefault(); void send(true); }}>
    <div className="flex flex-wrap gap-2">{suggestions.map(text => <button key={text} type="button" disabled={pending}
      onClick={() => onDraft(text.replace(/^\+ /, ''))} className="min-h-12 rounded-full bg-surface-raised px-3 text-[12.5px] text-muted">{text}</button>)}
    </div>
    {voice && <fieldset disabled={pending || Boolean(uploaded)}><VoiceRecorder playerId={item.player_id} recorder={recorder} /></fieldset>}
    <label className="block"><span className="sr-only">{t('placeholder')}</span><textarea value={reply} onChange={event => onDraft(event.target.value)}
      placeholder={t('placeholder')} maxLength={1000} disabled={pending} className="min-h-[76px] w-full rounded-2xl border border-line bg-transparent px-3.5 py-3 text-start text-sm placeholder:text-faint" /></label>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap items-center gap-2.5">
      <Button type="button" disabled={pending || recording} aria-label={t('voice')} aria-expanded={voice} onClick={() => setVoice(value => !value)} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center text-muted"}><MicIcon className="size-5" strokeWidth={1.5} aria-hidden /></Button>
      <span className="me-auto text-xs text-faint">{t('voice')}</span>
      <Button type="button" disabled={pending || recording || blocked} onClick={() => { void send(true, true); }} variant={'secondary'} block={false} className={"min-h-12 px-3.5 text-[12.5px] disabled:opacity-50"}>{t('noReply')}</Button>
      <Button disabled={pending || recording || blocked} type="submit" variant={'primary'} block={false} className={"min-h-12 px-5 font-semibold disabled:opacity-50"}>{t(pending ? 'sending' : 'sendNext')}</Button>
    </div>
  </form>;
}
