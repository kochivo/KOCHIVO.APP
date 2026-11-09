'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { KoAvatar } from './ko-avatar';

export function KoTyping() {
  const t = useT(messages);
  return <div role="status" aria-label={t('chatWorking')} className="flex items-center gap-2 self-start">
    <KoAvatar expression="thinking" className="size-6" />
    <span aria-hidden className="glass flex gap-1 rounded-2xl px-4 py-3">
      {[0, 1, 2].map(dot => <span key={dot} style={{ animationDelay: `${dot * 140}ms` }}
        className="size-1.5 rounded-full bg-muted animate-[ko-typing_900ms_ease-in-out_infinite] motion-reduce:animate-none" />)}
    </span>
  </div>;
}
