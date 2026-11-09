'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { TextField } from '@/ui/text-field';
import { quickReplies } from '../merge';
import type { InboxItem } from '../types';

export function ReplyBox({ item, onSend, onSendNext, disabled = false }: {
  item: InboxItem; onSend: (reply: string) => void; onSendNext?: (reply: string) => void; disabled?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [reply, setReply] = useState(item.reply ?? '');
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!disabled) (onSendNext ?? onSend)(reply); }}>
    <div className="flex flex-wrap gap-2">{quickReplies(item.kind, locale).map((text) =>
      <button type="button" disabled={disabled} key={text} className="glass min-h-12 rounded-full px-4 text-sm" onClick={() => setReply(text)}>{text}</button>)}</div>
    <TextField disabled={disabled} label={t('reply')} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} hint={t('replyHint')} />
    <button type="submit" disabled={disabled} className="min-h-12 w-full rounded-control bg-lime px-6 font-bold text-on-lime disabled:opacity-50">{disabled ? t('sending') : onSendNext ? t('sendNext') : t('send')}</button>
    {onSendNext && <button type="button" disabled={disabled} onClick={() => onSend(reply)} className="glass min-h-12 w-full rounded-control px-6 disabled:opacity-50">{t('send')}</button>}
  </form>;
}
