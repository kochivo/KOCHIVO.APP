'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { TextField } from '@/ui/text-field';
import { quickReplies } from '../merge';
import type { InboxItem } from '../types';

export function ReplyBox({ item, onSend }: { item: InboxItem; onSend: (reply: string) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [reply, setReply] = useState(item.reply ?? '');
  return <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSend(reply); }}>
    <div className="flex flex-wrap gap-2">{quickReplies(item.kind, locale).map((text) =>
      <button type="button" key={text} className="glass min-h-12 rounded-full px-4 text-sm" onClick={() => setReply(text)}>{text}</button>)}</div>
    <TextField label={t('reply')} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} hint={t('replyHint')} />
    <button type="submit" className="min-h-12 w-full rounded-control bg-lime px-6 font-bold text-on-lime">{t('send')}</button>
  </form>;
}
