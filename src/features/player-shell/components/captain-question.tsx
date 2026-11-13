'use client';
import { KoMic } from '@/ui/icons/ko-mic';
import { KoSend } from '@/ui/icons/ko-send';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { whatsappUrl } from '@/lib/whatsapp';
import { messages } from '../question-messages';
import { messages as captainMessages } from '../captain-messages';

export function CaptainQuestion({ contactUrl }: { contactUrl?: string | null }) {
  const v3 = captainWorkspaceEnabled();
  const MicIcon = captainWorkspaceEnabled() ? KoMic : Mic;
  const SendIcon = captainWorkspaceEnabled() ? KoSend : Send;
  const t = useT(messages);
  const captainT = useT(captainMessages);
  const [text, setText] = useState('');
  const valid = contactUrl && /^https:\/\/wa\.me\/[1-9]\d{7,14}$/.test(contactUrl);
  const phone = valid ? contactUrl.split('/').at(-1) : undefined;
  const questionUrl = phone ? whatsappUrl({ phone, text: text.trim() }) : null;
  const control = v3 ? 'flex size-[52px] shrink-0 items-center justify-center rounded-full bg-surface-raised' : 'flex min-h-12 min-w-12 items-center justify-center rounded-control border border-line-soft';
  return <section className={v3 ? 'fixed start-4 end-4 bottom-[96px] z-40 mx-auto max-w-[480px] space-y-1' : 'glass space-y-3 rounded-card border border-line-soft p-5'}>
    {!v3 && <h2 className="text-xs text-faint">{t('ask')}</h2>}
    <div className="flex items-center gap-2">
      <input value={text} maxLength={1000} onChange={event => setText(event.target.value)} placeholder={v3 ? captainT('placeholder') : t('placeholder')}
        aria-label={v3 ? captainT('placeholder') : t('ask')} className={v3 ? 'min-h-[52px] min-w-0 flex-1 rounded-full border border-line-soft bg-surface px-4 text-sm' : 'glass min-h-12 min-w-0 flex-1 rounded-control border border-line-soft px-3 text-sm'} />
      {questionUrl && text.trim() && <a href={questionUrl} target="_blank" rel="noopener noreferrer" aria-label={t('send')}
        className={control}><SendIcon aria-hidden className="size-5" /></a>}
      {valid ? <a href={contactUrl} target="_blank" rel="noopener noreferrer" aria-label={t('voice')}
        className={control}><MicIcon aria-hidden className="size-5" /></a> :
        <button type="button" disabled aria-label={t('voice')} className={`${control} text-faint`}><MicIcon aria-hidden className="size-5" /></button>}
    </div>
    <p className={v3 && valid ? 'sr-only' : 'text-xs text-faint'}>{t(valid ? 'whatsappHint' : 'noContact')}</p>
  </section>;
}
