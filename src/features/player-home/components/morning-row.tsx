'use client';
import type { ReactNode } from 'react';
import { Activity, ChevronLeft } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../v6-messages';

export function MorningRow({ children }: { children: ReactNode }) {
  const t = useT(messages);
  return <details className="glass rounded-card border border-line-soft">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-3 text-sm">
      <Activity aria-hidden className="size-5 text-lime" /><span className="flex-1">{t('morning')}</span>
      <ChevronLeft aria-hidden className="size-4 text-faint ltr:rotate-180" />
    </summary>
    <div className="space-y-3 px-4 pb-4">{children}</div>
  </details>;
}
