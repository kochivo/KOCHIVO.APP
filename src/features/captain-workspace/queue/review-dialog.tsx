'use client';
import { IconButton } from '@/ui/icon-button';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { CheckinDetail, FormCheckDetail, ReplyBox, reviewItem, useUnsentVoiceGuard } from '@/features/inbox';
import type { InboxItem, TriageInputs } from '@/features/inbox';
import { VoiceRecorder, useRecorder, sendVoiceNote } from '@/features/voice-notes';
import { messages } from './messages';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
export function ReviewDialog({ item, inputs, now, onClose, onReviewed }: {
  item: InboxItem; inputs: TriageInputs; now: Date; onClose: () => void;
  onReviewed: (item: InboxItem, commit: () => Promise<void>, advance: boolean) => Promise<void>;
}) {
  const t = useT(messages);
  const success = useT(successMessages), toast = useToast();
  const recorder = useRecorder();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState<Blob | null>(null);
  const busy = useRef(false);
  const recording = recorder.state.status === 'recording' || recorder.state.status === 'requesting';
  const dirty = recording || recorder.state.status === 'recorded';
  const canLeave = useUnsentVoiceGuard(dirty, pending, t('unsentVoice'));
  function close() { if (!pending && canLeave()) { recorder.reset(); onClose(); } }
  async function send(reply: string, advance = false) {
    if (busy.current || recording) return;
    busy.current = true; setPending(true); setError('');
    try {
      if (recorder.state.status === 'recorded' && uploaded !== recorder.state.blob) {
        await sendVoiceNote(await loadSupabaseBrowser(), { playerId: item.player_id,
          recording: recorder.state.blob, previewUrl: recorder.state.url, seconds: recorder.state.seconds,
          context: { kind: item.kind, id: item.id } });
        setUploaded(recorder.state.blob);
      }
      await onReviewed({ ...item, reply: reply.trim() || null, reviewed_at: new Date().toISOString() }, async () => {
        const result = await reviewItem({ kind: item.kind, id: item.id, reply });
        if (result.error) throw new Error(result.error);
      }, advance);
      recorder.reset();
      toast.success({ title: success('replyNamed', { name: item.player_name }), detail: success('form', { name: item.kind === 'form' ? item.exercise_name : t('checkin') }), icon: 'form' });
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('error')); }
    finally { busy.current = false; setPending(false); }
  }
  return <ResponsiveDialog modal openerId={`queue-${item.kind}-${item.id}`} fallbackId="queue-heading" onDismiss={close}
    aria-label={item.player_name} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-card bg-bg p-6 text-ink backdrop:bg-bg/80">
    <header className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">{item.player_name}</h2>
      <IconButton onClick={close} aria-label={t('close')} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden /></IconButton></header>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {item.kind === 'form' ? <FormCheckDetail item={item} /> : <CheckinDetail item={item} history={inputs.history} dailyChecks={inputs.dailyChecks} now={now} />}
    {item.reviewed_at ? <div className="glass rounded-card p-4"><p className="text-muted">{t('reviewedReply')}</p><p>{item.reply || t('noReply')}</p></div> : <>
      <ReplyBox item={item} onSend={reply => send(reply)} onSendNext={reply => send(reply, true)} disabled={pending || recording} />
      <section className="space-y-3"><h3 className="font-bold">{t('voiceReply')}</h3><fieldset disabled={pending || Boolean(uploaded)}>
        <VoiceRecorder playerId={item.player_id} recorder={recorder} />
      </fieldset></section>
    </>}
  </ResponsiveDialog>;
}
