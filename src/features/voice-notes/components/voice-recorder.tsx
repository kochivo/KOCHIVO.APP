'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { Mic, Send, Square, Trash2 } from 'lucide-react';
import { AudioPlayer, Button } from '@/ui';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { MAX_VOICE_SECONDS, clock } from '../audio';
import { sendVoiceNote } from '../data/voice-notes';
import { useRecorder } from '../hooks/use-recorder';
import type { VoiceContext, VoiceNote } from '../types';

export function VoiceRecorder({ playerId, context, onSent }: { playerId: string; context?: VoiceContext; onSent?: (note: VoiceNote) => void }) {
  const t = useT(messages);
  const { state, start, stop, reset } = useRecorder();
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const send = async () => {
    if (state.status !== 'recorded') return;
    setSending(true);
    setFailed(false);
    try {
      onSent?.(await sendVoiceNote(await loadSupabaseBrowser(), { playerId, recording: state.blob, seconds: state.seconds, context }));
      reset();
    } catch (error) {
      console.warn('Voice note upload failed', error);
      setFailed(true);
    } finally { setSending(false); }
  };
  return (
    <div className="space-y-3">
      {state.status === 'recording' ? <Button variant="danger" className="min-h-14 w-full gap-2" onClick={stop}>
        <Square aria-hidden className="size-5 fill-current" />{t('stop')}
        <span role="status" className="ms-2 font-display tabular-nums" dir="ltr">{clock(state.seconds)} / {clock(MAX_VOICE_SECONDS)}</span>
      </Button> : state.status === 'recorded' ? <div className="space-y-3">
        <AudioPlayer src={state.url} durationSeconds={state.seconds} playLabel={t('play')} pauseLabel={t('pause')} formatTime={clock} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="gap-2" onClick={reset} disabled={sending}><Trash2 aria-hidden className="size-5" />{t('discard')}</Button>
          <Button variant="secondary" className="gap-2" onClick={() => void send()} disabled={sending}>
            <Send aria-hidden className="size-5" />{sending ? t('sending') : t('send')}
          </Button>
        </div>
      </div> : <Button variant="secondary" className="min-h-14 w-full gap-2" onClick={() => void start()}>
        <Mic aria-hidden className="size-5 text-lime" />{t('record')}
      </Button>}
      {state.status === 'denied' && <p role="alert" className="text-sm text-warn">{t('micDenied')}</p>}
      {state.status === 'unsupported' && <p role="alert" className="text-sm text-warn">{t('unsupported')}</p>}
      {failed && <p role="alert" className="text-sm text-danger">{t('sendFailed')}</p>}
      {state.status === 'idle' && <p className="text-xs text-muted">{t('hint')}</p>}
    </div>
  );
}
