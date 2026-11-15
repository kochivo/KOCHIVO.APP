'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import type { ReactNode } from 'react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  const t = useT(messages);
  return <section aria-label={t('phone')} className="glass-strong mx-auto flex h-[700px] max-h-[85dvh] w-full max-w-[390px] flex-col overflow-hidden rounded-[3rem] border border-line p-stack">
    {children}
  </section>;
}
