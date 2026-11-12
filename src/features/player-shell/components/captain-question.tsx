'use client';
import { useState } from 'react';
import { Mic, Send } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { whatsappUrl } from '@/lib/whatsapp';
import { messages } from '../question-messages';

export function CaptainQuestion({ contactUrl }: { contactUrl?: string | null }) {
  const t = useT(messages);
  const [text, setText] = useState('');
  const valid = contactUrl && /^https:\/\/wa\.me\/[1-9]\d{7,14}$/.test(contactUrl);
  const phone = valid ? contactUrl.split('/').at(-1) : undefined;
  const questionUrl = phone ? whatsappUrl({ phone, text: text.trim() }) : null;
  return <section className="glass space-y-3 rounded-card border border-line-soft p-5">
    <h2 className="text-xs text-faint">{t('ask')}</h2>
    <div className="flex items-center gap-2">
      <input value={text} maxLength={1000} onChange={event => setText(event.target.value)} placeholder={t('placeholder')}
        aria-label={t('ask')} className="glass min-h-12 min-w-0 flex-1 rounded-control border border-line-soft px-3 text-sm" />
      {questionUrl && text.trim() && <a href={questionUrl} target="_blank" rel="noopener noreferrer" aria-label={t('send')}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-control border border-line-soft"><Send aria-hidden className="size-5" /></a>}
      {valid ? <a href={contactUrl} target="_blank" rel="noopener noreferrer" aria-label={t('voice')}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-control border border-line-soft"><Mic aria-hidden className="size-5" /></a> :
        <button type="button" disabled aria-label={t('voice')} className="flex min-h-12 min-w-12 items-center justify-center rounded-control border border-line-soft text-faint"><Mic aria-hidden className="size-5" /></button>}
    </div>
    <p className="text-xs text-faint">{t(valid ? 'whatsappHint' : 'noContact')}</p>
  </section>;
}
