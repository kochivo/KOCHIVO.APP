'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { KoAvatar } from '@/ui/ko-avatar';
import { useInView } from '@/lib/use-in-view';

export function KoTyping() {
  const t = useT(messages);
  const motionRef = useInView<HTMLDivElement>();
  return <div ref={motionRef} role="status" aria-label={t('chatWorking')} className="flex items-center gap-inline self-start">
    <KoAvatar expression="thinking" className="size-6" />
    <span aria-hidden className="glass flex gap-inline rounded-2xl px-page-x py-stack">
      {[0, 1, 2].map(dot => <span key={dot} style={{ animationDelay: `${dot * 140}ms` }}
        className="size-1.5 rounded-full bg-muted animate-[ko-typing_900ms_ease-in-out_infinite] motion-reduce:animate-none" />)}
    </span>
  </div>;
}
