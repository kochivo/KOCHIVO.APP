import { KoAvatar } from '@/ui/ko-avatar';
import type { ReactNode } from 'react';

export function KoMessage({ speaker, text, children, sheet = false }: { speaker: 'ko' | 'user'; text: string; children?: ReactNode; sheet?: boolean }) {
  const bubble = <p dir="auto" className={`whitespace-pre-wrap break-words rounded-2xl px-stack py-inline leading-6 ${sheet ? 'max-lg:text-base max-lg:leading-7' : ''} ${speaker === 'ko' ? 'glass' : 'bg-surface-raised'}`}>{text}</p>;
  return <div className={`flex max-w-[90%] items-start gap-inline animate-[ko-rise_160ms_ease-out_both] motion-reduce:animate-none ${speaker === 'ko' ? 'self-start' : 'self-end'}`}>
    {speaker === 'ko' && <KoAvatar expression="welcome" className="size-6" />}
    {children ? <div className="min-w-0 space-y-inline">{bubble}{children}</div> : bubble}
  </div>;
}
